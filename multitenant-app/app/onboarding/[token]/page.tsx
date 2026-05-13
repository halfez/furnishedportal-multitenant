import { prisma } from '@/lib/prisma'
import { verifyOnboardingToken, OnboardingTokenError } from '@/lib/onboarding-token'
import { QuestionnaireClient } from './_components/QuestionnaireClient'

interface Props {
  params: { token: string }
}

export default async function OnboardingPage({ params }: Props) {
  const { token } = params

  // Validate token server-side before rendering the form.
  let landlordId: string
  try {
    const payload = verifyOnboardingToken(token)
    landlordId = payload.landlordId
  } catch {
    return <ErrorPage message="This link is invalid or has expired. Please contact support@furnishedportal.com." />
  }

  const record = await prisma.onboardingResponse.findUnique({ where: { landlordId } })
  if (!record) return <ErrorPage message="Onboarding session not found." />

  if (record.completedAt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Setup complete!</h1>
          <p className="text-gray-600">
            You have already submitted your questionnaire. Check your email for next steps,
            or contact support if you need to make changes.
          </p>
        </div>
      </div>
    )
  }

  const landlord = await prisma.landlord.findUnique({ where: { id: landlordId } })
  if (!landlord) return <ErrorPage message="Landlord not found." />

  return (
    <QuestionnaireClient
      token={token}
      initialPage={record.currentPage}
      initialData={{
        page1: record.page1Data as Record<string, unknown> | null,
        page2: record.page2Data as Record<string, unknown> | null,
        page3: record.page3Data as Record<string, unknown> | null,
        page4: record.page4Data as Record<string, unknown> | null,
      }}
      landlord={{
        ownerFirstName: landlord.ownerFirstName,
        ownerEmail: landlord.ownerEmail,
        subdomain: landlord.subdomain,
      }}
    />
  )
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Link error</h1>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
}
