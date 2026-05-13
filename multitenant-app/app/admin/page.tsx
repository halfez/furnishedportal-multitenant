export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireLandlord, withLandlordContext } from '@/lib/landlord-context'
import Link from 'next/link'

export default async function AdminPage() {
  const landlord = await requireLandlord().catch(() => null)
  if (!landlord) notFound()

  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/tenant/login')

  // Guard: session must belong to THIS landlord
  if (session.user.landlordId !== landlord.id) redirect('/tenant/login')
  if (session.user.role !== 'admin' && session.user.role !== 'owner') {
    redirect('/')
  }

  const stats = await withLandlordContext(landlord.id, async (db) => {
    const [applications, tenants, units, contacts] = await Promise.all([
      db.application.count(),
      db.tenant.count(),
      db.unit.count(),
      db.contactSubmission.count({ where: { status: 'new' } }),
    ])
    return { applications, tenants, units, contacts }
  })

  const primaryColor = landlord.primaryColor ?? '#00798c'

  return (
    <div className="min-h-screen bg-fp-bg">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-xl" style={{ color: primaryColor }}>
            {landlord.brandName} — Admin
          </span>
          <div className="flex gap-4 text-sm">
            <Link href="/admin/faq" className="text-fp-text hover:text-fp-teal">FAQs</Link>
            <Link href="/" className="text-fp-text-light hover:text-fp-teal">View site</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-fp-text mb-8">Dashboard</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Applications', value: stats.applications },
            { label: 'Tenants', value: stats.tenants },
            { label: 'Units', value: stats.units },
            { label: 'New Contacts', value: stats.contacts },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm p-5 text-center">
              <div className="text-3xl font-bold" style={{ color: primaryColor }}>{value}</div>
              <div className="text-sm text-fp-text-light mt-1">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link
            href="/admin/faq"
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <h2 className="font-semibold text-fp-text mb-1">FAQ Editor</h2>
            <p className="text-sm text-fp-text-light">Manage frequently asked questions.</p>
          </Link>
          <Link
            href="/admin/applications"
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <h2 className="font-semibold text-fp-text mb-1">Applications</h2>
            <p className="text-sm text-fp-text-light">Review tenant applications.</p>
          </Link>
        </div>
      </main>
    </div>
  )
}
