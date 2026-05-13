export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { resolveLandlord, withLandlordContext } from '@/lib/landlord-context'
import { getFileUrl } from '@/lib/s3'

export async function GET() {
  const landlord = await resolveLandlord()
  if (!landlord) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const images = await withLandlordContext(landlord.id, (db) =>
    db.galleryImage.findMany({ orderBy: { sortOrder: 'asc' } })
  )

  const result = await Promise.all(
    images.map(async (img) => {
      const url =
        img.publicUrl ??
        (img.cloudStoragePath ? await getFileUrl(img.cloudStoragePath, img.isPublic) : null)
      return { id: img.id, url, caption: img.caption, unitId: img.unitId }
    })
  )

  return NextResponse.json(result)
}
