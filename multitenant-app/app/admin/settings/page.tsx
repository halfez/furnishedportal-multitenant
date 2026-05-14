'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function AdminSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [currentSubdomain, setCurrentSubdomain] = useState('')
  const [newSubdomain, setNewSubdomain] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/tenant/login')
    if (status === 'authenticated') {
      if (session.user.role !== 'owner') {
        router.push('/admin')
      } else {
        fetchSubdomain()
      }
    }
  }, [status, session])

  async function fetchSubdomain() {
    const res = await fetch('/api/admin/profile')
    if (res.ok) {
      const data = await res.json()
      setCurrentSubdomain(data.subdomain ?? '')
    }
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    if (!confirm(
      `Change your URL from ${currentSubdomain}.furnishedportal.com to ${newSubdomain}.furnishedportal.com?\n\nYour old URL will stop working immediately.`
    )) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    const res = await fetch('/api/admin/settings/subdomain', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subdomain: newSubdomain }),
    })

    if (res.ok) {
      const { subdomain } = await res.json()
      setCurrentSubdomain(subdomain)
      setNewSubdomain('')
      setSuccess(`Done! Your site is now at ${subdomain}.furnishedportal.com`)
    } else {
      const body = await res.json()
      setError(body.error ?? 'Rename failed')
    }
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-fp-bg">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-xl text-fp-teal">Settings</span>
          <a href="/admin" className="text-sm text-fp-text-light hover:text-fp-teal">
            ← Back to dashboard
          </a>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-fp-text mb-1">Change subdomain</h2>
          <p className="text-sm text-fp-text-light mb-4">
            Current URL:{' '}
            <span className="font-mono text-fp-text">
              {currentSubdomain}.furnishedportal.com
            </span>
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-5 text-sm text-yellow-800">
            ⚠️ Your old URL will stop working immediately after renaming. Update any links you've shared with tenants.
          </div>

          <form onSubmit={handleRename} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-fp-text mb-1">New subdomain</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSubdomain}
                  onChange={(e) => setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="e.g. acmerentals"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-fp-teal"
                  minLength={3}
                  required
                />
                <span className="text-sm text-fp-text-light whitespace-nowrap">.furnishedportal.com</span>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            {success && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{success}</p>}

            <button
              type="submit"
              disabled={saving || !newSubdomain}
              className="w-full bg-fp-teal text-white py-2.5 rounded-lg font-semibold text-sm disabled:opacity-60"
            >
              {saving ? 'Renaming…' : 'Rename subdomain'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
