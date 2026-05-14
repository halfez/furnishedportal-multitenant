'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const US_STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],
  ['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
  ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],
  ['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],
  ['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],
  ['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
  ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
  ['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],
  ['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
]

export default function AdminLeasePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [jurisdiction, setJurisdiction] = useState('TX')
  const [subJurisdiction, setSubJurisdiction] = useState('')
  const [lateFeeAmount, setLateFeeAmount] = useState('')
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState('5')
  const [petFeeAmount, setPetFeeAmount] = useState('')
  const [cleaningFeeAmount, setCleaningFeeAmount] = useState('')
  const [securityDepositMultiplier, setSecurityDepositMultiplier] = useState('1.0')
  const [customClauses, setCustomClauses] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/tenant/login')
    if (status === 'authenticated') {
      if (session.user.role !== 'admin' && session.user.role !== 'owner') {
        router.push('/')
      } else {
        fetchLease()
      }
    }
  }, [status, session])

  async function fetchLease() {
    const res = await fetch('/api/admin/lease')
    if (res.ok) {
      const data = await res.json()
      if (data) {
        setJurisdiction(data.jurisdiction ?? 'TX')
        setSubJurisdiction(data.subJurisdiction ?? '')
        setLateFeeAmount(data.lateFeeAmount != null ? String(data.lateFeeAmount) : '')
        setLateFeeGraceDays(String(data.lateFeeGraceDays ?? 5))
        setPetFeeAmount(data.petFeeAmount != null ? String(data.petFeeAmount) : '')
        setCleaningFeeAmount(data.cleaningFeeAmount != null ? String(data.cleaningFeeAmount) : '')
        setSecurityDepositMultiplier(String(data.securityDepositMultiplier ?? 1.0))
        setCustomClauses(data.customClauses ?? '')
      }
    }
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    const res = await fetch('/api/admin/lease', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jurisdiction,
        subJurisdiction: subJurisdiction || null,
        lateFeeAmount: lateFeeAmount ? Number(lateFeeAmount) : null,
        lateFeeGraceDays: Number(lateFeeGraceDays),
        petFeeAmount: petFeeAmount ? Number(petFeeAmount) : null,
        cleaningFeeAmount: cleaningFeeAmount ? Number(cleaningFeeAmount) : null,
        securityDepositMultiplier: Number(securityDepositMultiplier),
        customClauses: customClauses || null,
      }),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setError('Failed to save. Please try again.')
    }
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-fp-text-light">Loading…</div>

  const inputCls =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fp-teal'

  return (
    <div className="min-h-screen bg-fp-bg">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-xl text-fp-teal">Lease Template</span>
          <a href="/admin" className="text-sm text-fp-text-light hover:text-fp-teal">
            ← Back to dashboard
          </a>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-sm text-fp-text-light mb-6">
          These defaults are used when generating lease agreements for new tenants.
        </p>

        <form onSubmit={handleSave} className="space-y-6">

          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-fp-text">Jurisdiction</h2>
            <div>
              <label className="block text-sm font-medium text-fp-text mb-1">State</label>
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className={inputCls}
              >
                {US_STATES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-fp-text mb-1">
                City <span className="text-fp-text-light font-normal">(optional — for cities with their own rules)</span>
              </label>
              <input
                type="text"
                value={subJurisdiction}
                onChange={(e) => setSubJurisdiction(e.target.value)}
                placeholder="e.g. SEATTLE, NYC, SF"
                className={inputCls}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-fp-text">Fees</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-fp-text mb-1">Late fee ($)</label>
                <input type="number" min="0" step="0.01" value={lateFeeAmount} onChange={(e) => setLateFeeAmount(e.target.value)} placeholder="e.g. 150" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-fp-text mb-1">Grace days</label>
                <input type="number" min="0" value={lateFeeGraceDays} onChange={(e) => setLateFeeGraceDays(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-fp-text mb-1">Pet fee ($)</label>
                <input type="number" min="0" step="0.01" value={petFeeAmount} onChange={(e) => setPetFeeAmount(e.target.value)} placeholder="e.g. 250" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-fp-text mb-1">Cleaning fee ($)</label>
                <input type="number" min="0" step="0.01" value={cleaningFeeAmount} onChange={(e) => setCleaningFeeAmount(e.target.value)} placeholder="e.g. 200" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-fp-text mb-1">Security deposit (× monthly rent)</label>
              <input type="number" min="0" step="0.1" value={securityDepositMultiplier} onChange={(e) => setSecurityDepositMultiplier(e.target.value)} className={inputCls} />
              <p className="text-xs text-fp-text-light mt-1">e.g. 1.0 = one month&apos;s rent, 2.0 = two months</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-fp-text mb-2">Custom clauses</h2>
            <p className="text-sm text-fp-text-light mb-3">
              Any additional terms appended to the standard lease. Plain text.
            </p>
            <textarea
              value={customClauses}
              onChange={(e) => setCustomClauses(e.target.value)}
              rows={6}
              placeholder="e.g. No smoking on the premises. Tenant is responsible for lawn care..."
              className={`${inputCls} resize-y`}
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
