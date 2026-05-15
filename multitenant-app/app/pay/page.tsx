export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { resolveLandlord } from '@/lib/landlord-context'
import PaymentForm from './PaymentForm'

export default async function PayPage() {
  const landlord = await resolveLandlord()

  if (!landlord) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-fp-bg">
        <div className="text-center max-w-lg px-6">
          <h1 className="text-3xl font-bold text-fp-text mb-3">FurnishedPortal</h1>
          <p className="text-fp-text-light">Tenant payment portal.</p>
        </div>
      </div>
    )
  }

  const primaryColor = landlord.primaryColor ?? '#00798c'
  const hasStripe = landlord.stripeRestrictedKey !== null

  return (
    <div className="min-h-screen bg-fp-bg">
      {/* Nav */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl" style={{ color: primaryColor }}>
            {landlord.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={landlord.logoUrl} alt={landlord.brandName} className="h-8 object-contain" />
            ) : (
              landlord.brandName
            )}
          </Link>
          <div className="flex gap-6 text-sm font-medium text-fp-text">
            <Link href="/gallery" className="hover:text-fp-teal transition-colors">Gallery</Link>
            <Link href="/faq" className="hover:text-fp-teal transition-colors">FAQ</Link>
            <Link href="/pay" className="transition-colors" style={{ color: primaryColor }}>Pay rent</Link>
            <Link href="/tenant/login" className="hover:text-fp-teal transition-colors">Tenant Login</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-lg mx-auto px-6 py-14">
        {/* Brand header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold" style={{ color: primaryColor }}>
            {landlord.brandName}
          </h1>
          <p className="text-fp-text-light mt-2 text-sm">Secure online payment</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          {hasStripe ? (
            <PaymentForm primaryColor={primaryColor} />
          ) : (
            <div className="text-center py-6">
              <p className="text-fp-text text-base mb-3">
                Online payments are not yet available for this property.
              </p>
              <p className="text-fp-text-light text-sm">
                Please contact{' '}
                {landlord.contactEmail ? (
                  <a
                    href={`mailto:${landlord.contactEmail}`}
                    className="underline hover:text-fp-teal transition-colors"
                    style={{ color: primaryColor }}
                  >
                    {landlord.contactEmail}
                  </a>
                ) : (
                  'your landlord'
                )}{' '}
                to arrange payment.
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="text-center text-xs text-fp-text-light py-8">
        Payments processed securely by Stripe. &copy; {new Date().getFullYear()}{' '}
        {landlord.brandName}.
      </footer>
    </div>
  )
}
