'use strict'
// Smoke test: decrypts a landlord's BYO Stripe key and calls stripe.balance.retrieve()
// against that landlord's own Stripe account.
//
// Run: npm run smoke:stripe-tenant   (from multitenant-app/)
// Requires: .env present with DATABASE_URL and FP_ENCRYPTION_KEY

// ts-node/register lets require() load .ts files transparently.
require('ts-node/register/transpile-only')

const { PrismaClient } = require('@prisma/client')
const { getLandlordStripeClient, MissingStripeKeyError } = require('../lib/stripe-tenant.ts')

async function main() {
  const prisma = new PrismaClient()

  let landlord
  try {
    landlord = await prisma.landlord.findFirst({
      where: { stripeRestrictedKey: { not: null } },
      select: { id: true, subdomain: true, businessName: true },
    })
  } finally {
    await prisma.$disconnect()
  }

  if (!landlord) {
    console.error(
      'ERROR: No landlord with a stored Stripe key found.\n' +
      'Complete the BYO Stripe wizard for at least one test landlord first.'
    )
    process.exit(1)
  }

  console.log(`Landlord: ${landlord.businessName} (${landlord.subdomain}) — id: ${landlord.id}`)
  console.log('Decrypting key and calling stripe.balance.retrieve() ...')

  let stripe
  try {
    stripe = await getLandlordStripeClient(landlord.id)
  } catch (e) {
    if (e instanceof MissingStripeKeyError) {
      console.error('ERROR: MissingStripeKeyError —', e.message)
    } else {
      // Do NOT log the error object directly — it might contain key material in a stack trace.
      console.error('ERROR: Failed to build Stripe client:', e?.message ?? String(e))
    }
    process.exit(1)
  }

  let balance
  try {
    balance = await stripe.balance.retrieve()
  } catch (e) {
    console.error('ERROR: stripe.balance.retrieve() failed:', e?.message ?? String(e))
    process.exit(1)
  }

  console.log('\n✓ Stripe balance retrieved successfully:')
  // Print balance — key is not included in balance response
  console.log(JSON.stringify(balance, null, 2))
  process.exit(0)
}

main()
