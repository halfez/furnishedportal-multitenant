export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveLandlord, withLandlordContext } from '@/lib/landlord-context'
import { deleteFromBlob } from '@/lib/blob'

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
  const updated = await withLandlordContext(ctx.landlord.id, (db) =>
    db.galleryImage.update({
      where: { id: params.id },
      data: { caption: body.caption, sortOrder: body.sortOrder, unitId: body.unitId },
    })
  )
  return NextResponse.json(updated)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const image = await withLandlordContext(ctx.landlord.id, (db) =>
    db.galleryImage.findFirst({ where: { id: params.id } })
  )
  if (!image) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (image.publicUrl) {
    await deleteFromBlob(image.publicUrl).catch(() => null)
  }

  await withLandlordContext(ctx.landlord.id, (db) =>
    db.galleryImage.delete({ where: { id: params.id } })
  )

  return NextResponse.json({ success: true })
}
