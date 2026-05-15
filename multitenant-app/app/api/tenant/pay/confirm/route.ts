export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { resolveLandlord, withLandlordContext, withPlatformContext } from '@/lib/landlord-context'
import { getLandlordStripeClient, MissingStripeKeyError } from '@/lib/stripe-tenant'

export async function GET(request: NextRequest) {
  const landlord = await resolveLandlord()
  if (!landlord) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')
  if (!sessionId) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
  }

  // Cross-tenant guard: look up the payment by session ID without a landlord scope,
  // then verify it belongs to this landlord. withPlatformContext sets the RLS GUC
  // to 'PLATFORM' so the query works both before and after RLS is deployed.
  const payment = await withPlatformContext((db) =>
    db.payment.findFirst({ where: { stripeSessionId: sessionId } })
  )

  if (!payment || payment.landlordId !== landlord.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Idempotent: already confirmed
  if (payment.status === 'PAID') {
    return NextResponse.json({
      status: payment.status,
      amount: payment.amount,
      type: payment.type,
      paidAt: payment.paidAt,
    })
  }

  let stripe
  try {
    stripe = await getLandlordStripeClient(landlord.id)
  } catch (e) {
    if (e instanceof MissingStripeKeyError) {
      return NextResponse.json(
        { error: 'This landlord has not finished payment setup' },
        { status: 503 }
      )
    }
    throw e
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId)

  let updated = payment
  if (session.payment_status === 'paid') {
    updated = await withLandlordContext(landlord.id, (db) =>
      db.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          stripePaymentIntentId:
            typeof session.payment_intent === 'string' ? session.payment_intent : null,
        },
      })
    )
  } else if (
    session.payment_status === 'unpaid' &&
    session.expires_at !== null &&
    session.expires_at * 1000 < Date.now()
  ) {
    updated = await withLandlordContext(landlord.id, (db) =>
      db.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      })
    )
  }

  return NextResponse.json({
    status: updated.status,
    amount: updated.amount,
    type: updated.type,
    paidAt: updated.paidAt,
  })
}
