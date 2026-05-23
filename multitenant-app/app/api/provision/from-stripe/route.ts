export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { withPlatformContext } from '@/lib/landlord-context'
import { slugFromEmail, reserveSubdomain, SubdomainTakenError } from '@/lib/reserved-subdomains'
import { signOnboardingToken } from '@/lib/onboarding-token'
import { sendWelcomeEmail, sendFoundingWelcomeEmail } from '@/lib/emails'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2024-06-20' })

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event: Stripe.Event
  const webhookSecret = process.env.STRIPE_FP_WEBHOOK_SECRET ?? ''
  const isLocalTest = webhookSecret === 'whsec_placeholder'

  if (isLocalTest) {
    try {
      event = JSON.parse(body) as Stripe.Event
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    console.log('[provision/from-stripe] LOCAL TEST MODE — signature check skipped')
  } else {
    try {
      event = stripe.webhooks.constructEvent(body, sig ?? '', webhookSecret)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[provision/from-stripe] signature failed:', msg)
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
    }
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session

  const email = (session.customer_details?.email ?? session.customer_email ?? '').toLowerCase().trim()
  if (!email) {
    console.error('[provision/from-stripe] no email on session', session.id)
    return NextResponse.json({ error: 'No customer email' }, { status: 422 })
  }

  const nameRaw = session.customer_details?.name ?? ''
  const nameParts = nameRaw.trim().split(/\s+/)
  const firstName = nameParts[0] ?? 'there'
  const lastName = nameParts.slice(1).join(' ')
  const stripeCustomerId = typeof session.customer === 'string' ? session.customer : null

  try {
    if (session.mode === 'setup') {
      await handleFoundingCohortSignup({ session, email, nameRaw, firstName, lastName, stripeCustomerId })
    } else if (session.mode === 'subscription') {
      await handleStandardSignup({ session, email, nameRaw, firstName, lastName, stripeCustomerId })
    } else {
      console.warn('[provision/from-stripe] unexpected session mode:', session.mode)
    }

    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[provision/from-stripe] error:', msg)
    return NextResponse.json({ error: 'Provisioning failed' }, { status: 500 })
  }
}

// ─── Founding Cohort ───────────────────────────────────────────────────────────
// Card saved via SetupIntent. No charge yet. Account provisioned in
// pending_milestone status. Billing fires when the admin clicks "Charge & Activate"
// after confirming the first tenant is fully processed.

async function handleFoundingCohortSignup({
  session,
  email,
  nameRaw,
  firstName,
  lastName,
  stripeCustomerId,
}: {
  session: Stripe.Checkout.Session
  email: string
  nameRaw: string
  firstName: string
  lastName: string
  stripeCustomerId: string | null
}) {
  const stripeSetupIntentId = typeof session.setup_intent === 'string' ? session.setup_intent : null
  const propertyCount = parseInt(session.metadata?.propertyCount ?? '0') || null

  await withPlatformContext(async (db) => {
    // Idempotency by setup intent ID
    if (stripeSetupIntentId) {
      const existing = await db.subscription.findUnique({ where: { stripeSetupIntentId } })
      if (existing) {
        console.log('[provision/from-stripe] founding already processed, skipping', stripeSetupIntentId)
        return
      }
    }

    // Idempotency by email
    const existingByEmail = await db.landlord.findUnique({ where: { ownerEmail: email } })
    if (existingByEmail) {
      console.log('[provision/from-stripe] founding landlord already exists for', email)
      return
    }

    let subdomain: string
    const candidate = slugFromEmail(email)
    try {
      subdomain = await reserveSubdomain(candidate)
    } catch (e) {
      if (e instanceof SubdomainTakenError) {
        subdomain = e.alternatives[0]
        console.warn(`[provision/from-stripe] "${candidate}" taken, using "${subdomain}"`)
      } else {
        throw e
      }
    }

    const landlord = await db.landlord.create({
      data: {
        businessName: nameRaw || email,
        brandName: subdomain,
        ownerFirstName: firstName,
        ownerLastName: lastName,
        ownerEmail: email,
        subdomain,
        status: 'onboarding',
        subscription: {
          create: {
            stripeCustomerId,
            stripeSetupIntentId,
            status: 'pending_milestone',
            isFoundingCohort: true,
            setupFeePaid: false,
            monthlyAmount: 0,
            setupAmount: 49900,
            propertyCount,
          },
        },
      },
    })

    const token = signOnboardingToken(landlord.id)
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await db.onboardingResponse.create({
      data: { landlordId: landlord.id, token, tokenExpiresAt },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL is not set')
    const onboardingUrl = `${appUrl}/onboarding/${token}`

    try {
      await sendFoundingWelcomeEmail({ to: email, firstName, onboardingUrl, subdomain, propertyCount })
    } catch (emailErr) {
      console.warn('[provision/from-stripe] founding welcome email failed (non-fatal):', emailErr)
    }

    console.log('[provision/from-stripe] founding landlord provisioned', landlord.id, subdomain)
  })
}

// ─── Standard Signup ───────────────────────────────────────────────────────────
// Full payment taken at checkout: $499 setup + first month ($49 × property count).
// Subscription is active immediately.

async function handleStandardSignup({
  session,
  email,
  nameRaw,
  firstName,
  lastName,
  stripeCustomerId,
}: {
  session: Stripe.Checkout.Session
  email: string
  nameRaw: string
  firstName: string
  lastName: string
  stripeCustomerId: string | null
}) {
  const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : null

  // Retrieve the Stripe subscription to get the property count (quantity on the subscription item).
  let propertyCount = 1
  if (stripeSubscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
        expand: ['items'],
      })
      propertyCount = sub.items.data[0]?.quantity ?? 1
    } catch (err) {
      console.warn('[provision/from-stripe] could not retrieve subscription for quantity, defaulting to 1:', err)
    }
  }

  const monthlyAmount = propertyCount * 4900 // $49 × count in cents

  await withPlatformContext(async (db) => {
    if (stripeSubscriptionId) {
      const existing = await db.subscription.findUnique({ where: { stripeSubscriptionId } })
      if (existing) {
        console.log('[provision/from-stripe] already processed, skipping', stripeSubscriptionId)
        return
      }
    }

    const existingByEmail = await db.landlord.findUnique({ where: { ownerEmail: email } })
    if (existingByEmail) {
      console.log('[provision/from-stripe] landlord already exists for', email)
      return
    }

    let subdomain: string
    const candidate = slugFromEmail(email)
    try {
      subdomain = await reserveSubdomain(candidate)
    } catch (e) {
      if (e instanceof SubdomainTakenError) {
        subdomain = e.alternatives[0]
        console.warn(`[provision/from-stripe] "${candidate}" taken, using "${subdomain}"`)
      } else {
        throw e
      }
    }

    const landlord = await db.landlord.create({
      data: {
        businessName: nameRaw || email,
        brandName: subdomain,
        ownerFirstName: firstName,
        ownerLastName: lastName,
        ownerEmail: email,
        subdomain,
        status: 'onboarding',
        subscription: {
          create: {
            stripeCustomerId,
            stripeSubscriptionId,
            status: 'active',
            isFoundingCohort: false,
            setupFeePaid: true,
            monthlyAmount,
            setupAmount: 49900,
            propertyCount,
          },
        },
      },
    })

    const token = signOnboardingToken(landlord.id)
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await db.onboardingResponse.create({
      data: { landlordId: landlord.id, token, tokenExpiresAt },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL is not set')
    const onboardingUrl = `${appUrl}/onboarding/${token}`

    try {
      await sendWelcomeEmail({ to: email, firstName, onboardingUrl, subdomain })
    } catch (emailErr) {
      console.warn('[provision/from-stripe] welcome email failed (non-fatal):', emailErr)
    }

    console.log('[provision/from-stripe] standard landlord provisioned', landlord.id, subdomain)
  })
}
