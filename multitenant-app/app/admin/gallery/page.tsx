'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface GalleryImage {
  id: string
  publicUrl: string
  caption: string | null
  sortOrder: number
}

export default function AdminGalleryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/tenant/login')
    if (status === 'authenticated') {
      if (session.user.role !== 'admin' && session.user.role !== 'owner') {
        router.push('/')
      } else {
        fetchImages()
      }
    }
  }, [status, session])

  async function fetchImages() {
    setLoading(true)
    const res = await fetch('/api/admin/gallery')
    if (res.ok) setImages(await res.json())
    setLoading(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    setError(null)
    for (const file of files) {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/gallery', { method: 'POST', body: form })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Upload failed')
      }
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    fetchImages()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this photo?')) return
    await fetch(`/api/admin/gallery/${id}`, { method: 'DELETE' })
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  async function handleCaptionBlur(id: string, caption: string) {
    await fetch(`/api/admin/gallery/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption }),
    })
  }

  if (loading) return <div className="p-8 text-fp-text-light">Loading…</div>

  return (
    <div className="min-h-screen bg-fp-bg">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-xl text-fp-teal">Gallery</span>
          <a href="/admin" className="text-sm text-fp-text-light hover:text-fp-teal">
            ← Back to dashboard
          </a>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Upload zone */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center mb-8 hover:border-fp-teal transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          {uploading ? (
            <p className="text-fp-text-light">Uploading…</p>
          ) : (
            <>
              <p className="text-fp-text font-medium">Click to upload photos</p>
              <p className="text-sm text-fp-text-light mt-1">
                JPEG, PNG, WebP — multiple files supported
              </p>
            </>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg mb-6">{error}</p>
        )}

        {images.length === 0 ? (
          <p className="text-fp-text-light text-sm">No photos yet. Upload some above.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((img) => (
              <div key={img.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="relative aspect-video bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.publicUrl}
                    alt={img.caption ?? ''}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleDelete(img.id)}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-3">
                  <input
                    type="text"
                    defaultValue={img.caption ?? ''}
                    placeholder="Add a caption…"
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-fp-teal"
                    onBlur={(e) => handleCaptionBlur(img.id, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
