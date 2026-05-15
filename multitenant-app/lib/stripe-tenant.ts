// WARNING: the decrypted Stripe restricted key is a live credential.
// It must NEVER appear in any log output, error messages, or stack traces.
// Do not add console.log, console.error, or throw statements that
// reference the decrypted key value — even partially.

import Stripe from 'stripe'
import { prisma } from './prisma'
import { decrypt } from './encryption'

export class MissingStripeKeyError extends Error {
  readonly landlordId: string
  constructor(landlordId: string) {
    super(`Landlord ${landlordId} has not connected a Stripe account. Complete the Stripe setup wizard first.`)
    this.name = 'MissingStripeKeyError'
    this.landlordId = landlordId
  }
}

/**
 * Returns a Stripe client scoped to the given landlord's own account.
 * Every API call made with this client hits the landlord's Stripe account,
 * not the FurnishedPortal platform account.
 *
 * Throws MissingStripeKeyError if the landlord has not completed Stripe setup.
 * Does NOT cache across requests — call once per request and discard.
 */
export async function getLandlordStripeClient(landlordId: string): Promise<Stripe> {
  const landlord = await prisma.landlord.findUnique({
    where: { id: landlordId },
    select: { stripeRestrictedKey: true },
  })

  if (!landlord?.stripeRestrictedKey) {
    throw new MissingStripeKeyError(landlordId)
  }

  // decrypt() throws if FP_ENCRYPTION_KEY is missing or ciphertext is malformed.
  // Do not catch — let the caller surface the error without logging key material.
  const key = decrypt(landlord.stripeRestrictedKey)

  return new Stripe(key, { apiVersion: '2024-06-20' })
}
