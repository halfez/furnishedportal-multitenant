export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveLandlord, withLandlordContext } from '@/lib/landlord-context'
import { uploadToS3, s3KeyForLandlord } from '@/lib/s3'

async function requireAdmin() {
  const landlord = await resolveLandlord()
  if (!landlord) return null
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  if (session.user.landlordId !== landlord.id) return null
  if (session.user.role !== 'admin' && session.user.role !== 'owner') return null
  return { landlord, session }
}

export async function GET(request: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const images = await withLandlordContext(ctx.landlord.id, (db) =>
    db.galleryImage.findMany({ orderBy: { sortOrder: 'asc' } })
  )
  return NextResponse.json(images)
}

export async function POST(request: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const caption = formData.get('caption') as string | null
  const unitId = formData.get('unitId') as string | null

  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const key = s3KeyForLandlord(ctx.landlord.id, `${Date.now()}-${file.name}`)
  const publicUrl = await uploadToS3(key, buffer, file.type)

  const image = await withLandlordContext(ctx.landlord.id, async (db) => {
    const agg = await db.galleryImage.aggregate({ _max: { sortOrder: true } })
    return db.galleryImage.create({
      data: {
        landlordId: ctx.landlord.id,
        cloudStoragePath: key,
        publicUrl,
        isPublic: true,
        caption: caption ?? null,
        unitId: unitId ?? null,
        sortOrder: (agg._max.sortOrder ?? -1) + 1,
      },
    })
  })

  return NextResponse.json(image)
}
