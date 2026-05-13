export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveOnboardingToken, OnboardingTokenError } from '@/lib/onboarding-token'
import { z } from 'zod'

const SaveBody = z.object({
  token: z.string(),
  page: z.number().int().min(1).max(4),
  data: z.record(z.unknown()),
})

export async function PATCH(request: NextRequest) {
  let body: z.infer<typeof SaveBody>
  try {
    body = SaveBody.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const { record } = await resolveOnboardingToken(body.token)

    const pageKey = `page${body.page}Data` as 'page1Data' | 'page2Data' | 'page3Data' | 'page4Data'

    await prisma.onboardingResponse.update({
      where: { id: record.id },
      data: {
        [pageKey]: body.data,
        currentPage: Math.max(record.currentPage, body.page),
      },
    })

    return NextResponse.json({ saved: true, page: body.page })
  } catch (err) {
    if (err instanceof OnboardingTokenError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 401 })
    }
    console.error('[questionnaire-save]', err)
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}
