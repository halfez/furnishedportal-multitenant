# Phase 4 — Multi-tenant SaaS automation · Progress ledger

> Pattern modeled on Yellowstone's `Duplex Website/memory/workflow_progress.md`. Updated as work moves through the tiers. Latest state always at top.

**North star spec:** [`FURNISHEDPORTAL_SAAS_SPEC.md`](FURNISHEDPORTAL_SAAS_SPEC.md)

**Architectural decisions (locked 2026-05-08):**
- Path A — single multi-tenant Next.js app, single Postgres DB
- $49/mo + $499 setup, founding cohort 50% off both for 12 months
- Subdomain default (`*.furnishedportal.com`), custom domain upgrade
- BYO Stripe (encrypted in DB) for tenant rent; Platform Stripe for SaaS billing

---

## Current state — 2026-05-09

**Landing page + Stripe billing surface: SHIPPED to live.**
**Tier 1 design package: COMPLETE (proposal form, awaiting review).**
**Tier 1 implementation: NOT STARTED.**
**Tiers 2–4: NOT STARTED.**

Last commit relevant to Phase 4: `a8fbafb` (furnishedportal-www repo) — pricing cleanup, founding 10-spot, Stripe link swap, logo, chatbot fix.

---

## Tier 1 — Multi-tenant foundation

| # | Item | Status | Artifact |
|---|---|---|---|
| 1 | Schema with `landlordId` on every table + new tables (Landlord, Subscription, OnboardingResponse, User, Property, Unit, HouseRule, Amenity, LeaseTemplate) | ✅ Designed | `template/prisma/schema-v2-multitenant.proposal.prisma` |
| 2 | Subdomain routing middleware | ✅ Designed | `phase4-tier1-proposals/middleware.ts` |
| 3 | Auto-scoped Prisma client (`landlordPrisma()` via $extends) | ✅ Designed | `phase4-tier1-proposals/lib/landlord-context.ts` |
| 4 | NextAuth pivot — session carries landlordId, login is subdomain-scoped | ✅ Designed | `phase4-tier1-proposals/NEXTAUTH_PIVOT.md` |
| 5 | Vercel wildcard `*.furnishedportal.com` | 📝 Documented (Sean to execute) | `phase4-tier1-proposals/VERCEL_SETUP.md` |
| 6 | Acceptance test plan | ✅ Designed | `phase4-tier1-proposals/ACCEPTANCE_TESTS.md` |
| 7 | Apply schema migration | ⏳ NOT STARTED | — |
| 8 | New multi-tenant app directory (sibling of `template/`) | ⏳ NOT STARTED | — |
| 9 | Component refactor — UI reads landlord from DB instead of CONFIG | ⏳ NOT STARTED | — |
| 10 | Seed script — create 2 test landlords with isolated sample data | ⏳ NOT STARTED | — |
| 11 | Tier 1 e2e acceptance walk (the 6 scenarios in ACCEPTANCE_TESTS.md) | ⏳ NOT STARTED | — |

**Tier 1 done when:** all 6 acceptance scenarios pass against a deployed multi-tenant app on `*.furnishedportal.com`.

---

## Tier 2 — Onboarding automation (the bridge)

| # | Item | Status |
|---|---|---|
| 12 | Stripe Payment Link → webhook handler creating Landlord + Subscription rows | ⏳ |
| 13 | Tokenized welcome email via Resend with link to onboarding questionnaire | ⏳ |
| 14 | Questionnaire backend — 4-page form posts to API, writes Property/Units/HouseRules/Branding rows | ⏳ |
| 15 | BYO-Stripe wizard adapted from Yellowstone PR #6 — landlord pastes restricted key, validated, encrypted, stored | ⏳ |
| 16 | "Go live" trigger — flips landlord.status = 'live', sends admin login email | ⏳ |
| 17 | Subdomain reservation collision handling (suggest alternatives, validate against reserved list) | ⏳ |

**Tier 2 done when:** a real test customer can pay → fill questionnaire → get an admin login → see a live subdomain, all in under 30 minutes with zero Afshin involvement.

---

## Tier 3 — Customer admin experience

| # | Item | Status |
|---|---|---|
| 18 | Per-landlord admin dashboard (existing template's admin, scoped to session.landlordId) | ⏳ |
| 19 | Photo upload portal (S3 prefix per landlordId) | ⏳ |
| 20 | Lease template editor (landlord can edit defaults from questionnaire) | ⏳ |
| 21 | Profile editor (brand name, primary color, logo, contact email) | ⏳ |
| 22 | Subdomain change (with redirect window) | ⏳ |

**Tier 3 done when:** a landlord can change every piece of data the questionnaire originally populated, plus upload photos and edit FAQs.

---

## Tier 4 — Custom domain upgrade (deferred)

Skip until at least 5 paying customers have asked for it.

| # | Item | Status |
|---|---|---|
| 23 | Custom domain field + DNS verification status | ⏳ |
| 24 | Vercel API integration to add custom domain to project | ⏳ |
| 25 | DNS-instructions email (per-registrar guidance) | ⏳ |
| 26 | SSL provisioning UI feedback | ⏳ |

---

## Outside-Tier follow-ups (need Sean)

These are real-money / external-system actions only Sean can do:

- [x] **Recreate Stripe Payment Links at $499 setup** — DONE 2026-05-09. New plinks: Host Monthly `28EeVe…Re05` ($49+$499), Founding Host `dRmfZi…Re07?prefilled_promo_code=FOUNDING50` ($49+$499 with 50% off both via FOUNDING50 = $24.50/mo + $249.50 setup). Old $199 plinks deactivated.
- [x] **Dropped Portfolio Stripe Payment Links** — deactivated 2026-05-09. $99/mo Portfolio Price archived.
- [ ] **Decision: refactor `template/` in place vs create new multi-tenant app dir** — recommendation is "new dir, leave `template/` as Path B reference" but this is a strategic call
- [ ] **Vercel wildcard setup** — see VERCEL_SETUP.md (Tier 1 #5)
- [ ] **Spaceship DNS CNAME** — see VERCEL_SETUP.md (Tier 1 #5)
- [ ] **Provision platform-level encryption key** for BYO Stripe — random 32-byte secret, stored in Vercel env as `FP_ENCRYPTION_KEY`

---

## Session log

| Date | Notes |
|---|---|
| 2026-05-08 | Architecture pivot Path B → Path A. Pricing pivot $199 → $499 setup, drop Portfolio tier. Tier 1 design package drafted in full (schema v2, middleware, landlord-context, NextAuth pivot plan, Vercel setup doc, acceptance tests). Live landing page updated. Business brief updated. Three FP CLAUDE.md files updated to reflect Path A. Memory file `project_furnishedportal_phase4.md` written. |
| 2026-05-09 | Landing page cleanup + Stripe reconciliation. Removed dead Portfolio code from `index.html`, narrowed founding cohort 25→10 spots, replaced placeholder Logo with real house-icon SVG. Stripe-side: deleted/recreated FOUNDING50 coupon and promo code at max=10; created new Host Monthly ($49+$499) and Founding Host ($49+$499 with FOUNDING50 prefilled = $24.50/mo+$249.50 setup) plinks; deactivated 4 old plinks; archived old $199 setup price and $99/mo portfolio price. Removed phantom "$1,499 done-for-you" tier from chatbot system prompt. Pushed commit `a8fbafb` to live (Vercel auto-deploy). Numbers verified at Stripe checkout. Open: prefilled_promo_code reliability unverified; Stripe checkout shows "Genie Rents" merchant name (cosmetic). |
