import { withPlatformContext, withLandlordContext } from '@/lib/landlord-context'
import { getLandlordStripeClient, MissingStripeKeyError } from '@/lib/stripe-tenant'
import type { PaymentStatus, PaymentType } from '@prisma/client'

export type PaymentConfirmResult = {
  status: PaymentStatus
  amount: number
  type: PaymentType
  paidAt: Date | null
}

/**
 * Verifies a Stripe Checkout session and updates the Payment row.
 * Returns null if the session doesn't belong to this landlord (cross-tenant guard).
 * Safe to call multiple times — idempotent once status reaches PAID.
 */
export async function confirmPaymentSession(
  landlord: { id: string },
  sessionId: string
): Promise<PaymentConfirmResult | null> {
  const payment = await withPlatformContext((db) =>
    db.payment.findFirst({ where: { stripeSessionId: sessionId } })
  )

  if (!payment || payment.landlordId !== landlord.id) return null

  if (payment.status === 'PAID') {
    return { status: payment.status, amount: payment.amount, type: payment.type, paidAt: payment.paidAt }
  }

  let stripe
  try {
    stripe = await getLandlordStripeClient(landlord.id)
  } catch (e) {
    if (e instanceof MissingStripeKeyError) {
      return { status: payment.status, amount: payment.amount, type: payment.type, paidAt: payment.paidAt }
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

  return {
    status: updated.status,
    amount: updated.amount,
    type: updated.type,
    paidAt: updated.paidAt,
  }
}
