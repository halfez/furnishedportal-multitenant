export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2024-06-20' })

function checkPlatformKey(request: NextRequest): boolean {
  const key = process.env.PLATFORM_ADMIN_KEY
  return !!key && request.headers.get('x-platform-key') === key
}

// POST /api/platform/founding-checkout
// Creates a Stripe Checkout session in setup mode (card save, $0 charged).
// Returns the checkout URL to send to the founding host.
export async function POST(request: NextRequest) {
  if (!checkPlatformKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { email?: string; name?: string; propertyCount?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, name, propertyCount } = body

  if (!email || !name || !propertyCount) {
    return NextResponse.json({ error: 'email, name, and propertyCount are required' }, { status: 400 })
  }
  if (propertyCount < 2 || propertyCount > 5) {
    return NextResponse.json({ error: 'propertyCount must be 2–5' }, { status: 400 })
  }

  // Check the 10-founder cap
  const foundingCount = await prisma.subscription.count({ where: { isFoundingCohort: true } })
  if (foundingCount >= 10) {
    return NextResponse.json({ error: 'Founding cohort is full (10/10)' }, { status: 409 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://furnishedportal.com'

  const session = await stripe.checkout.sessions.create({
    mode: 'setup',
    currency: 'usd',
    customer_email: email,
    metadata: {
      propertyCount: String(propertyCount),
      isFoundingCohort: 'true',
      founderName: name,
    },
    success_url: `${appUrl}/founding-complete?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/founding-cancelled`,
    // Stripe checkout sessions expire after 24 hours max
  })

  return NextResponse.json({ url: session.url, expiresAt: session.expires_at })
}
