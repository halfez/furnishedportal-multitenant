export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { resolveLandlord } from '@/lib/landlord-context'

export default async function PayCancelPage() {
  const landlord = await resolveLandlord()
  const primaryColor = landlord?.primaryColor ?? '#00798c'
  const brandName = landlord?.brandName ?? 'FurnishedPortal'

  return (
    <div className="min-h-screen bg-fp-bg">
      {/* Nav */}
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

      <main className="max-w-lg mx-auto px-6 py-14">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold" style={{ color: primaryColor }}>
            {brandName}
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5 text-gray-400 text-2xl">
            &#10007;
          </div>
          <h2 className="text-xl font-bold text-fp-text mb-2">Payment cancelled</h2>
          <p className="text-fp-text-light text-sm mb-8">No charge was made.</p>
          <Link
            href="/pay"
            className="inline-block px-6 py-2.5 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: primaryColor }}
          >
            Return to payment page
          </Link>
        </div>
      </main>

      <footer className="text-center text-xs text-fp-text-light py-8">
        &copy; {new Date().getFullYear()} {brandName}. Powered by FurnishedPortal.
      </footer>
    </div>
  )
}
