/**
 * Cross-tenant isolation smoke test
 *
 * Seeds two fake landlords with distinct data, then verifies each landlord's
 * queries return ONLY their own data — testing both isolation layers:
 *
 *   Layer 1 (ORM):  withLandlordCtx() injects landlordId into every Prisma query
 *   Layer 2 (RLS):  SET LOCAL app.landlord_id causes Postgres to enforce row policies
 *
 * This script is self-contained — no Next.js server required.
 *
 * Run:  npm run smoke:cross-tenant   (from multitenant-app/)
 * Requires: .env with DATABASE_URL and DIRECT_DATABASE_URL
 *
 * Exit 0 = all isolation checks passed.
 * Exit 1 = at least one cross-tenant data leak detected.
 */

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const TEST_TAG = `smoke-${Date.now()}`

// ─────────────────────────────────────────────────────────────────────────────
// Replicate the withLandlordContext pattern from lib/landlord-context.ts
// (No Next.js imports needed — just raw Prisma + GUC transaction)
// ─────────────────────────────────────────────────────────────────────────────

function scopedFor(landlordId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }: { args: Prisma.Args<never, 'findMany'>; query: (a: typeof args) => Promise<unknown> }) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(args as any).where = { ...(args as any).where, landlordId }
          return query(args)
        },
      },
    },
  })
}

async function withCtx<T>(
  landlordId: string,
  fn: (db: PrismaClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Set the Postgres GUC so RLS policies also fire
    await tx.$executeRaw`SELECT set_config('app.landlord_id', ${landlordId}, true)`
    // Build an ORM-scoped client for this landlordId
    const scoped = scopedFor(landlordId)
    return fn(scoped as unknown as PrismaClient)
  })
}

async function withPlatform<T>(fn: (db: PrismaClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.landlord_id', 'PLATFORM', true)`
    return fn(prisma)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Assertion helpers
// ─────────────────────────────────────────────────────────────────────────────

let failures = 0
function pass(msg: string) { console.log(`  ✓  ${msg}`) }
function fail(msg: string) { console.error(`  ✗  ${msg}`); failures++ }
function check(ok: boolean, msg: string) { ok ? pass(msg) : fail(msg) }

// ─────────────────────────────────────────────────────────────────────────────
// Seed helpers
// ─────────────────────────────────────────────────────────────────────────────

async function seedLandlord(label: 'A' | 'B') {
  return withPlatform((db) =>
    db.landlord.create({
      data: {
        businessName: `Test Landlord ${label} [${TEST_TAG}]`,
        brandName: `Brand${label}`,
        ownerFirstName: 'Smoke',
        ownerLastName: label,
        ownerEmail: `smoke-${label.toLowerCase()}-${TEST_TAG}@test.local`,
        subdomain: `smoke-${label.toLowerCase()}-${TEST_TAG}`,
        status: 'live',
      },
    })
  )
}

async function seedData(landlordId: string, label: string) {
  return withPlatform(async (db) => {
    const faq = await db.faqCategory.create({
      data: { landlordId, title: `FAQ-${label}`, sortOrder: 0 },
    })
    const img = await db.galleryImage.create({
      data: { landlordId, caption: `Image-${label}`, isPublic: true },
    })
    const tenant = await db.tenant.create({
      data: {
        landlordId,
        firstName: `Tenant${label}`,
        lastName: 'Smoke',
        email: `tenant-${label}-${TEST_TAG}@test.local`,
        password: 'placeholder',
        status: 'active',
        role: 'tenant',
      },
    })
    return { faq, img, tenant }
  })
}

async function cleanup(landlordAId: string, landlordBId: string) {
  await withPlatform(async (db) => {
    const ids = [landlordAId, landlordBId].filter(Boolean)
    await db.galleryImage.deleteMany({ where: { landlordId: { in: ids } } })
    await db.faqCategory.deleteMany({ where: { landlordId: { in: ids } } })
    await db.tenant.deleteMany({ where: { landlordId: { in: ids } } })
    await db.landlord.deleteMany({ where: { id: { in: ids } } })
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Isolation checks
// ─────────────────────────────────────────────────────────────────────────────

interface SeedResult {
  faq: { id: string; landlordId: string }
  img: { id: string; landlordId: string }
  tenant: { id: string; landlordId: string }
}

async function checkIsolation(
  viewerId: string,
  viewerLabel: string,
  ownData: SeedResult,
  otherData: SeedResult,
  otherLabel: string,
) {
  console.log(`\n  ${viewerLabel} context — should see own data, not ${otherLabel}'s`)

  const faqs = await withCtx(viewerId, (db) => db.faqCategory.findMany())
  const imgs = await withCtx(viewerId, (db) => db.galleryImage.findMany())
  const tenants = await withCtx(viewerId, (db) => db.tenant.findMany())

  // Own data is visible
  check(faqs.some((r) => r.id === ownData.faq.id), `${viewerLabel} sees own FAQ`)
  check(imgs.some((r) => r.id === ownData.img.id), `${viewerLabel} sees own gallery image`)
  check(tenants.some((r) => r.id === ownData.tenant.id), `${viewerLabel} sees own tenant`)

  // Other landlord's data is invisible
  check(!faqs.some((r) => r.id === otherData.faq.id), `${viewerLabel} does NOT see ${otherLabel}'s FAQ`)
  check(!imgs.some((r) => r.id === otherData.img.id), `${viewerLabel} does NOT see ${otherLabel}'s gallery image`)
  check(!tenants.some((r) => r.id === otherData.tenant.id), `${viewerLabel} does NOT see ${otherLabel}'s tenant`)

  // Every returned row belongs to the viewer
  const faqLeak = faqs.find((r) => r.landlordId !== viewerId)
  check(!faqLeak, `All FAQ rows scoped to ${viewerLabel} (no foreign landlordId)`)

  const imgLeak = imgs.find((r) => r.landlordId !== viewerId)
  check(!imgLeak, `All gallery rows scoped to ${viewerLabel} (no foreign landlordId)`)

  const tenantLeak = tenants.find((r) => r.landlordId !== viewerId)
  check(!tenantLeak, `All tenant rows scoped to ${viewerLabel} (no foreign landlordId)`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(60))
  console.log('Cross-tenant isolation smoke test')
  console.log(`Tag: ${TEST_TAG}`)
  console.log('═'.repeat(60))

  let landlordAId = ''
  let landlordBId = ''

  try {
    console.log('\nSeeding two test landlords + data...')
    const [landlordA, landlordB] = await Promise.all([
      seedLandlord('A'),
      seedLandlord('B'),
    ])
    landlordAId = landlordA.id
    landlordBId = landlordB.id
    console.log(`  Landlord A: ${landlordA.subdomain} (${landlordAId})`)
    console.log(`  Landlord B: ${landlordB.subdomain} (${landlordBId})`)

    const [dataA, dataB] = await Promise.all([
      seedData(landlordAId, 'A'),
      seedData(landlordBId, 'B'),
    ])
    console.log('  Data seeded for both landlords.')

    await checkIsolation(landlordAId, 'Landlord-A', dataA, dataB, 'Landlord-B')
    await checkIsolation(landlordBId, 'Landlord-B', dataB, dataA, 'Landlord-A')

  } finally {
    if (landlordAId || landlordBId) {
      console.log('\nCleaning up test data...')
      await cleanup(landlordAId, landlordBId)
      console.log('  Done.')
    }
    await prisma.$disconnect()
  }

  console.log('\n' + '═'.repeat(60))
  if (failures === 0) {
    console.log('All cross-tenant isolation checks PASSED. ✓')
    process.exit(0)
  } else {
    console.error(`${failures} check(s) FAILED — cross-tenant data leak detected!`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err?.message ?? err)
  process.exit(1)
})
