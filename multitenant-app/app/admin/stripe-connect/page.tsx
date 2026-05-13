import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveLandlord } from '@/lib/landlord-context'
import { redirect } from 'next/navigation'
import { StripeConnectClient } from './_client'

export default async function StripeConnectPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/tenant/login')

  const landlord = await resolveLandlord()
  if (!landlord) redirect('/tenant/login')
  if (session.user.landlordId !== landlord.id) redirect('/admin')
  if (session.user.role !== 'admin' && session.user.role !== 'owner') redirect('/admin')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <a href="/admin" className="text-sm text-fp-primary hover:underline">← Admin dashboard</a>
          <h1 className="text-xl font-semibold text-gray-900 mt-1">Connect your Stripe account</h1>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <StripeConnectClient
          alreadyConnected={!!landlord.stripeRestrictedKey}
          connectedAt={landlord.stripeKeysAddedAt?.toISOString() ?? null}
          maskedPublishableKey={
            landlord.stripePublishableKey
              ? `${landlord.stripePublishableKey.slice(0, 8)}...`
              : null
          }
        />
      </main>
    </div>
  )
}
