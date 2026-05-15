export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { resolveLandlord, withLandlordContext } from '@/lib/landlord-context'
import { getLandlordStripeClient, MissingStripeKeyError } from '@/lib/stripe-tenant'

const VALID_TYPES = ['RENT', 'DEPOSIT', 'FEE'] as const
type PaymentType = typeof VALID_TYPES[number]

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export async function POST(request: NextRequest) {
  const landlord = await resolveLandlord()
  if (!landlord) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: {
    amount?: unknown
    type?: unknown
    tenantEmail?: unknown
    description?: unknown
    leaseId?: unknown
    applicationId?: unknown
    tenantId?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { amount, type, tenantEmail, description, leaseId, applicationId, tenantId } = body

  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive integer (cents)' }, { status: 400 })
  }
  if (typeof type !== 'string' || !VALID_TYPES.includes(type as PaymentType)) {
    return NextResponse.json({ error: 'type must be RENT, DEPOSIT, or FEE' }, { status: 400 })
  }
  if (typeof tenantEmail !== 'string' || !isValidEmail(tenantEmail)) {
    return NextResponse.json({ error: 'tenantEmail must be a valid email address' }, { status: 400 })
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

  const origin = request.headers.get('origin') ?? `https://${landlord.subdomain}.furnishedportal.com`

  const productName =
    typeof description === 'string' && description.trim()
      ? description.trim()
      : `${(type as string)[0]}${(type as string).slice(1).toLowerCase()} payment`

  const paymentTyped = type as PaymentType

  const metadata: Record<string, string> = {
    landlordId: landlord.id,
    type: paymentTyped,
    ...(leaseId && typeof leaseId === 'string' ? { leaseId } : {}),
    ...(applicationId && typeof applicationId === 'string' ? { applicationId } : {}),
    ...(tenantId && typeof tenantId === 'string' ? { tenantId } : {}),
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: productName },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    customer_email: tenantEmail,
    metadata,
    payment_intent_data: { metadata },
    success_url: `${origin}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pay/cancel`,
  })

  const descStr = typeof description === 'string' ? description : undefined
  const leaseIdStr = typeof leaseId === 'string' ? leaseId : undefined
  const applicationIdStr = typeof applicationId === 'string' ? applicationId : undefined
  const tenantIdStr = typeof tenantId === 'string' ? tenantId : undefined

  await withLandlordContext(landlord.id, (db) =>
    db.payment.create({
      data: {
        landlordId: landlord.id,
        tenantId: tenantIdStr ?? null,
        applicationId: applicationIdStr ?? null,
        leaseId: leaseIdStr ?? null,
        description: descStr ?? null,
        type: paymentTyped,
        amount,
        currency: 'usd',
        status: 'PENDING',
        stripeSessionId: session.id,
      },
    })
  )

  return NextResponse.json({ checkoutUrl: session.url })
}
