export const dynamic = 'force-dynamic'

import { resolveLandlord } from '@/lib/landlord-context'
import { withLandlordContext } from '@/lib/landlord-context'
import Link from 'next/link'
import MarketingPage from './marketing-page'

export default async function HomePage() {
  const landlord = await resolveLandlord()

  if (!landlord) {
    // Apex domain — show the marketing / host acquisition page
    return <MarketingPage />
  }

  const data = await withLandlordContext(landlord.id, async (db) => {
    const [units, houseRules, amenities] = await Promise.all([
      db.unit.findMany({ include: { property: true } }),
      db.houseRule.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.amenity.findMany({ orderBy: { sortOrder: 'asc' } }),
    ])
    return { units, houseRules, amenities }
  })

  const primaryColor = landlord.primaryColor ?? '#00798c'

  return (
    <div className="min-h-screen bg-fp-bg">
      {/* Nav */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-xl" style={{ color: primaryColor }}>
            {landlord.brandName}
          </span>
          <div className="flex gap-6 text-sm font-medium text-fp-text">
            <Link href="/gallery" className="hover:text-fp-teal transition-colors">Gallery</Link>
            <Link href="/faq" className="hover:text-fp-teal transition-colors">FAQ</Link>
            <Link href="/pay" className="hover:text-fp-teal transition-colors">Pay rent</Link>
            <Link href="/tenant/login" className="hover:text-fp-teal transition-colors">Tenant Login</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-white py-16 px-6 text-center">
        <h1 className="text-4xl font-bold text-fp-text mb-4">{landlord.brandName}</h1>
        <p className="text-fp-text-light text-lg max-w-xl mx-auto">
          Furnished midterm rentals — flexible stays, fully equipped.
        </p>
        <Link
          href="/tenant/login"
          className="mt-8 inline-block text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          style={{ backgroundColor: primaryColor }}
        >
          Apply Now
        </Link>
      </section>

      {/* Units */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-fp-text mb-6">Available Units</h2>
        {data.units.length === 0 ? (
          <p className="text-fp-text-light">No units listed yet.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.units.map((unit) => (
              <div key={unit.id} className="bg-white rounded-xl shadow-sm p-5">
                <div className="font-semibold text-fp-text text-lg mb-1">
                  Unit {unit.identifier}
                </div>
                {unit.property && (
                  <div className="text-fp-text-light text-sm mb-2">
                    {unit.property.city}, {unit.property.state}
                  </div>
                )}
                <div className="text-fp-teal font-bold text-xl">
                  ${unit.monthlyRent.toLocaleString()}/mo
                </div>
                {unit.bedrooms && (
                  <div className="text-sm text-fp-text-light mt-1">
                    {unit.bedrooms} bed{unit.bedrooms !== 1 ? 's' : ''}
                    {unit.bathrooms ? ` · ${unit.bathrooms} bath` : ''}
                    {unit.sqft ? ` · ${unit.sqft} sqft` : ''}
                  </div>
                )}
                {unit.description && (
                  <p className="text-sm text-fp-text mt-2 line-clamp-2">
                    {unit.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Amenities */}
      {data.amenities.length > 0 && (
        <section className="bg-white py-10 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-fp-text mb-4">Amenities</h2>
            <ul className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {data.amenities.map((a) => (
                <li key={a.id} className="text-fp-text text-sm flex items-center gap-2">
                  <span className="text-fp-teal">&#10003;</span> {a.text}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* House Rules */}
      {data.houseRules.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-10">
          <h2 className="text-2xl font-bold text-fp-text mb-4">House Rules</h2>
          <ul className="space-y-2">
            {data.houseRules.map((r) => (
              <li key={r.id} className="text-fp-text text-sm flex items-start gap-2">
                <span className="text-fp-teal mt-0.5">&#8226;</span> {r.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6 text-center text-sm text-fp-text-light">
        <p>&copy; {new Date().getFullYear()} {landlord.brandName}. Powered by FurnishedPortal.</p>
      </footer>
    </div>
  )
}
