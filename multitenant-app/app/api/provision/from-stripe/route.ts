export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { withPlatformContext } from '@/lib/landlord-context'
import { slugFromEmail, reserveSubdomain, SubdomainTakenError } from '@/lib/reserved-subdomains'
import { signOnboardingToken } from '@/lib/onboarding-token'
import { sendWelcomeEmail } from '@/lib/emails'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2024-06-20' })

function getWebhookSecret(): string {
  const s = process.env.STRIPE_FP_WEBHOOK_SECRET
  if (!s) throw new Error('STRIPE_FP_WEBHOOK_SECRET is not set')
  return s
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? '', getWebhookSecret())
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[provision/from-stripe] signature failed:', msg)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
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
  const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : null
  const isFoundingCohort = !!(session.total_details?.amount_discount && session.total_details.amount_discount > 0)
  const monthlyAmount = isFoundingCohort ? 2450 : 4900
  const setupAmount = isFoundingCohort ? 24950 : 49900

  try {
    await withPlatformContext(async (db) => {
      // Idempotency: if this subscription already has a Landlord, skip.
      if (stripeSubscriptionId) {
        const existing = await db.subscription.findUnique({
          where: { stripeSubscriptionId },
        })
        if (existing) {
          console.log('[provision/from-stripe] already processed, skipping', stripeSubscriptionId)
          return
        }
      }

      // Also guard by email to handle sessions without a subscription ID.
      const existingByEmail = await db.landlord.findUnique({ where: { ownerEmail: email } })
      if (existingByEmail) {
        console.log('[provision/from-stripe] landlord already exists for', email)
        return
      }

      // Pick subdomain — fall back to alternatives on collision.
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

      // Create Landlord + Subscription atomically.
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
              isFoundingCohort,
              setupFeePaid: true,
              monthlyAmount,
              setupAmount,
            },
          },
        },
      })

      // Create OnboardingResponse with fresh token.
      const token = signOnboardingToken(landlord.id)
      const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      await db.onboardingResponse.create({
        data: {
          landlordId: landlord.id,
          token,
          tokenExpiresAt,
        },
      })

      // Send welcome email.
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://furnishedportal.com'
      const onboardingUrl = `${appUrl}/onboarding/${token}`

      await sendWelcomeEmail({ to: email, firstName, onboardingUrl, subdomain })

      console.log('[provision/from-stripe] provisioned landlord', landlord.id, subdomain)
    })

    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[provision/from-stripe] error:', msg)
    return NextResponse.json({ error: 'Provisioning failed' }, { status: 500 })
  }
}
