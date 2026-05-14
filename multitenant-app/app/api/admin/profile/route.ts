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

  const { brandName, primaryColor, logoUrl, contactEmail, ownerEmail } = ctx.landlord
  return NextResponse.json({ brandName, primaryColor, logoUrl, contactEmail, ownerEmail })
}

export async function PATCH(request: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const allowed = ['brandName', 'primaryColor', 'contactEmail'] as const
  const data: Record<string, string> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key]
  }

  const updated = await prisma.landlord.update({
    where: { id: ctx.landlord.id },
    data,
    select: { brandName: true, primaryColor: true, logoUrl: true, contactEmail: true, ownerEmail: true },
  })
  return NextResponse.json(updated)
}
