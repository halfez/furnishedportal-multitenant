export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireLandlord, withLandlordContext } from '@/lib/landlord-context'
import Link from 'next/link'

export default async function TenantPortalPage() {
  const landlord = await requireLandlord().catch(() => null)
  if (!landlord) notFound()

  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/tenant/login')
  if (session.user.landlordId !== landlord.id) redirect('/tenant/login')
  if (session.user.role !== 'tenant') redirect('/admin')

  const data = await withLandlordContext(landlord.id, async (db) => {
    const [applications, payments] = await Promise.all([
      db.application.findMany({
        where: { tenantId: session.user.id },
        include: { unit: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.payment.findMany({
        where: { tenantId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])
    return { applications, payments }
  })

  const primaryColor = landlord.primaryColor ?? '#00798c'

  return (
    <div className="min-h-screen bg-fp-bg">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl" style={{ color: primaryColor }}>
            {landlord.brandName}
          </Link>
          <div className="flex gap-4 text-sm">
            <span className="text-fp-text-light">
              {session.user.firstName} {session.user.lastName}
            </span>
            <Link href="/api/auth/signout" className="text-fp-text-light hover:text-fp-teal">
              Sign out
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-fp-text mb-6">Your Portal</h1>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-fp-text mb-3">Applications</h2>
          {data.applications.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-fp-text-light text-sm">No applications yet.</p>
              <Link
                href="/tenant/portal/apply"
                className="mt-3 inline-block text-sm text-white px-4 py-2 rounded font-medium hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                Apply now
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.applications.map((app) => (
                <div key={app.id} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-fp-text">
                        Unit {app.unit?.identifier ?? app.id.slice(0, 6)}
                      </div>
                      <div className="text-sm text-fp-text-light">
                        {new Date(app.moveInDate).toLocaleDateString()} &ndash;{' '}
                        {new Date(app.moveOutDate).toLocaleDateString()}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        app.status === 'submitted'
                          ? 'bg-yellow-50 text-yellow-700'
                          : app.status === 'approved'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fp-text mb-3">Recent Payments</h2>
          {data.payments.length === 0 ? (
            <p className="text-fp-text-light text-sm">No payment history.</p>
          ) : (
            <div className="space-y-2">
              {data.payments.map((p) => (
                <div key={p.id} className="bg-white rounded-xl shadow-sm p-4 flex justify-between">
                  <div>
                    <div className="text-sm font-medium text-fp-text">{p.description}</div>
                    <div className="text-xs text-fp-text-light">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-fp-text">
                    ${p.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
