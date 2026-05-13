export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveLandlord, withLandlordContext } from '@/lib/landlord-context'

async function requireAdmin() {
  const landlord = await resolveLandlord()
  if (!landlord) return null
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  if (session.user.landlordId !== landlord.id) return null
  if (session.user.role !== 'admin' && session.user.role !== 'owner') return null
  return { landlord, session }
}

export async function POST(request: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { categoryId, question, answer } = body
  if (!categoryId || !question || !answer) {
    return NextResponse.json({ error: 'categoryId, question and answer required' }, { status: 400 })
  }

  const item = await withLandlordContext(ctx.landlord.id, async (db) => {
    // Verify category belongs to this landlord
    const cat = await db.faqCategory.findFirst({ where: { id: categoryId } })
    if (!cat) throw new Error('Category not found')

    const agg = await db.faqCategory.aggregate({ _max: { sortOrder: true } })
    return db.faqItem.create({
      data: {
        categoryId,
        question,
        answer,
        sortOrder: (agg._max.sortOrder ?? -1) + 1,
      },
    })
  })

  return NextResponse.json(item)
}
