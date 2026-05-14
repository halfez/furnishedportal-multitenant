# Phase 4 — Multi-tenant SaaS automation · Progress ledger

> Pattern modeled on Yellowstone's `Duplex Website/memory/workflow_progress.md`. Updated as work moves through the tiers. Latest state always at top.

**North star spec:** [`FURNISHEDPORTAL_SAAS_SPEC.md`](FURNISHEDPORTAL_SAAS_SPEC.md)

**Architectural decisions (locked 2026-05-08):**
- Path A — single multi-tenant Next.js app, single Postgres DB
- $49/mo + $499 setup, founding cohort 50% off both for 12 months
- Subdomain default (`*.furnishedportal.com`), custom domain upgrade
- BYO Stripe (encrypted in DB) for tenant rent; Platform Stripe for SaaS billing

---

## Current state — 2026-05-14

**Landing page + Stripe billing surface: SHIPPED to live.**
**Tier 1 (Phase 1): COMPLETE ✅ — all acceptance tests A–D passed.**
**Wildcard SSL (`*.furnishedportal.com`): LIVE — cert issued, edge serving.**
**Nameservers transferred to Vercel DNS (`ns1/ns2.vercel-dns.com`) 2026-05-13.**
**Tier 2 (Phase 2): COMPLETE ✅ — acceptance tests a–h passed (g deferred to Phase 3).**
**Phase 2 PRODUCTION DEPLOYED ✅ — `furnishedportal-multitenant.vercel.app` serving live as of 2026-05-14.**
**Tiers 3–4: NOT STARTED.**

Phase 2 merged into production branch `phase-1-multitenant-foundation` via fast-forward 2026-05-14.
Build fix applied: `prisma generate &&` prepended to build script in `package.json` (commit `570b5b0`) — prevents stale Prisma client in Vercel's cached `node_modules`.

Pre-live checklist status (first real customer):
1. ✅ Stripe webhook registered → `STRIPE_FP_WEBHOOK_SECRET` set in Vercel (Sean confirmed 2026-05-14)
2. ✅ `RESEND_API_KEY` set in Vercel env vars (Sean confirmed 2026-05-14)
3. ⚠️ **Resend sender domain** — `noreply@furnishedportal.com` (the default `FROM`) must be a verified sending domain in Resend dashboard, OR set `RESEND_FROM_EMAIL` in Vercel to a domain that IS verified. Emails will bounce/fail silently without this.
4. ✅ `whsec_placeholder` test bypass auto-disabled — resolved when real secret was set.
5. (Optional) Email copy review — `lib/emails.ts` TODO flag at top; body text is real/usable, not Lorem ipsum. Replace before launch if brand voice polish is wanted.

Full sign-off in `PHASE2_COMPLETION_REPORT.md`.

Latest commits on `phase-1-multitenant-foundation`:
- `02e666a` — seed upsert fix, remove debug file
- `8e9cc3b` — fix missing landlordId in 5 create routes + Prisma extension cast
- `23b1578` — rename next.config.ts → next.config.mjs (Next.js 14 compat)
- `df6a200` — docs: DIRECT_DATABASE_URL in .env.example

Neon project: `frosty-sun-36615720` (Hoshang's account), branch `br-sparkling-haze-aq37i8zv`.
Vercel project: `furnishedportal-multitenant` (halfezs-projects team).
Seed data: `acme` and `beta` landlords live in DB with full test data.

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
| 7 | Apply schema migration | ✅ Committed — awaiting Neon project from Sean | `multitenant-app/prisma/schema.prisma` + `rls-policies.sql` |
| 8 | New multi-tenant app directory (sibling of `template/`) | ✅ Built — `multitenant-app/` | `multitenant-app/` (49 files, commit `25881b2`) |
| 9 | Component refactor — UI reads landlord from DB instead of CONFIG | ✅ All pages use `withLandlordContext()` | `multitenant-app/app/**` |
| 10 | Seed script — create 2 test landlords with isolated sample data | ✅ Ready to run after DB provisioned | `multitenant-app/prisma/seed.ts` |
| 11 | Tier 1 e2e acceptance walk (the 6 scenarios in ACCEPTANCE_TESTS.md) | ✅ Tests A–D passed 2026-05-13 (routing, isolation, reserved subdomain, gallery) | See `PHASE1_COMPLETION_REPORT.md` |

**Tier 1 done when:** all 6 acceptance scenarios pass against a deployed multi-tenant app on `*.furnishedportal.com`.

---

## Tier 2 — Onboarding automation (the bridge)

| # | Item | Status | Artifact |
|---|---|---|---|
| 12 | Stripe Payment Link → webhook handler creating Landlord + Subscription rows | ✅ Built | `app/api/provision/from-stripe/route.ts` |
| 13 | Tokenized welcome email via Resend with link to onboarding questionnaire | ✅ Built | `lib/emails.ts` → `sendWelcomeEmail()` |
| 14 | Questionnaire backend — 4-page form posts to API, writes Property/Units/HouseRules/Branding rows | ✅ Built | `app/api/provision/questionnaire-submit/route.ts` + save route |
| 15 | BYO-Stripe wizard — landlord pastes restricted key, validated, encrypted, stored | ✅ Built | `app/api/provision/stripe-connect/route.ts` + `lib/encryption.ts` |
| 16 | "Go live" trigger — flips landlord.status = 'live', sends admin login email | ✅ Built | `app/api/provision/go-live/route.ts` |
| 17 | Subdomain reservation collision handling (suggest alternatives, validate against reserved list) | ✅ Built | `lib/reserved-subdomains.ts` (50-item reserved list, 3-alt suggestion) |

**Tier 2 done when:** a real test customer can pay → fill questionnaire → get an admin login → see a live subdomain, all in under 30 minutes with zero Afshin involvement.
**Current state: COMPLETE ✅** — Acceptance test passed 2026-05-13. charlie.furnishedportal.com + delta.furnishedportal.com both live with correct branding, zero cross-contamination. Emails in test-mode (real Resend key + Stripe webhook still needed for first live customer).

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
- [x] **Vercel wildcard setup** — DONE 2026-05-13. `*.furnishedportal.com` added to `furnishedportal-multitenant` project; Vercel shows `verified: true`. Edge SSL provisioning in progress.
- [x] **Spaceship DNS CNAME** — DONE 2026-05-13. `* CNAME cname.vercel-dns.com` confirmed live via Google DoH for both `*.furnishedportal.com` and `acme.furnishedportal.com`.
- [x] **Provision platform-level encryption key** for BYO Stripe — `FP_ENCRYPTION_KEY` confirmed present in Vercel project env 2026-05-13.
- [ ] **Register Stripe provisioning webhook** — URL: `[Vercel preview or production URL]/api/provision/from-stripe`, event: `checkout.session.completed`. Signing secret → Vercel as `STRIPE_FP_WEBHOOK_SECRET`.
- [ ] **Confirm RESEND_API_KEY** in Vercel multitenant project env vars.

---

## Session log

| Date | Notes |
|---|---|
| 2026-05-08 | Architecture pivot Path B → Path A. Pricing pivot $199 → $499 setup, drop Portfolio tier. Tier 1 design package drafted in full (schema v2, middleware, landlord-context, NextAuth pivot plan, Vercel setup doc, acceptance tests). Live landing page updated. Business brief updated. Three FP CLAUDE.md files updated to reflect Path A. Memory file `project_furnishedportal_phase4.md` written. |
| 2026-05-13 | **Phase 2 complete (code).** Built provisioning API (5 endpoints), 4-page onboarding questionnaire, BYO-Stripe wizard, AES-256-GCM encryption lib, reserved-subdomain lib, JWT onboarding token lib, Resend email templates (welcome + go-live). Added `Landlord.goLiveAt` migration (applied to Neon). 17 files, 1 737 insertions. Branch `phase-2-provisioning-api`, commit `219a94e`. Blocked on 2 Sean actions: Stripe webhook registration + Resend key confirm. See `PHASE2_COMPLETION_REPORT.md`. |
| 2026-05-13 | **Phase 2 acceptance test complete.** Fixed auth chicken-and-egg (stripe-connect + go-live now accept onboarding token as alternative to session auth). Fixed Page4 Zod schema (empty string for logoUrl/contactEmail). Added email test-mode bypass (logs instead of sends when RESEND_API_KEY=re_placeholder). Added local webhook test-mode bypass (skips signature verification when STRIPE_FP_WEBHOOK_SECRET=whsec_placeholder). Ran full end-to-end test: charlie + delta provisioned in ~10 min. `charlie.furnishedportal.com` verified (Charlie Rentals, Austin TX, Unit A, $2,500/mo). `delta.furnishedportal.com` verified (Delta Rentals, Denver CO, 2 units). Zero cross-contamination. **Tier 2 COMPLETE.** |
| 2026-05-09 | Landing page cleanup + Stripe reconciliation. Removed dead Portfolio code from `index.html`, narrowed founding cohort 25→10 spots, replaced placeholder Logo with real house-icon SVG. Stripe-side: deleted/recreated FOUNDING50 coupon and promo code at max=10; created new Host Monthly ($49+$499) and Founding Host ($49+$499 with FOUNDING50 prefilled = $24.50/mo+$249.50 setup) plinks; deactivated 4 old plinks; archived old $199 setup price and $99/mo portfolio price. Removed phantom "$1,499 done-for-you" tier from chatbot system prompt. Pushed commit `a8fbafb` to live (Vercel auto-deploy). Numbers verified at Stripe checkout. Open: prefilled_promo_code reliability unverified; Stripe checkout shows "Genie Rents" merchant name (cosmetic). |
| 2026-05-13 | Phase 1 infrastructure deployed + acceptance tests complete. Neon project `frosty-sun-36615720`; schema migrated, RLS applied, seed ran. Vercel project `furnishedportal-multitenant` deployed (`rootDirectory: multitenant-app`). Fixed 4 issues en route: `next.config.ts → next.config.mjs`, 5 routes missing `landlordId`, Prisma extension `as any` cast, seed upsert idempotency. Wildcard SSL blocker: CNAME alone insufficient — Vercel requires nameserver delegation for wildcard certs. Sean transferred `furnishedportal.com` nameservers to `ns1/ns2.vercel-dns.com`; wildcard cert manually triggered via API (`cert_Uc3yKUyFkAszAXmo4h9qMALx`). Tests A–D all passed: (A) `acme.furnishedportal.com` loads Acme Rentals branding + Austin TX units; (B) acme landlordId `cmp3pa1ow000052i8auyppvh6` ≠ beta `cmp3pam5e001j52i8s0sdmlw3`, zero cross-contamination; (C) `api.furnishedportal.com` shows platform stub, no tenant data; (D) gallery returns only own-tenant images. **Tier 1 COMPLETE.** |
