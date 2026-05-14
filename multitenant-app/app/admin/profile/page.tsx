'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Profile {
  brandName: string
  primaryColor: string | null
  logoUrl: string | null
  contactEmail: string | null
  ownerEmail: string
}

export default function AdminProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [brandName, setBrandName] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#00798c')
  const [contactEmail, setContactEmail] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/tenant/login')
    if (status === 'authenticated') {
      if (session.user.role !== 'admin' && session.user.role !== 'owner') {
        router.push('/')
      } else {
        fetchProfile()
      }
    }
  }, [status, session])

  async function fetchProfile() {
    const res = await fetch('/api/admin/profile')
    if (res.ok) {
      const data: Profile = await res.json()
      setProfile(data)
      setBrandName(data.brandName)
      setPrimaryColor(data.primaryColor ?? '#00798c')
      setContactEmail(data.contactEmail ?? data.ownerEmail)
      setLogoUrl(data.logoUrl)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    const res = await fetch('/api/admin/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandName, primaryColor, contactEmail }),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setError('Failed to save. Please try again.')
    }
    setSaving(false)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    setError(null)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/admin/profile/logo', { method: 'POST', body: form })
    if (res.ok) {
      const { logoUrl: newUrl } = await res.json()
      setLogoUrl(newUrl)
    } else {
      setError('Logo upload failed.')
    }
    setUploadingLogo(false)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  if (!profile) return <div className="p-8 text-fp-text-light">Loading…</div>

  const inputCls =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fp-teal'

  return (
    <div className="min-h-screen bg-fp-bg">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-xl text-fp-teal">Profile</span>
          <a href="/admin" className="text-sm text-fp-text-light hover:text-fp-teal">
            ← Back to dashboard
          </a>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <form onSubmit={handleSave} className="space-y-6">

          {/* Logo */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-fp-text mb-4">Logo</h2>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="h-16 w-16 object-contain rounded-lg border border-gray-100" />
              ) : (
                <div className="h-16 w-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                  No logo
                </div>
              )}
              <div>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="text-sm text-fp-teal border border-fp-teal rounded-lg px-4 py-2 hover:bg-fp-teal hover:text-white transition-colors"
                >
                  {uploadingLogo ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo'}
                </button>
                <p className="text-xs text-fp-text-light mt-1">PNG or SVG recommended</p>
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-fp-text">Branding</h2>

            <div>
              <label className="block text-sm font-medium text-fp-text mb-1">Brand name</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className={inputCls}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fp-text mb-1">Primary color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-9 w-14 rounded border border-gray-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-fp-teal"
                  pattern="^#[0-9a-fA-F]{6}$"
                  placeholder="#00798c"
                />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-fp-text mb-4">Contact email</h2>
            <p className="text-sm text-fp-text-light mb-3">
              Shown to prospective tenants on your site. Defaults to your account email.
            </p>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={inputCls}
              placeholder={profile.ownerEmail}
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-fp-teal text-white py-3 rounded-lg font-semibold disabled:opacity-60"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
          </button>
        </form>
      </main>
    </div>
  )
}
