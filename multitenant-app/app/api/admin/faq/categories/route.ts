export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveLandlord, withLandlordContext } from '@/lib/landlord-context'

async function requireAdmin(request: NextRequest) {
  const landlord = await resolveLandlord()
  if (!landlord) return null

  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  if (session.user.landlordId !== landlord.id) return null
  if (session.user.role !== 'admin' && session.user.role !== 'owner') return null

  return { landlord, session }
}

export async function GET(request: NextRequest) {
  const ctx = await requireAdmin(request)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const categories = await withLandlordContext(ctx.landlord.id, (db) =>
    db.faqCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    })
  )
  return NextResponse.json(categories)
}

export async function POST(request: NextRequest) {
  const ctx = await requireAdmin(request)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const category = await withLandlordContext(ctx.landlord.id, async (db) => {
    const agg = await db.faqCategory.aggregate({ _max: { sortOrder: true } })
    return db.faqCategory.create({
      data: {
        landlordId: ctx.landlord.id,
        title: body.title,
        icon: body.icon ?? 'HelpCircle',
        sortOrder: (agg._max.sortOrder ?? -1) + 1,
      },
      include: { items: true },
    })
  })

  return NextResponse.json(category)
}
