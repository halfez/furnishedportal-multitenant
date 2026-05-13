// Verifies charlie and delta are live with correct data and no cross-contamination
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const charlie = await prisma.landlord.findUnique({
    where: { subdomain: 'charlie' },
    include: {
      subscription: true,
      properties: { include: { units: true } },
      houseRules: true,
      faqCategories: { include: { items: true } },
    },
  })
  const delta = await prisma.landlord.findUnique({
    where: { subdomain: 'delta' },
    include: {
      subscription: true,
      properties: { include: { units: true } },
      houseRules: true,
      faqCategories: { include: { items: true } },
    },
  })

  function summarize(l) {
    if (!l) return 'NOT FOUND'
    return {
      id: l.id,
      brandName: l.brandName,
      status: l.status,
      isFoundingCohort: l.subscription?.isFoundingCohort,
      propertyCount: l.properties.length,
      unitCount: l.properties.flatMap(p => p.units).length,
      units: l.properties.flatMap(p => p.units).map(u => u.identifier),
      houseRuleCount: l.houseRules.length,
      faqCategories: l.faqCategories.map(c => c.title),
      stripeConnected: !!l.stripeRestrictedKey,
      goLiveAt: l.goLiveAt,
    }
  }

  console.log('=== CHARLIE ===')
  console.log(JSON.stringify(summarize(charlie), null, 2))
  console.log('\n=== DELTA ===')
  console.log(JSON.stringify(summarize(delta), null, 2))

  // Cross-contamination check: charlie's units should not appear in delta's data
  const charlieUnitIds = charlie?.properties.flatMap(p => p.units).map(u => u.id) ?? []
  const deltaUnitIds = delta?.properties.flatMap(p => p.units).map(u => u.id) ?? []
  const overlap = charlieUnitIds.filter(id => deltaUnitIds.includes(id))
  console.log('\n=== ISOLATION CHECK ===')
  console.log('Charlie unit IDs:', charlieUnitIds)
  console.log('Delta unit IDs:', deltaUnitIds)
  console.log('Overlap (must be empty):', overlap)
  console.log('Charlie landlordId !== Delta landlordId:', charlie?.id !== delta?.id)
}

main().finally(() => prisma.$disconnect())
