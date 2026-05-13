import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveLandlord } from '@/lib/landlord-context'
import { verifyOnboardingToken } from '@/lib/onboarding-token'
import { redirect } from 'next/navigation'
import { StripeConnectClient } from './_client'

export default async function StripeConnectPage({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  const landlord = await resolveLandlord()
  if (!landlord) redirect('/tenant/login')

  const session = await getServerSession(authOptions)
  let setupToken: string | null = null

  if (!session?.user) {
    const rawToken = searchParams?.token
    if (!rawToken) redirect('/tenant/login')
    try {
      const { landlordId } = verifyOnboardingToken(rawToken)
      if (landlordId !== landlord.id) redirect('/tenant/login')
    } catch {
      redirect('/tenant/login')
    }
    setupToken = rawToken
  } else {
    if (session.user.landlordId !== landlord.id) redirect('/admin')
    if (session.user.role !== 'admin' && session.user.role !== 'owner') redirect('/admin')
  }

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
          setupToken={setupToken}
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
