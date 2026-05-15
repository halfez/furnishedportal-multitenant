'use client'

import { useState } from 'react'

type Props = {
  primaryColor: string
}

export default function PaymentForm({ primaryColor }: Props) {
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'RENT' | 'DEPOSIT' | 'FEE'>('RENT')
  const [email, setEmail] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const dollars = parseFloat(amount)
    if (isNaN(dollars) || dollars < 0.5) {
      setError('Amount must be at least $0.50.')
      return
    }
    const cents = Math.round(dollars * 100)

    setSubmitting(true)
    try {
      const res = await fetch('/api/tenant/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: cents,
          type,
          tenantEmail: email,
          description: description.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Payment request failed. Please try again.')
        return
      }

      window.location.href = data.checkoutUrl
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full px-4 py-2.5 border border-gray-200 rounded-lg text-fp-text bg-white focus:outline-none focus:border-transparent focus:ring-2 transition-shadow'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Amount */}
      <div>
        <label htmlFor="pay-amount" className="block text-sm font-medium text-fp-text mb-1">
          Amount (USD)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fp-text-light select-none">
            $
          </span>
          <input
            id="pay-amount"
            type="number"
            step="0.01"
            min="0.50"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={`${inputClass} pl-7`}
            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Payment Type */}
      <fieldset>
        <legend className="block text-sm font-medium text-fp-text mb-2">Payment Type</legend>
        <div className="flex gap-6">
          {(['RENT', 'DEPOSIT', 'FEE'] as const).map((t) => (
            <label key={t} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="pay-type"
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
                style={{ accentColor: primaryColor }}
              />
              <span className="text-sm text-fp-text">
                {t[0] + t.slice(1).toLowerCase()}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Email */}
      <div>
        <label htmlFor="pay-email" className="block text-sm font-medium text-fp-text mb-1">
          Your Email
        </label>
        <input
          id="pay-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={inputClass}
          style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="pay-description" className="block text-sm font-medium text-fp-text mb-1">
          Description{' '}
          <span className="text-fp-text-light font-normal">(optional)</span>
        </label>
        <input
          id="pay-description"
          type="text"
          maxLength={200}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. April rent payment"
          className={inputClass}
          style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
        />
      </div>

      {/* Error */}
      {error && (
        <p role="alert" className="text-red-600 text-sm">
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 rounded-lg text-white font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ backgroundColor: primaryColor }}
      >
        {submitting ? 'Processing…' : 'Pay now'}
      </button>
    </form>
  )
}
