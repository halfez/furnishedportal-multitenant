export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireLandlord, withLandlordContext } from '@/lib/landlord-context'
import Link from 'next/link'

export default async function AdminApplicationsPage() {
  const landlord = await requireLandlord().catch(() => null)
  if (!landlord) notFound()

  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/tenant/login')
  if (session.user.landlordId !== landlord.id) redirect('/tenant/login')
  if (session.user.role !== 'admin' && session.user.role !== 'owner') redirect('/')

  const applications = await withLandlordContext(landlord.id, (db) =>
    db.application.findMany({
      include: { tenant: true, unit: true },
      orderBy: { createdAt: 'desc' },
    })
  )

  const primaryColor = landlord.primaryColor ?? '#00798c'

  return (
    <div className="min-h-screen bg-fp-bg">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-xl" style={{ color: primaryColor }}>
            {landlord.brandName} — Applications
          </span>
          <Link href="/admin" className="text-sm text-fp-text-light hover:text-fp-teal">
            Back to dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-fp-text mb-6">
          Applications ({applications.length})
        </h1>

        {applications.length === 0 ? (
          <p className="text-fp-text-light">No applications yet.</p>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div key={app.id} className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-fp-text">
                      {app.tenant.firstName} {app.tenant.lastName}
                    </div>
                    <div className="text-sm text-fp-text-light">
                      {app.tenant.email} &middot; Unit {app.unit?.identifier ?? 'N/A'}
                    </div>
                    <div className="text-sm text-fp-text-light mt-1">
                      {new Date(app.moveInDate).toLocaleDateString()} &ndash;{' '}
                      {new Date(app.moveOutDate).toLocaleDateString()} &middot;{' '}
                      ${app.monthlyRent.toLocaleString()}/mo
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
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
      </main>
    </div>
  )
}
