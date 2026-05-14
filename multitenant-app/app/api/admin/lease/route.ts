export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveLandlord, withLandlordContext } from '@/lib/landlord-context'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const landlord = await resolveLandlord()
  if (!landlord) return null
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  if (session.user.landlordId !== landlord.id) return null
  if (session.user.role !== 'admin' && session.user.role !== 'owner') return null
  return { landlord, session }
}

export async function GET() {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const lease = await withLandlordContext(ctx.landlord.id, (db) =>
    db.leaseTemplate.findFirst()
  )
  return NextResponse.json(lease ?? null)
}

export async function PATCH(request: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const data = {
    jurisdiction: body.jurisdiction ?? 'TX',
    subJurisdiction: body.subJurisdiction ?? null,
    lateFeeAmount: body.lateFeeAmount != null ? Number(body.lateFeeAmount) : null,
    lateFeeGraceDays: body.lateFeeGraceDays != null ? Number(body.lateFeeGraceDays) : 5,
    petFeeAmount: body.petFeeAmount != null ? Number(body.petFeeAmount) : null,
    cleaningFeeAmount: body.cleaningFeeAmount != null ? Number(body.cleaningFeeAmount) : null,
    securityDepositMultiplier:
      body.securityDepositMultiplier != null ? Number(body.securityDepositMultiplier) : 1.0,
    customClauses: body.customClauses ?? null,
  }

  const existing = await withLandlordContext(ctx.landlord.id, (db) =>
    db.leaseTemplate.findFirst()
  )

  const lease = existing
    ? await prisma.leaseTemplate.update({ where: { id: existing.id }, data })
    : await prisma.leaseTemplate.create({
        data: { ...data, landlordId: ctx.landlord.id },
      })

  return NextResponse.json(lease)
}
