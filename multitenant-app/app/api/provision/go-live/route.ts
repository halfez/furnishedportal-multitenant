export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { withLandlordContext, resolveLandlord } from '@/lib/landlord-context'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendGoLiveEmail } from '@/lib/emails'
import { resolveSetupToken, OnboardingTokenError } from '@/lib/onboarding-token'
import { z } from 'zod'
import type { Landlord } from '@prisma/client'

function generateTempPassword(): string {
  return randomBytes(6).toString('hex') // 12-char hex — readable, not guessable
}

const Body = z.object({ token: z.string().optional() }).passthrough()

export async function POST(request: NextRequest) {
  let body: z.infer<typeof Body> = {}
  try {
    body = Body.parse(await request.json())
  } catch {
    body = {}
  }

  // Auth: session OR valid onboarding token (for initial setup before admin account exists).
  let landlord: Landlord | null = null
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    if (!body.token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try {
      const { payload } = await resolveSetupToken(body.token)
      landlord = await prisma.landlord.findUnique({ where: { id: payload.landlordId } })
    } catch (e) {
      if (e instanceof OnboardingTokenError) {
        return NextResponse.json({ error: e.message }, { status: 401 })
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else {
    landlord = await resolveLandlord()
    if (!landlord) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (session.user.landlordId !== landlord.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (session.user.role !== 'admin' && session.user.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  if (!landlord) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Idempotent: already live.
  if (landlord.status === 'live') {
    return NextResponse.json({ live: true, alreadyLive: true })
  }

  // Pre-conditions.
  const onboarding = await prisma.onboardingResponse.findUnique({
    where: { landlordId: landlord.id },
  })
  if (!onboarding?.completedAt) {
    return NextResponse.json(
      { error: 'Questionnaire not completed yet', code: 'questionnaire_incomplete' },
      { status: 422 },
    )
  }

  if (!landlord.stripeRestrictedKey) {
    return NextResponse.json(
      { error: 'Stripe account not connected yet', code: 'stripe_not_connected' },
      { status: 422 },
    )
  }

  // Create admin User if one does not exist.
  const tempPassword = generateTempPassword()
  const hashedPassword = await bcrypt.hash(tempPassword, 12)

  const _landlord = landlord
  await withLandlordContext(_landlord.id, async (db) => {
    const existing = await db.user.findFirst({
      where: { email: _landlord.ownerEmail },
    })
    if (!existing) {
      await db.user.create({
        data: {
          landlordId: _landlord.id,
          email: _landlord.ownerEmail,
          password: hashedPassword,
          firstName: _landlord.ownerFirstName,
          lastName: _landlord.ownerLastName,
          role: 'owner',
        },
      })
    }
  })

  // Landlord table has no row-level RLS so update directly.
  await prisma.landlord.update({
    where: { id: landlord.id },
    data: { status: 'live', goLiveAt: new Date() },
  })

  // Send go-live email.
  const adminUrl = `https://${landlord.subdomain}.furnishedportal.com/admin`
  await sendGoLiveEmail({
    to: landlord.ownerEmail,
    firstName: landlord.ownerFirstName,
    subdomain: landlord.subdomain,
    adminUrl,
    tempPassword,
  })

  console.log('[go-live] landlord went live', landlord.id, landlord.subdomain)

  return NextResponse.json({ live: true })
}
