export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { resolveLandlord } from '@/lib/landlord-context'
import { confirmPaymentSession } from '@/lib/tenant-payment'

type Props = {
  searchParams: { session_id?: string }
}

function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2)
}

function formatType(type: string): string {
  return type[0] + type.slice(1).toLowerCase()
}

export default async function PaySuccessPage({ searchParams }: Props) {
  const sessionId = searchParams.session_id

  const landlord = await resolveLandlord()
  const primaryColor = landlord?.primaryColor ?? '#00798c'
  const brandName = landlord?.brandName ?? 'FurnishedPortal'

  const navHeader = (
    <nav className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl" style={{ color: primaryColor }}>
          {brandName}
        </Link>
        <Link href="/pay" className="text-sm text-fp-text-light hover:text-fp-teal transition-colors">
          Make a payment
        </Link>
      </div>
    </nav>
  )

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-fp-bg">
        {navHeader}
        <main className="max-w-lg mx-auto px-6 py-14 text-center">
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <p className="text-fp-text mb-4">Invalid confirmation link.</p>
            <Link href="/pay" className="text-sm underline hover:opacity-80" style={{ color: primaryColor }}>
              Return to payment page
            </Link>
          </div>
        </main>
      </div>
    )
  }

  if (!landlord) {
    return (
      <div className="min-h-screen bg-fp-bg">
        {navHeader}
        <main className="max-w-lg mx-auto px-6 py-14 text-center">
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <p className="text-fp-text">Unable to confirm payment. Please contact support.</p>
          </div>
        </main>
      </div>
    )
  }

  const result = await confirmPaymentSession(landlord, sessionId)

  const reference = sessionId.slice(-8).toUpperCase()

  return (
    <div className="min-h-screen bg-fp-bg">
      {navHeader}

      <main className="max-w-lg mx-auto px-6 py-14">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold" style={{ color: primaryColor }}>
            {brandName}
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          {!result ? (
            <>
              <p className="text-fp-text mb-4">Payment not found.</p>
              <Link href="/pay" className="text-sm underline hover:opacity-80" style={{ color: primaryColor }}>
                Return to payment page
              </Link>
            </>
          ) : result.status === 'PAID' ? (
            <>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 text-white text-2xl"
                style={{ backgroundColor: primaryColor }}
              >
                &#10003;
              </div>
              <h2 className="text-2xl font-bold text-fp-text mb-2">Payment received!</h2>
              <p className="text-fp-text-light text-sm mb-6">
                A Stripe receipt has been emailed to you.
              </p>
              <dl className="text-left space-y-3 border-t border-gray-100 pt-5">
                <div className="flex justify-between text-sm">
                  <dt className="text-fp-text-light">Amount</dt>
                  <dd className="font-semibold text-fp-text">${formatAmount(result.amount)}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-fp-text-light">Type</dt>
                  <dd className="font-semibold text-fp-text">{formatType(result.type)}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-fp-text-light">Reference</dt>
                  <dd className="font-mono font-semibold text-fp-text">{reference}</dd>
                </div>
              </dl>
            </>
          ) : result.status === 'FAILED' ? (
            <>
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5 text-red-500 text-2xl">
                &#10007;
              </div>
              <h2 className="text-xl font-bold text-fp-text mb-2">Payment did not complete</h2>
              <p className="text-fp-text-light text-sm mb-6">
                No charge was made to your card.
              </p>
              <Link
                href="/pay"
                className="inline-block px-6 py-2.5 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: primaryColor }}
              >
                Try again
              </Link>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-5 text-yellow-600 text-2xl">
                &#8987;
              </div>
              <h2 className="text-xl font-bold text-fp-text mb-2">Confirming your payment</h2>
              <p className="text-fp-text-light text-sm">
                We&apos;re still confirming your payment. Refresh this page in a moment, or check
                the receipt Stripe sent to your email.
              </p>
            </>
          )}
        </div>
      </main>

      <footer className="text-center text-xs text-fp-text-light py-8">
        &copy; {new Date().getFullYear()} {brandName}. Powered by FurnishedPortal.
      </footer>
    </div>
  )
}
