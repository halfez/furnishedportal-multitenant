# Phase 4 · Tier 1 — Multi-tenant foundation proposals

Status: DRAFTED 2026-05-08 in a single session. Six artifacts that
together describe everything needed to flip the FurnishedPortal product
codebase from Path B (one-Vercel-project-per-client) to Path A
(single multi-tenant deployment, subdomain routing, `landlordId`
on every table).

These files live OUTSIDE `template/` so Next.js / Prisma do not pick
them up. Once reviewed, each artifact moves to its real path inside
`template/` (or replaces an existing file there).

## Read order

For Sean, in this order:

1. **`../FURNISHEDPORTAL_SAAS_SPEC.md`** — the north star (originally drafted as `FURNISHEDPORTAL_PHASE4_SPEC.md`, renamed 2026-05-12). Read this first.
2. **`../template/prisma/schema-v2-multitenant.proposal.prisma`** — the schema. Skim the comment block at top, then scan the new models. Most important file in the set.
3. **`middleware.ts`** — subdomain routing. Short file, easy to follow.
4. **`lib/landlord-context.ts`** — the auto-scoping Prisma extension. The safety net that prevents cross-tenant leaks. Read carefully.
5. **`NEXTAUTH_PIVOT.md`** — design doc for the auth changes.
6. **`VERCEL_SETUP.md`** — your one-time DNS + Vercel clicks. Save until everything else is approved.
7. **`ACCEPTANCE_TESTS.md`** — the manual e2e walk that gates Tier 1 → Tier 2.

## Tier 1 cutover plan (when you give the green light)

A future session can execute this in order:

| Step | What | Risk |
|---|---|---|
| 1 | Create a NEW multi-tenant Next.js app dir alongside `template/` (don't refactor in place) | Low — `template/` stays untouched as a Path B reference |
| 2 | Copy schema-v2 in, run `prisma migrate dev` against a fresh local DB | Medium — destructive on the local DB only |
| 3 | Drop in `middleware.ts`, `lib/landlord-context.ts`, and the NextAuth pivot | Low — local only |
| 4 | Copy template's UI components, refactor each to use `landlordPrisma()` instead of `CONFIG` | High — touches every component, port carefully |
| 5 | Manual smoke test: create 2 landlords, hit both subdomains, verify isolation | Required gate |
| 6 | Run the 6 ACCEPTANCE_TESTS scenarios | Required gate |
| 7 | Deploy to Vercel as a new project, configure wildcard | Sean does the Vercel/DNS clicks |
| 8 | Final acceptance run against the deployed app | Required gate |

Estimated 2–3 sessions if no surprises, more likely 4–5 with the
component refactor surgery.

## Open design decisions (resolved 2026-05-08)

| Question | Answer | Why |
|---|---|---|
| One admin per landlord, or multiple? | Multiple via `User` model | Zero cost now, painful migration later if we constrain it |
| `LeaseTemplate.jurisdiction` granularity | State + optional `subJurisdiction` for cities with their own rules (NYC, Seattle, SF, etc.) | Cheap to add, real legal need |
| BYO Stripe key storage | Encrypted in DB with platform-level encryption key | Env vars don't scale to N landlords; this is the only Path A path |

## Things this Tier 1 package does NOT include

- Per-landlord theming beyond primary color + logo (Tier 3 territory)
- The questionnaire UI itself (Tier 2 — the bridge work)
- Stripe webhook handlers for the SaaS billing (Tier 2)
- Custom-domain provisioning UI (Tier 4, deferred)
- Migration scripts to import the existing Yellowstone Stay data (deliberate — Yellowstone stays standalone per 2026-05-08 decision)
