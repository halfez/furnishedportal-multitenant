export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveLandlord, withLandlordContext } from '@/lib/landlord-context'
import { encrypt } from '@/lib/encryption'
import { z } from 'zod'

const Body = z.object({
  restrictedKey: z.string().min(1),
  publishableKey: z.string().min(1),
})

export async function POST(request: NextRequest) {
  // Auth: must be admin for this subdomain's landlord.
  const landlord = await resolveLandlord()
  if (!landlord) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.landlordId !== landlord.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (session.user.role !== 'admin' && session.user.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: z.infer<typeof Body>
  try {
    body = Body.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'restrictedKey and publishableKey are required' }, { status: 400 })
  }

  // Validate the restricted key against Stripe.
  try {
    const testStripe = new Stripe(body.restrictedKey, { apiVersion: '2024-06-20' })
    await testStripe.balance.retrieve()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    const isAuthError = msg.includes('No API key') || msg.includes('Invalid API Key') || msg.includes('authentication')
    console.error('[stripe-connect] key validation failed:', isAuthError ? 'invalid key' : msg)
    return NextResponse.json(
      { error: 'Stripe key validation failed. Please check the key and try again.' },
      { status: 422 },
    )
  }

  // Encrypt before storing — never log the plaintext key.
  const encryptedKey = encrypt(body.restrictedKey)

  await withLandlordContext(landlord.id, async (db) => {
    await db.landlord.update({
      where: { id: landlord.id },
      data: {
        stripeRestrictedKey: encryptedKey,
        stripePublishableKey: body.publishableKey,
        stripeKeysAddedAt: new Date(),
      },
    })
  })

  return NextResponse.json({ connected: true })
}

// Returns whether Stripe is connected (masked — never returns the key).
export async function GET(_request: NextRequest) {
  const landlord = await resolveLandlord()
  if (!landlord) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.landlordId !== landlord.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    connected: !!landlord.stripeRestrictedKey,
    addedAt: landlord.stripeKeysAddedAt,
    publishableKey: landlord.stripePublishableKey
      ? `${landlord.stripePublishableKey.slice(0, 8)}...`
      : null,
  })
}
