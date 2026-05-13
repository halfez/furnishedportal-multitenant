// Usage: node scripts/get-onboarding-token.js <email>
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  if (!email) { console.error('Usage: node scripts/get-onboarding-token.js <email>'); process.exit(1) }

  const row = await prisma.onboardingResponse.findFirst({
    where: { landlord: { ownerEmail: email } },
    include: { landlord: true },
  })
  if (!row) { console.error('Not found for', email); process.exit(1) }
  console.log(JSON.stringify({
    token: row.token,
    landlordId: row.landlordId,
    subdomain: row.landlord.subdomain,
    completedAt: row.completedAt,
    status: row.landlord.status,
  }))
}
main().finally(() => prisma.$disconnect())
