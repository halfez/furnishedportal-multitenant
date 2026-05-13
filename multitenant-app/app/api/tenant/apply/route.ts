export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveLandlord, withLandlordContext } from '@/lib/landlord-context'
import { calculateProration } from '@/lib/utils'

export async function POST(request: NextRequest) {
  const landlord = await resolveLandlord()
  if (!landlord) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.landlordId !== landlord.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'tenant') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    unitId,
    moveInDate,
    moveOutDate,
    moveInTime,
    moveOutTime,
    hasPets,
    pets,
    emergencyName,
    emergencyPhone,
    emergencyRelation,
    contactPhone,
    contactEmail,
  } = body

  if (!moveInDate || !moveOutDate || !contactPhone || !contactEmail || !emergencyName || !emergencyPhone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const application = await withLandlordContext(landlord.id, async (db) => {
    let monthlyRent = 0
    if (unitId) {
      const unit = await db.unit.findFirst({ where: { id: unitId } })
      monthlyRent = unit?.monthlyRent ?? 0
    }

    const proratedFirst = calculateProration(moveInDate, monthlyRent, true)
    const proratedLast = calculateProration(moveOutDate, monthlyRent, false)
    const totalDueOnMoveIn = proratedFirst

    return db.application.create({
      data: {
        landlordId: landlord.id,
        tenantId: session.user.id,
        unitId: unitId ?? null,
        moveInDate: new Date(moveInDate),
        moveOutDate: new Date(moveOutDate),
        moveInTime: moveInTime ?? '12:00 PM',
        moveOutTime: moveOutTime ?? '11:59 PM',
        monthlyRent,
        hasPets: hasPets ?? false,
        pets: pets ?? null,
        emergencyName,
        emergencyPhone,
        emergencyRelation: emergencyRelation ?? null,
        contactPhone,
        contactEmail,
        proratedFirst,
        proratedLast,
        totalDueOnMoveIn,
        status: 'submitted',
      },
    })
  })

  return NextResponse.json({ success: true, applicationId: application.id })
}
