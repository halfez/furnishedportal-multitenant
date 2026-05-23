'use client'

import { useState } from 'react'

// ─── Create Founding Checkout Link ────────────────────────────────────────────

export function CreateCheckoutForm({ adminKey }: { adminKey: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [count, setCount] = useState(2)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setUrl(null)
    setError(null)
    try {
      const res = await fetch('/api/platform/founding-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-platform-key': adminKey },
        body: JSON.stringify({ name, email, propertyCount: count }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Unknown error')
      } else {
        setUrl(data.url)
      }
    } catch {
      setError('Network error — try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="font-semibold text-gray-800 mb-4">Create Founding Checkout Link</h2>
      <p className="text-sm text-gray-500 mb-4">
        Generates a private Stripe link that collects the host&apos;s card ($0 charged). Send it to the accepted applicant.
        Link expires in 24 hours.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-3">
          <input
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            placeholder="Full name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <input
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            value={count}
            onChange={e => setCount(Number(e.target.value))}
          >
            {[2, 3, 4, 5].map(n => (
              <option key={n} value={n}>{n} properties</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading}
            className="bg-teal-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create Link'}
          </button>
        </div>
      </form>

      {url && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs text-green-700 font-medium mb-1">Send this link to {name}:</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-800 font-mono break-all flex-1">{url}</span>
            <button
              onClick={() => navigator.clipboard.writeText(url)}
              className="text-xs bg-green-600 text-white px-2 py-1 rounded"
            >
              Copy
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

// ─── Charge & Activate Button ─────────────────────────────────────────────────

export function ChargeButton({
  landlordId,
  name,
  propertyCount,
  adminKey,
}: {
  landlordId: string
  name: string
  propertyCount: number
  adminKey: string
}) {
  const [state, setState] = useState<'idle' | 'confirm' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<string | null>(null)

  const totalDollars = (499 + propertyCount * 49).toFixed(2)

  async function handleCharge() {
    setState('loading')
    setResult(null)
    try {
      const res = await fetch(`/api/platform/founders/${landlordId}/charge`, {
        method: 'POST',
        headers: { 'x-platform-key': adminKey },
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'authentication_required') {
          setResult(`3DS required — ${data.hint}`)
        } else {
          setResult(data.error ?? 'Charge failed')
        }
        setState('error')
      } else {
        setResult(`Charged $${totalDollars}. Subscription: ${data.subscription}`)
        setState('done')
      }
    } catch {
      setResult('Network error — try again')
      setState('error')
    }
  }

  if (state === 'done') {
    return <span className="text-xs text-green-700 font-medium">{result}</span>
  }

  if (state === 'error') {
    return (
      <div>
        <p className="text-xs text-red-600 mb-1">{result}</p>
        <button onClick={() => setState('idle')} className="text-xs text-gray-500 underline">Reset</button>
      </div>
    )
  }

  if (state === 'confirm') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600">
          Charge <strong>{name}</strong> ${totalDollars}?
        </span>
        <button
          onClick={handleCharge}
          className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
        >
          Confirm
        </button>
        <button onClick={() => setState('idle')} className="text-xs text-gray-500 underline">
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setState('confirm')}
      disabled={state === 'loading'}
      className="text-xs bg-teal-600 text-white px-3 py-1 rounded hover:bg-teal-700 disabled:opacity-50"
    >
      {state === 'loading' ? 'Charging…' : 'Charge & Activate'}
    </button>
  )
}
