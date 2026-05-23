export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { withPlatformContext } from '@/lib/landlord-context'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2024-06-20' })

function checkPlatformKey(request: NextRequest): boolean {
  const key = process.env.PLATFORM_ADMIN_KEY
  return !!key && request.headers.get('x-platform-key') === key
}

// POST /api/platform/founders/[landlordId]/charge
//
// Milestone charge for a founding cohort host. Fires when the admin confirms
// the host's first tenant is fully processed (lease signed + first payment collected).
//
// What this does:
//   1. Charges the saved card: $499 setup + ($49 × propertyCount) first month.
//   2. Creates a Stripe subscription on the grandfathered $49/mo price (locked forever).
//   3. Sets subscription status = active in the DB.
//
// If the card requires 3DS authentication, returns a 402 with instructions.
// Afshin contacts the host manually to re-add their card via a new checkout link.

export async function POST(
  request: NextRequest,
  { params }: { params: { landlordId: string } }
) {
  if (!checkPlatformKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { landlordId } = params

  // ── Load landlord + subscription ──────────────────────────────────────────
  const record = await withPlatformContext(async (db) => {
    return db.landlord.findUnique({
      where: { id: landlordId },
      include: { subscription: true },
    })
  })

  if (!record || !record.subscription) {
    return NextResponse.json({ error: 'Landlord not found' }, { status: 404 })
  }

  const { subscription } = record

  if (!subscription.isFoundingCohort) {
    return NextResponse.json({ error: 'Not a founding cohort landlord' }, { status: 400 })
  }
  if (subscription.status !== 'pending_milestone') {
    return NextResponse.json(
      { error: `Cannot charge — subscription status is "${subscription.status}"` },
      { status: 400 }
    )
  }
  if (!subscription.stripeCustomerId) {
    return NextResponse.json({ error: 'No Stripe customer ID on record' }, { status: 400 })
  }

  const propertyCount = subscription.propertyCount
  if (!propertyCount || propertyCount < 2 || propertyCount > 5) {
    return NextResponse.json(
      { error: `Invalid property count on subscription: ${propertyCount}` },
      { status: 400 }
    )
  }

  const stripeCustomerId = subscription.stripeCustomerId

  // ── Get the customer's default payment method ──────────────────────────────
  let pmId: string | undefined
  try {
    const customer = await stripe.customers.retrieve(stripeCustomerId) as Stripe.Customer
    if (typeof customer.invoice_settings?.default_payment_method === 'string') {
      pmId = customer.invoice_settings.default_payment_method
    }
    if (!pmId) {
      const pms = await stripe.paymentMethods.list({ customer: stripeCustomerId, type: 'card' })
      pmId = pms.data[0]?.id
    }
  } catch (err) {
    console.error('[platform/charge] failed to retrieve payment method:', err)
    return NextResponse.json({ error: 'Could not retrieve payment method from Stripe' }, { status: 500 })
  }

  if (!pmId) {
    return NextResponse.json({ error: 'No card on file for this customer' }, { status: 400 })
  }

  // ── Charge: $499 setup + ($49 × propertyCount) first month ────────────────
  const setupCents = 49900
  const firstMonthCents = propertyCount * 4900
  const totalCents = setupCents + firstMonthCents

  let paymentIntentId: string
  try {
    const pi = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'usd',
      customer: stripeCustomerId,
      payment_method: pmId,
      off_session: true,
      confirm: true,
      description: `FurnishedPortal founding: setup + month 1 (${propertyCount} properties)`,
      statement_descriptor: 'FURNISHEDPORTAL',
      metadata: {
        landlordId,
        isFoundingCohort: 'true',
        propertyCount: String(propertyCount),
        type: 'founding_milestone',
      },
    })
    paymentIntentId = pi.id
  } catch (err) {
    if (err instanceof Stripe.errors.StripeCardError) {
      if (err.code === 'authentication_required') {
        return NextResponse.json({
          error: 'Card requires 3D Secure authentication',
          code: 'authentication_required',
          hint: 'Contact the host and ask them to re-add their card. Use "Create Checkout Link" to generate a new card-save link for them.',
          paymentIntentId: err.payment_intent?.id,
        }, { status: 402 })
      }
      return NextResponse.json({
        error: err.message,
        code: err.code,
      }, { status: 402 })
    }
    console.error('[platform/charge] payment intent error:', err)
    return NextResponse.json({ error: 'Charge failed unexpectedly' }, { status: 500 })
  }

  // ── Create the grandfathered subscription ─────────────────────────────────
  // Trial period = 30 days so Stripe doesn't charge again immediately.
  // First month was already collected above via PaymentIntent.
  const foundingPriceId = process.env.STRIPE_FOUNDING_PRICE_ID
  if (!foundingPriceId) {
    console.error('[platform/charge] STRIPE_FOUNDING_PRICE_ID is not set')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  let stripeSubscriptionId: string
  try {
    const trialEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
    const sub = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: foundingPriceId, quantity: propertyCount }],
      trial_end: trialEnd,
      default_payment_method: pmId,
      metadata: {
        landlordId,
        isFoundingCohort: 'true',
      },
    })
    stripeSubscriptionId = sub.id
  } catch (err) {
    console.error('[platform/charge] subscription creation failed:', err)
    // Payment already went through — log this prominently so it can be resolved manually.
    console.error(
      '[platform/charge] CRITICAL: PaymentIntent succeeded but subscription creation failed.',
      'PaymentIntentId:', paymentIntentId,
      'LandlordId:', landlordId,
    )
    return NextResponse.json({
      error: 'Payment collected but subscription creation failed — contact support immediately',
      paymentIntentId,
    }, { status: 500 })
  }

  // ── Update DB ─────────────────────────────────────────────────────────────
  await withPlatformContext(async (db) => {
    await db.subscription.update({
      where: { landlordId },
      data: {
        status: 'active',
        setupFeePaid: true,
        monthlyAmount: propertyCount * 4900,
        setupAmount: 49900,
        propertyCount,
        stripeSubscriptionId,
      },
    })
  })

  console.log('[platform/charge] founding host activated', landlordId, 'sub', stripeSubscriptionId)

  return NextResponse.json({
    success: true,
    charged: `$${(totalCents / 100).toFixed(2)}`,
    subscription: stripeSubscriptionId,
    propertyCount,
  })
}
