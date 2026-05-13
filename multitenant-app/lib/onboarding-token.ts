import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import type { OnboardingResponse } from '@prisma/client'

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

interface OnboardingTokenPayload {
  landlordId: string
  type: 'onboarding'
}

function getSecret(): string {
  const s = process.env.NEXTAUTH_SECRET
  if (!s) throw new Error('NEXTAUTH_SECRET is not set')
  return s
}

export function signOnboardingToken(landlordId: string): string {
  const payload: OnboardingTokenPayload = { landlordId, type: 'onboarding' }
  return jwt.sign(payload, getSecret(), { expiresIn: TOKEN_TTL_SECONDS })
}

export function verifyOnboardingToken(token: string): OnboardingTokenPayload {
  const decoded = jwt.verify(token, getSecret()) as OnboardingTokenPayload
  if (decoded.type !== 'onboarding') throw new Error('Invalid token type')
  return decoded
}

// Resolves the OnboardingResponse row for the token.
// Throws if token is invalid, expired, or already completed (single-use).
export async function resolveOnboardingToken(
  rawToken: string,
): Promise<{ payload: OnboardingTokenPayload; record: OnboardingResponse }> {
  let payload: OnboardingTokenPayload
  try {
    payload = verifyOnboardingToken(rawToken)
  } catch {
    throw new OnboardingTokenError('invalid_or_expired')
  }

  const record = await prisma.onboardingResponse.findUnique({
    where: { landlordId: payload.landlordId },
  })

  if (!record) throw new OnboardingTokenError('not_found')
  if (record.completedAt) throw new OnboardingTokenError('already_completed')

  return { payload, record }
}

export type OnboardingTokenErrorCode =
  | 'invalid_or_expired'
  | 'not_found'
  | 'already_completed'

export class OnboardingTokenError extends Error {
  code: OnboardingTokenErrorCode
  constructor(code: OnboardingTokenErrorCode) {
    const messages: Record<OnboardingTokenErrorCode, string> = {
      invalid_or_expired: 'This link has expired. Please contact support.',
      not_found: 'Onboarding session not found.',
      already_completed: 'You have already completed the onboarding questionnaire.',
    }
    super(messages[code])
    this.name = 'OnboardingTokenError'
    this.code = code
  }
}
