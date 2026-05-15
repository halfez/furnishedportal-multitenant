export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireLandlord, withLandlordContext } from '@/lib/landlord-context'
import { type Prisma, type PaymentStatus } from '@prisma/client'
import Link from 'next/link'
import RefundButton from './RefundButton'

const VALID_STATUSES = ['PAID', 'PENDING', 'FAILED', 'REFUNDED'] as const

const STATUS_STYLES: Record<PaymentStatus, string> = {
  PAID: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-600',
}

function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2)
}

function formatDate(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatType(type: string): string {
  return type[0] + type.slice(1).toLowerCase()
}

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>
}

export default async function AdminPaymentsPage({ searchParams }: PageProps) {
  const landlord = await requireLandlord().catch(() => null)
  if (!landlord) notFound()

  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/tenant/login')
  if (session.user.landlordId !== landlord.id) redirect('/tenant/login')
  if (session.user.role !== 'admin' && session.user.role !== 'owner') redirect('/')

  const primaryColor = landlord.primaryColor ?? '#00798c'

  const rawStatus = Array.isArray(searchParams.status)
    ? searchParams.status[0]
    : (searchParams.status ?? '')
  const rawDateRange = Array.isArray(searchParams.dateRange)
    ? searchParams.dateRange[0]
    : (searchParams.dateRange ?? '30')

  const validStatus = VALID_STATUSES.includes(rawStatus as PaymentStatus)
    ? (rawStatus as PaymentStatus)
    : undefined

  const dateRangeDays = rawDateRange === '' ? 0 : (parseInt(rawDateRange) || 30)
  const startDate =
    dateRangeDays > 0 ? new Date(Date.now() - dateRangeDays * 24 * 60 * 60 * 1000) : null

  const where: Prisma.PaymentWhereInput = {
    ...(validStatus ? { status: validStatus } : {}),
    ...(startDate ? { createdAt: { gte: startDate } } : {}),
  }

  const payments = await withLandlordContext(landlord.id, (db) =>
    db.payment.findMany({
      where,
      orderBy: [
        { paidAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
    })
  )

  return (
    <div className="min-h-screen bg-fp-bg">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-xl" style={{ color: primaryColor }}>
            {landlord.brandName} — Admin
          </span>
          <div className="flex gap-4 text-sm">
            <Link href="/admin" className="text-fp-text hover:text-fp-teal transition-colors">
              Dashboard
            </Link>
            <Link href="/" className="text-fp-text-light hover:text-fp-teal transition-colors">
              View site
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-fp-text mb-8">Payments</h1>

        {/* Filters */}
        <form
          method="GET"
          className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-end"
        >
          <div>
            <label className="block text-xs font-medium text-fp-text-light mb-1">Status</label>
            <select
              name="status"
              defaultValue={rawStatus}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-fp-text bg-white focus:outline-none focus:ring-2 focus:ring-fp-teal"
            >
              <option value="">All</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-fp-text-light mb-1">Date range</label>
            <select
              name="dateRange"
              defaultValue={rawDateRange}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-fp-text bg-white focus:outline-none focus:ring-2 focus:ring-fp-teal"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="">All time</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-fp-text-light mb-1">
              Tenant email{' '}
              <span className="text-fp-brown-light font-normal">(coming soon)</span>
            </label>
            <input
              name="email"
              type="text"
              disabled
              placeholder="Filter by email…"
              className="text-sm border border-gray-100 rounded-lg px-3 py-2 text-fp-text-light bg-gray-50 cursor-not-allowed w-44"
            />
          </div>

          <button
            type="submit"
            className="text-sm px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: primaryColor }}
          >
            Apply
          </button>
        </form>

        {/* Table */}
        {payments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center">
            <p className="text-fp-text-light">
              {validStatus || startDate
                ? 'No payments match these filters.'
                : "No payments yet. Once tenants pay via your /pay page, they'll show up here."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Date', 'Tenant', 'Type', 'Amount', 'Status', 'Stripe', 'Actions'].map(
                      (col) => (
                        <th
                          key={col}
                          className={`px-5 py-3 text-xs font-medium text-fp-text-light uppercase tracking-wide ${col === 'Amount' ? 'text-right' : 'text-left'}`}
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payments.map((p) => {
                    const displayDate =
                      p.status === 'PAID' || p.status === 'REFUNDED'
                        ? (p.paidAt ?? p.createdAt)
                        : p.createdAt
                    const amountDollars = formatAmount(p.amount)
                    const stripeUrl = p.stripePaymentIntentId
                      ? `https://dashboard.stripe.com/test/payments/${p.stripePaymentIntentId}`
                      : null

                    return (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3 text-fp-text whitespace-nowrap">
                          {formatDate(displayDate)}
                        </td>
                        <td className="px-5 py-3 text-fp-text-light">—</td>
                        <td className="px-5 py-3 text-fp-text">{formatType(p.type)}</td>
                        <td className="px-5 py-3 text-fp-text text-right font-medium">
                          ${amountDollars}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[p.status]}`}
                          >
                            {p.status[0] + p.status.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {stripeUrl ? (
                            <a
                              href={stripeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs underline hover:opacity-70 transition-opacity"
                              style={{ color: primaryColor }}
                            >
                              View ↗
                            </a>
                          ) : (
                            <span className="text-fp-text-light text-xs">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {p.status === 'PAID' && (
                            <RefundButton
                              paymentId={p.id}
                              amountDollars={amountDollars}
                              tenantLabel="—"
                            />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
