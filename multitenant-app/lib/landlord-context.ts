// FurnishedPortal — Landlord context resolution + auto-scoped Prisma client
//
// Two responsibilities:
//   1. resolveLandlord()   — reads headers set by middleware, finds the Landlord row.
//   2. landlordPrisma()    — returns a Prisma client extension that:
//        a) auto-filters every query by landlordId (ORM-level defense)
//        b) wraps queries in a transaction that sets the GUC app.landlord_id
//           (DB-level RLS defense)
//
// RLS pattern:
//   Every customer-data table has a policy:
//     USING (landlord_id = current_setting('app.landlord_id', true)::text
//            OR current_setting('app.landlord_id', true) = 'PLATFORM')
//   Setting the GUC to 'PLATFORM' is the sentinel for platformPrisma operations
//   (Landlord creation, webhook handlers, seed script).

import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import type { Landlord } from '@prisma/client'

// =====================================================================
// Landlord resolution
// =====================================================================

export async function resolveLandlord(): Promise<Landlord | null> {
  const h = await headers()
  const subdomain = h.get('x-fp-subdomain')
  const customDomain = h.get('x-fp-custom-domain')

  if (subdomain) {
    const landlord = await prisma.landlord.findUnique({ where: { subdomain } })
    if (!landlord) return null
    if (landlord.status === 'canceled' || landlord.status === 'paused') return null
    return landlord
  }

  if (customDomain) {
    const landlord = await prisma.landlord.findUnique({ where: { customDomain } })
    if (!landlord) return null
    if (landlord.status === 'canceled' || landlord.status === 'paused') return null
    return landlord
  }

  return null
}

export async function requireLandlord(): Promise<Landlord> {
  const landlord = await resolveLandlord()
  if (!landlord) throw new LandlordNotFoundError()
  return landlord
}

export class LandlordNotFoundError extends Error {
  constructor() {
    super('No landlord resolved from request context')
    this.name = 'LandlordNotFoundError'
  }
}

// =====================================================================
// Models with a landlordId column — ORM scoping + RLS both apply
// =====================================================================

const LANDLORD_SCOPED_MODELS = new Set([
  'contactSubmission',
  'booking',
  'faqCategory',
  'application',
  'tenant',
  'galleryImage',
  'payment',
  'property',
  'unit',
  'houseRule',
  'amenity',
  'leaseTemplate',
  'user',
  'subscription',
  'onboardingResponse',
])

function isScopedModel(model: string): boolean {
  return LANDLORD_SCOPED_MODELS.has(model[0].toLowerCase() + model.slice(1))
}

// =====================================================================
// Auto-scoped Prisma client
//
// Every query on a scoped model is:
//   1. ORM-filtered: args.where / args.data gets landlordId injected.
//   2. RLS-enforced: wrapped in a transaction that sets SET LOCAL app.landlord_id.
//
// Use withLandlordContext() for the RLS wrapper (preferred).
// Use scopedPrismaFor() when you already have a transaction handle.
// =====================================================================

export async function landlordPrisma() {
  const landlord = await requireLandlord()
  return scopedPrismaFor(landlord.id)
}

export function scopedPrismaFor(landlordId: string) {
  return prisma.$extends({
    name: 'landlord-scope',
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (isScopedModel(model)) args.where = { ...args.where, landlordId }
          return query(args)
        },
        async findFirst({ model, args, query }) {
          if (isScopedModel(model)) args.where = { ...args.where, landlordId }
          return query(args)
        },
        async findUnique({ model, args, query }) {
          if (isScopedModel(model) && process.env.NODE_ENV !== 'production') {
            console.warn(
              `[landlord-scope] findUnique on ${model} bypasses tenant scoping. ` +
              `Use findFirst with a landlordId-aware compound key instead.`
            )
          }
          return query(args)
        },
        async count({ model, args, query }) {
          if (isScopedModel(model)) args.where = { ...args.where, landlordId }
          return query(args)
        },
        async create({ model, args, query }) {
          if (isScopedModel(model)) args.data = { ...args.data, landlordId }
          return query(args)
        },
        async createMany({ model, args, query }) {
          if (isScopedModel(model)) {
            const rows = Array.isArray(args.data) ? args.data : [args.data]
            args.data = rows.map((r) => ({ ...r, landlordId }))
          }
          return query(args)
        },
        async update({ model, args, query }) {
          if (isScopedModel(model)) args.where = { ...args.where, landlordId }
          return query(args)
        },
        async updateMany({ model, args, query }) {
          if (isScopedModel(model)) args.where = { ...args.where, landlordId }
          return query(args)
        },
        async delete({ model, args, query }) {
          if (isScopedModel(model)) args.where = { ...args.where, landlordId }
          return query(args)
        },
        async deleteMany({ model, args, query }) {
          if (isScopedModel(model)) args.where = { ...args.where, landlordId }
          return query(args)
        },
      },
    },
  })
}

// =====================================================================
// withLandlordContext — RLS-enforcing transaction wrapper
//
// Wraps the callback in a Prisma transaction and sets the session GUC
// before executing, so both the ORM filter AND the DB RLS policy are
// satisfied.  Use this for all customer-data writes and sensitive reads.
//
// Usage:
//   const categories = await withLandlordContext(landlord.id, (db) =>
//     db.faqCategory.findMany({ include: { items: true } })
//   )
// =====================================================================

export async function withLandlordContext<T>(
  landlordId: string,
  fn: (db: ReturnType<typeof scopedPrismaFor>) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.landlord_id', ${landlordId}, true)`
    return fn(scopedPrismaFor(landlordId))
  })
}

// =====================================================================
// platformPrisma — for operations with NO landlord context
//
// Sets the GUC to the PLATFORM sentinel so RLS policies (which allow
// current_setting = 'PLATFORM') do not block platform-level reads/writes.
// Use ONLY in:
//   - Stripe webhook handlers (creating Landlord rows)
//   - Signup/onboarding flows
//   - Seed scripts
//   - Middleware-level subdomain resolution
//
// NEVER use inside a landlord's tenant flow.
// =====================================================================

export async function withPlatformContext<T>(
  fn: (db: typeof prisma) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.landlord_id', 'PLATFORM', true)`
    return fn(prisma)
  })
}

export const platformPrisma = prisma
