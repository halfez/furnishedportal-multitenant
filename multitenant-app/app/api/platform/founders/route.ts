export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { withPlatformContext } from '@/lib/landlord-context'

function checkPlatformKey(request: NextRequest): boolean {
  const key = process.env.PLATFORM_ADMIN_KEY
  return !!key && request.headers.get('x-platform-key') === key
}

// GET /api/platform/founders
// Returns all founding cohort landlords with subscription data.
export async function GET(request: NextRequest) {
  if (!checkPlatformKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const founders = await withPlatformContext(async (db) => {
    return db.landlord.findMany({
      where: { subscription: { isFoundingCohort: true } },
      include: {
        subscription: {
          select: {
            id: true,
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
  })

  return NextResponse.json({ founders })
}
