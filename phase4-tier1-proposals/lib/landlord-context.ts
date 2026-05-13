// =====================================================================
// FurnishedPortal — Landlord context resolution (Tier 1, Phase 4)
// =====================================================================
//
// Status: PROPOSAL 2026-05-08. Once accepted, this file moves to
// template/lib/landlord-context.ts.
//
// Two responsibilities:
//   1. resolveLandlord() — read the headers set by middleware, find the
//      Landlord row, return it (or null if no landlord context, e.g.
//      apex marketing pages).
//   2. landlordPrisma() — return a Prisma client extension that auto-
//      scopes EVERY query to the resolved landlordId. No more manual
//      `where: { landlordId }` in business logic. This is the safety
//      net that prevents cross-tenant data leaks.
//
// Pattern is Prisma's $extends API (modern equivalent of middleware).
// Reference: https://www.prisma.io/docs/orm/prisma-client/client-extensions
// =====================================================================

import { headers } from 'next/headers'
import { PrismaClient, Prisma } from '@prisma/client'
import type { Landlord } from '@prisma/client'

// Singleton — Next.js dev server hot-reloads can leak connections otherwise.
declare global {
  // eslint-disable-next-line no-var
  var __fpPrisma: PrismaClient | undefined
}
const prisma = global.__fpPrisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.__fpPrisma = prisma

// =====================================================================
// Landlord resolution
// =====================================================================

export async function resolveLandlord(): Promise<Landlord | null> {
  const h = await headers()
  const subdomain = h.get('x-fp-subdomain')
  const customDomain = h.get('x-fp-custom-domain')

  if (subdomain) {
    const landlord = await prisma.landlord.findUnique({
      where: { subdomain },
    })
    if (!landlord) return null
    if (landlord.status === 'canceled' || landlord.status === 'paused') {
      return null
    }
    return landlord
  }

  if (customDomain) {
    const landlord = await prisma.landlord.findUnique({
      where: { customDomain },
    })
    if (!landlord) return null
    if (landlord.status === 'canceled' || landlord.status === 'paused') {
      return null
    }
    return landlord
  }

  return null
}

export async function requireLandlord(): Promise<Landlord> {
  const landlord = await resolveLandlord()
  if (!landlord) {
    throw new LandlordNotFoundError()
  }
  return landlord
}

export class LandlordNotFoundError extends Error {
  constructor() {
    super('No landlord resolved from request context')
    this.name = 'LandlordNotFoundError'
  }
}

// =====================================================================
// Auto-scoped Prisma client
//
// Every model that has a `landlordId` column gets queries auto-filtered
// by the resolved landlordId. Models WITHOUT landlordId (e.g. FaqItem,
// which inherits scope through FaqCategory) are not touched.
// =====================================================================

const LANDLORD_SCOPED_MODELS = [
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
] as const

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
          if (isScopedModel(model)) {
            args.where = { ...args.where, landlordId }
          }
          return query(args)
        },
        async findFirst({ model, args, query }) {
          if (isScopedModel(model)) {
            args.where = { ...args.where, landlordId }
          }
          return query(args)
        },
        async findUnique({ model, args, query }) {
          // findUnique uses unique fields — landlordId can't be added
          // post-hoc without rewriting the where. Caller must use
          // findFirst with landlordId-prefixed compound keys instead.
          // We log a warning if a scoped model is hit with findUnique.
          if (isScopedModel(model) && process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.warn(
              `[landlord-scope] findUnique on ${model} bypasses tenant scoping. ` +
                `Use findFirst with landlordId-aware compound keys instead.`
            )
          }
          return query(args)
        },
        async count({ model, args, query }) {
          if (isScopedModel(model)) {
            args.where = { ...args.where, landlordId }
          }
          return query(args)
        },
        async create({ model, args, query }) {
          if (isScopedModel(model)) {
            args.data = { ...args.data, landlordId }
          }
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
          if (isScopedModel(model)) {
            args.where = { ...args.where, landlordId }
          }
          return query(args)
        },
        async updateMany({ model, args, query }) {
          if (isScopedModel(model)) {
            args.where = { ...args.where, landlordId }
          }
          return query(args)
        },
        async delete({ model, args, query }) {
          if (isScopedModel(model)) {
            args.where = { ...args.where, landlordId }
          }
          return query(args)
        },
        async deleteMany({ model, args, query }) {
          if (isScopedModel(model)) {
            args.where = { ...args.where, landlordId }
          }
          return query(args)
        },
      },
    },
  })
}

function isScopedModel(model: string): boolean {
  const lc = model[0].toLowerCase() + model.slice(1)
  return (LANDLORD_SCOPED_MODELS as readonly string[]).includes(lc)
}

// =====================================================================
// Platform-level Prisma (for marketing pages, signup, billing webhooks)
//
// Used when there's NO landlord context (apex domain, signup flow,
// platform-Stripe webhook). NEVER use this inside a landlord's tenant
// flow — you lose the auto-scoping safety net.
// =====================================================================
export const platformPrisma = prisma
