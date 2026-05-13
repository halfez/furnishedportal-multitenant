'use client'

import { useState } from 'react'

interface Props {
  setupToken: string | null
  alreadyConnected: boolean
  connectedAt: string | null
  maskedPublishableKey: string | null
}

export function StripeConnectClient({ setupToken, alreadyConnected, connectedAt, maskedPublishableKey }: Props) {
  const [restrictedKey, setRestrictedKey] = useState('')
  const [publishableKey, setPublishableKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(alreadyConnected)
  const [connectedAtState, setConnectedAtState] = useState(connectedAt)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!restrictedKey.trim() || !publishableKey.trim()) {
      setError('Both keys are required.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/provision/stripe-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restrictedKey: restrictedKey.trim(),
          publishableKey: publishableKey.trim(),
          ...(setupToken ? { token: setupToken } : {}),
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to connect Stripe')
      }
      setConnected(true)
      setConnectedAtState(new Date().toISOString())
      setRestrictedKey('')
      setPublishableKey('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setSaving(false)
    }
  }

  if (connected) {
    return (
      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-600 text-lg">✓</span>
            <span className="font-semibold text-green-800">Stripe connected</span>
          </div>
          {connectedAtState && (
            <p className="text-sm text-green-700">
              Connected on {new Date(connectedAtState).toLocaleDateString()}
            </p>
          )}
          {maskedPublishableKey && (
            <p className="text-sm text-green-700 mt-1">Publishable key: {maskedPublishableKey}</p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-medium text-gray-900 mb-2">Update your keys</h3>
          <p className="text-sm text-gray-600 mb-4">Paste new keys below to replace the current ones.</p>
          <KeyForm
            restrictedKey={restrictedKey}
            publishableKey={publishableKey}
            onChangeRestricted={setRestrictedKey}
            onChangePublishable={setPublishableKey}
            onSubmit={handleSubmit}
            saving={saving}
            error={error}
            submitLabel="Update keys"
          />
        </div>

        <GoLiveSection setupToken={setupToken} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-900 mb-1">How it works</h2>
        <p className="text-sm text-gray-600 mb-4">
          Tenant rent payments go directly to your Stripe account. FurnishedPortal never touches your
          rent money. You need a Stripe account (free to create at stripe.com) with a restricted API key.
        </p>
        <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside mb-4">
          <li>Log in to <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener" className="text-fp-primary underline">dashboard.stripe.com/apikeys</a></li>
          <li>Click <strong>Create restricted key</strong></li>
          <li>Name it "FurnishedPortal" and give it read/write access to Customers, PaymentIntents, Subscriptions, and Prices</li>
          <li>Copy the key (starts with <code>rk_live_</code>) and paste it below</li>
          <li>Copy your publishable key (starts with <code>pk_live_</code>) from the same page</li>
        </ol>

        <KeyForm
          restrictedKey={restrictedKey}
          publishableKey={publishableKey}
          onChangeRestricted={setRestrictedKey}
          onChangePublishable={setPublishableKey}
          onSubmit={handleSubmit}
          saving={saving}
          error={error}
          submitLabel="Connect Stripe"
        />
      </div>
    </div>
  )
}

function KeyForm({
  restrictedKey, publishableKey, onChangeRestricted, onChangePublishable,
  onSubmit, saving, error, submitLabel,
}: {
  restrictedKey: string
  publishableKey: string
  onChangeRestricted: (v: string) => void
  onChangePublishable: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  saving: boolean
  error: string | null
  submitLabel: string
}) {
  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-fp-primary focus:border-transparent outline-none'
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Restricted key <span className="text-gray-400 font-normal">(rk_live_… or rk_test_…)</span>
        </label>
        <input
          type="password"
          value={restrictedKey}
          onChange={(e) => onChangeRestricted(e.target.value)}
          className={inputCls}
          placeholder="rk_live_..."
          autoComplete="off"
          spellCheck={false}
        />
        <p className="mt-1 text-xs text-gray-500">This is stored encrypted and never displayed again.</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Publishable key <span className="text-gray-400 font-normal">(pk_live_… or pk_test_…)</span>
        </label>
        <input
          type="text"
          value={publishableKey}
          onChange={(e) => onChangePublishable(e.target.value)}
          className={inputCls}
          placeholder="pk_live_..."
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="w-full bg-fp-primary text-white py-2.5 rounded-lg font-semibold text-sm disabled:opacity-60"
      >
        {saving ? 'Validating…' : submitLabel}
      </button>
    </form>
  )
}

function GoLiveSection({ setupToken }: { setupToken: string | null }) {
  const [going, setGoing] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [live, setLive] = useState(false)

  async function handleGoLive() {
    setGoing(true)
    setErr(null)
    try {
      const res = await fetch('/api/provision/go-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setupToken ? { token: setupToken } : {}),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed')
      }
      setLive(true)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to go live')
    } finally {
      setGoing(false)
    }
  }

  if (live) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
        <div className="text-3xl mb-2">🎉</div>
        <p className="font-semibold text-green-800">Your site is live!</p>
        <p className="text-sm text-green-700 mt-1">Check your email for admin login details.</p>
        <a href="/admin" className="mt-3 inline-block text-sm text-fp-primary underline">Go to admin dashboard</a>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="font-medium text-gray-900 mb-1">Ready to go live?</h3>
      <p className="text-sm text-gray-600 mb-4">
        Once you click below, your site goes live and you will receive an admin login email.
      </p>
      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
      <button
        type="button"
        onClick={handleGoLive}
        disabled={going}
        className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold text-sm disabled:opacity-60 hover:bg-green-700"
      >
        {going ? 'Going live…' : 'Go live'}
      </button>
    </div>
  )
}
