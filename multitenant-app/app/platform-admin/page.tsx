export const dynamic = 'force-dynamic'

import { withPlatformContext } from '@/lib/landlord-context'
import { CreateCheckoutForm, ChargeButton } from './FoundingActions'

type Founder = {
  id: string
  ownerFirstName: string
  ownerLastName: string
  ownerEmail: string
  subdomain: string
  createdAt: Date
  subscription: {
    status: string
    isFoundingCohort: boolean
    setupFeePaid: boolean
    propertyCount: number | null
    monthlyAmount: number
    setupAmount: number
    stripeCustomerId: string | null
    stripeSubscriptionId: string | null
    createdAt: Date
  } | null
}

function statusBadge(status: string) {
  if (status === 'active') return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Active</span>
  if (status === 'pending_milestone') return <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">Waiting for milestone</span>
  return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{status}</span>
}

export default async function PlatformAdminPage({
  searchParams,
}: {
  searchParams: { key?: string }
}) {
  const adminKey = process.env.PLATFORM_ADMIN_KEY
  if (!adminKey || searchParams.key !== adminKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Access denied.</p>
      </div>
    )
  }

  const founders = await withPlatformContext(async (db) => {
    return db.landlord.findMany({
      where: { subscription: { isFoundingCohort: true } },
      include: {
        subscription: {
          select: {
            status: true,
            isFoundingCohort: true,
            setupFeePaid: true,
            propertyCount: true,
            monthlyAmount: true,
            setupAmount: true,
            stripeCustomerId: true,
            stripeSubscriptionId: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }) as Founder[]

  const active = founders.filter(f => f.subscription?.status === 'active').length
  const pending = founders.filter(f => f.subscription?.status === 'pending_milestone').length

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-teal-700">FurnishedPortal — Platform Admin</span>
          <span className="text-xs text-gray-400">Founding Cohort: {founders.length}/10 signed · {active} active · {pending} pending</span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* Create checkout link */}
        <CreateCheckoutForm adminKey={adminKey} />

        {/* Founding host table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Founding Hosts</h2>
          </div>

          {founders.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-400">No founding hosts yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Subdomain</th>
                  <th className="px-6 py-3 text-left">Properties</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Signed up</th>
                  <th className="px-6 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {founders.map(f => {
                  const sub = f.subscription
                  const isPending = sub?.status === 'pending_milestone'
                  const propertyCount = sub?.propertyCount ?? 0

                  return (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-800">{f.ownerFirstName} {f.ownerLastName}</div>
                        <div className="text-xs text-gray-400">{f.ownerEmail}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {f.subdomain}.furnishedportal.com
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {propertyCount > 0 ? `${propertyCount}` : '—'}
                      </td>
                      <td className="px-6 py-4">
                        {statusBadge(sub?.status ?? 'unknown')}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {new Date(f.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        {isPending && propertyCount >= 2 ? (
                          <ChargeButton
                            landlordId={f.id}
                            name={`${f.ownerFirstName} ${f.ownerLastName}`}
                            propertyCount={propertyCount}
                            adminKey={adminKey}
                          />
                        ) : sub?.status === 'active' ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          Founding cohort cap: 10. Once all 10 are active, disable the founding checkout link.
        </p>
      </main>
    </div>
  )
}
