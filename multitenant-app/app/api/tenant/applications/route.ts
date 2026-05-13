export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveLandlord, withLandlordContext } from '@/lib/landlord-context'

export async function GET() {
  const landlord = await resolveLandlord()
  if (!landlord) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.landlordId !== landlord.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const applications = await withLandlordContext(landlord.id, (db) =>
    db.application.findMany({
      where: { tenantId: session.user.id },
      include: { unit: true },
      orderBy: { createdAt: 'desc' },
    })
  )

  return NextResponse.json(applications)
}
