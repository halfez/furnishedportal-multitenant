export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveLandlord, withLandlordContext } from '@/lib/landlord-context'
import { getLandlordStripeClient, MissingStripeKeyError } from '@/lib/stripe-tenant'
import Stripe from 'stripe'

async function requireAdmin() {
  const landlord = await resolveLandlord()
  if (!landlord) return null
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  if (session.user.landlordId !== landlord.id) return null
  if (session.user.role !== 'admin' && session.user.role !== 'owner') return null
  return { landlord, session }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Explicit landlordId guard — safe even if Prisma extension isn't active
  const payment = await withLandlordContext(ctx.landlord.id, (db) =>
    db.payment.findFirst({ where: { id: params.id, landlordId: ctx.landlord.id } })
  )

  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (payment.status === 'REFUNDED') {
    return NextResponse.json({ status: 'REFUNDED', alreadyRefunded: true })
  }

  if (payment.status !== 'PAID') {
    return NextResponse.json(
      { error: 'Only PAID payments can be refunded', status: payment.status },
      { status: 400 }
    )
  }

  if (!payment.stripePaymentIntentId) {
    return NextResponse.json(
      { error: 'No payment_intent on record — cannot refund' },
      { status: 400 }
    )
  }

  let stripe
  try {
    stripe = await getLandlordStripeClient(ctx.landlord.id)
  } catch (e) {
    if (e instanceof MissingStripeKeyError) {
      return NextResponse.json({ error: 'Stripe not configured for this landlord' }, { status: 503 })
    }
    throw e
  }

  let refund: Stripe.Refund
  try {
    refund = await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId })
  } catch (e) {
    const message = e instanceof Stripe.errors.StripeError ? e.message : 'Stripe error occurred'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  await withLandlordContext(ctx.landlord.id, (db) =>
    db.payment.update({
      where: { id: payment.id },
      data: { status: 'REFUNDED', refundedAt: new Date() },
    })
  )

  return NextResponse.json({ status: 'REFUNDED', refundId: refund.id, amount: refund.amount })
}
