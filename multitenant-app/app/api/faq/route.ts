export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { resolveLandlord, withLandlordContext } from '@/lib/landlord-context'

export async function GET() {
  const landlord = await resolveLandlord()
  if (!landlord) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const categories = await withLandlordContext(landlord.id, (db) =>
    db.faqCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    })
  )

  return NextResponse.json(categories)
}
