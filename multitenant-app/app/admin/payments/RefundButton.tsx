'use client'

import { useState } from 'react'

type Props = {
  paymentId: string
  amountDollars: string
  tenantLabel: string
}

export default function RefundButton({ paymentId, amountDollars, tenantLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpen() {
    setError(null)
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    setError(null)
  }

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/refund`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Refund failed. Please try again.')
        return
      }
      handleClose()
      window.location.reload()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-xs px-3 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors font-medium"
      >
        Refund
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="refund-dialog-title"
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 id="refund-dialog-title" className="text-base font-semibold text-fp-text mb-2">
              Refund ${amountDollars} to {tenantLabel}?
            </h3>
            <p className="text-sm text-fp-text-light mb-5">
              This will issue a full refund to the original payment method. This action cannot be
              undone.
            </p>

            {error && (
              <p role="alert" className="text-red-600 text-sm mb-4">
                {error}
              </p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-fp-text hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing…' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
