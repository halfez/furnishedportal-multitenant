# Session 2026-05-08 — Phase 4 Tier 1 design package

## Context

Continuation of an earlier session that ended with the Yellowstone tenant-workflow Tier 3 effectively complete (only magic-link login deferred, only real-Stripe verification walk left). User pivoted to FurnishedPortal Phase 4 — the SaaS automation layer that turns the white-label template into a self-serve product.

## Major decisions locked

- **Architecture pivot Path B → Path A.** Single multi-tenant Next.js app, single Postgres DB, every table keyed by `landlordId`, customers get subdomains under `*.furnishedportal.com`. Custom domains are an upgrade. The existing `template/` "config/property.ts is the only file that changes" rule is retired — it remains in the Product folder as a Path B reference but is no longer the architectural target.
- **Pricing pivot.** Setup fee $199 → $499. Portfolio tier ($99/mo, 5 properties) dropped — single $49/mo tier for all customers regardless of property count. Founding cohort: 50% off both for 12 months ($24.50/mo + $249.50 setup), then full $49/mo from month 13.
- **BYO Stripe under Path A** stores landlord keys encrypted in DB with a platform-level encryption key (env vars don't scale to N landlords).
- **Yellowstone Stay does NOT migrate** to the multi-tenant app — stays standalone indefinitely.

## Files produced this session

### New
- `FurnishedPortal-Product/FURNISHEDPORTAL_PHASE4_SPEC.md` — north star spec, 4-tier structure modeled on the Yellowstone tenant-workflow spec
- `FurnishedPortal-Product/PHASE4_PROGRESS.md` — cross-tier progress ledger
- `FurnishedPortal-Product/template/prisma/schema-v2-multitenant.proposal.prisma` — full Path A schema (9 new models + landlordId on every existing model)
- `FurnishedPortal-Product/phase4-tier1-proposals/README.md` — read-order index for the design package
- `FurnishedPortal-Product/phase4-tier1-proposals/middleware.ts` — subdomain routing, forwards `x-fp-subdomain` / `x-fp-custom-domain` headers, reserved-list short-circuit
- `FurnishedPortal-Product/phase4-tier1-proposals/lib/landlord-context.ts` — `resolveLandlord()` + auto-scoping Prisma client via `$extends`
- `FurnishedPortal-Product/phase4-tier1-proposals/NEXTAUTH_PIVOT.md` — auth pivot design doc (session carries landlordId, login is subdomain-scoped, cross-tenant cookie defense)
- `FurnishedPortal-Product/phase4-tier1-proposals/VERCEL_SETUP.md` — wildcard subdomain DNS instructions
- `FurnishedPortal-Product/phase4-tier1-proposals/ACCEPTANCE_TESTS.md` — 6-scenario manual e2e walk that gates Tier 1 → Tier 2

### Updated
- `FurnishedPortal-Product/CLAUDE.md` — Path A pivot banner at top, "#1 architectural rule" rewritten, deployment line updated
- `FurnishedPortal-Product/template/CLAUDE.md` — same banner + rule rewrite + tech stack updated (single shared DB, two-layer Stripe)
- `FurnishedPortal-SaaS/CLAUDE.md` — pricing locked-decisions section rewritten ($499 setup, single tier, founding 50%×12mo); added architecture-revised section
- `Projects/FurnishedPortal-Business-Brief-v2.md` — pivot banner, Section 6 pricing rewrite, Section 8 architecture rewrite, tech stack lines updated, Section 12 unit economics recalculated ($793 discount cost per Founding member, ~$19,825 program cost)
- `FurnishedPortal-SaaS/furnishedportal-www/index.html` — $199 → $499 throughout, Portfolio tier dropped from rendered cards (PRICING constant kept), Founding tiers reduced to single Host·Founding card with `gridTemplateColumns: '1fr'` layout, copy updated to "50% off monthly for 12 months + $499 setup waived"
- `Claude Code Duplex Website/memory/project_furnishedportal_phase4.md` — created earlier this session, then updated to mark all four stale-file discrepancies as resolved and to add Tier 1 design package status

## Tier 1 status

Design: COMPLETE (proposal form). Implementation: NOT STARTED — blocked on Sean's strategic call about whether to refactor `template/` in place or scaffold a new `multitenant-app/` directory (recommendation: new dir).

## Real-money / external blockers logged for Sean

1. **URGENT — recreate Stripe Payment Links at $499 setup.** HTML now says $499 but Stripe will still charge $199 until the underlying Payment Links are re-created in the dashboard.
2. Decide refactor strategy (new dir vs in-place).
3. Vercel wildcard `*.furnishedportal.com` setup + Spaceship DNS CNAME.
4. Provision `FP_ENCRYPTION_KEY` env var for BYO-Stripe DB storage.
5. Authorize schema migration to the live DB.

## Recommended next session opener

Read `phase4-tier1-proposals/README.md` for the read-order index. Confirm or override the "new multitenant-app/ directory" recommendation. Then proceed with scaffold (~15 files: package.json, tsconfig, next.config, app/layout, app/page, NextAuth config, etc.).

## Yellowstone backlog (untouched this session, deliberate)

Filed at `Duplex Website/NEXT_SESSION_TASKS.md` earlier in this conversation. Two items only: (a) Tier 3 #15 real-Stripe refund verification mini-walk, (b) Phase 6 Abacus decommission scheduled for 2026-05-16.
