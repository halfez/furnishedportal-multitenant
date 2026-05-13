export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { requireLandlord, withLandlordContext } from '@/lib/landlord-context'
import { getFileUrl } from '@/lib/s3'

export default async function GalleryPage() {
  const landlord = await requireLandlord().catch(() => null)
  if (!landlord) notFound()

  const images = await withLandlordContext(landlord.id, (db) =>
    db.galleryImage.findMany({ orderBy: { sortOrder: 'asc' } })
  )

  const withUrls = await Promise.all(
    images.map(async (img) => {
      const url =
        img.publicUrl ??
        (img.cloudStoragePath ? await getFileUrl(img.cloudStoragePath, img.isPublic) : null)
      return { ...img, url }
    })
  )

  const primaryColor = landlord.primaryColor ?? '#00798c'

  return (
    <div className="min-h-screen bg-fp-bg">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl" style={{ color: primaryColor }}>
            {landlord.brandName}
          </Link>
          <Link href="/" className="text-sm text-fp-text-light hover:text-fp-teal">
            Back to home
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-fp-text mb-8">Gallery</h1>

        {withUrls.length === 0 ? (
          <p className="text-fp-text-light">No photos yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {withUrls.map((img) =>
              img.url ? (
                <div key={img.id} className="aspect-video relative rounded-lg overflow-hidden shadow-sm">
                  <Image
                    src={img.url}
                    alt={img.caption ?? 'Property photo'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                  {img.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs p-2">
                      {img.caption}
                    </div>
                  )}
                </div>
              ) : null
            )}
          </div>
        )}
      </main>
    </div>
  )
}
