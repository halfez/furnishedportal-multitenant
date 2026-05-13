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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Verify the item's category belongs to this landlord
  const existing = await prisma.faqItem.findUnique({
    where: { id: params.id },
    include: { category: true },
  })
  if (!existing || existing.category.landlordId !== ctx.landlord.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await prisma.faqItem.update({
    where: { id: params.id },
    data: { question: body.question, answer: body.answer, sortOrder: body.sortOrder },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.faqItem.findUnique({
    where: { id: params.id },
    include: { category: true },
  })
  if (!existing || existing.category.landlordId !== ctx.landlord.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.faqItem.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
