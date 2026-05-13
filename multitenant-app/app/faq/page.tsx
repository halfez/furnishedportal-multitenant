export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireLandlord, withLandlordContext } from '@/lib/landlord-context'

export default async function FaqPage() {
  const landlord = await requireLandlord().catch(() => null)
  if (!landlord) notFound()

  const categories = await withLandlordContext(landlord.id, (db) =>
    db.faqCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    })
  )

  const primaryColor = landlord.primaryColor ?? '#00798c'

  return (
    <div className="min-h-screen bg-fp-bg">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl" style={{ color: primaryColor }}>
            {landlord.brandName}
          </Link>
          <Link href="/" className="text-sm text-fp-text-light hover:text-fp-teal">
            Back to home
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-fp-text mb-8">Frequently Asked Questions</h1>

        {categories.length === 0 ? (
          <p className="text-fp-text-light">No FAQs yet.</p>
        ) : (
          <div className="space-y-8">
            {categories.map((cat) => (
              <div key={cat.id}>
                <h2 className="text-xl font-semibold text-fp-text mb-3">{cat.title}</h2>
                <div className="space-y-3">
                  {cat.items.map((item) => (
                    <details
                      key={item.id}
                      className="bg-white rounded-lg shadow-sm p-4 group"
                    >
                      <summary className="font-medium text-fp-text cursor-pointer list-none flex justify-between items-center">
                        {item.question}
                        <span className="text-fp-teal group-open:rotate-180 transition-transform">&#9660;</span>
                      </summary>
                      <p className="mt-3 text-fp-text-light text-sm leading-relaxed">
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
