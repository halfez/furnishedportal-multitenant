# FurnishedPortal SaaS — Multi-tenant Automation Spec

> **Status:** Drafted 2026-05-08, renamed 2026-05-12 from `FURNISHEDPORTAL_PHASE4_SPEC.md`
> to match the six-phase plan vocabulary. North star for the build that turns
> FurnishedPortal from "manual setup per customer" into a self-serve SaaS.
> Modeled after the 4-tier north star that successfully drove the Yellowstone
> tenant workflow.
>
> The "Tier 1–4" structure inside this doc maps onto the six-phase plan as
> follows: Tier 1 = Phase 1 (schema + middleware), Tier 2 = Phase 2
> (provisioning API), Tier 3 = part of Phase 6 (customer admin experience),
> Tier 4 = deferred. Phases 3–5 (security, deploy, Yellowstone migration)
> are operational steps that wrap around this spec, not separate tiers.

---

## Mission

Turn the white-label MTR template into a self-serve SaaS where:

1. A customer pays $49/mo + $499 one-time setup at furnishedportal.com
2. Fills out a 4-page onboarding questionnaire
3. Is live on a branded subdomain within minutes
4. 80%+ of the work is automated; 20% is Afshin-in-the-loop

The success criterion is **time-from-payment-to-live-site under 30 minutes** with no Afshin involvement on the happy path.

---

## Locked architectural decisions (2026-05-08)

| Decision | Answer |
|---|---|
| Multi-tenancy | **Path A** — single Next.js app, single Postgres DB, every table carries `landlordId` |
| Domain default | **Subdomain** — `acmerentals.furnishedportal.com` via Vercel wildcard |
| Custom domain | Optional **upgrade**, not v1-critical |
| Pricing | **$49/mo + $499 setup**, single tier (no Portfolio split) |
| Founding cohort | **50% off both for 12 months** ($24.50/mo + $249.50 setup), full $49/mo from month 13 |
| Stripe model | **Two layers**: Platform-Stripe (FP's account, bills the SaaS subscription); BYO-Stripe (landlord's account, collects tenant rent) |
| Yellowstone Stay | **Stays standalone**, does NOT migrate onto multi-tenant in v1 |

---

## Tier 1 — Multi-tenant foundation

The plumbing. Without this, nothing else can be built.

| # | Item | Notes |
|---|---|---|
| 1 | Schema: add `Landlord`, `Subscription`, `OnboardingResponse` tables | New tables; Subscription tracks Platform-Stripe billing state |
| 2 | Schema: add `landlordId` FK to every existing table | Property, Unit, Tenant, Application, Payment, Booking, FaqCategory, FaqItem, GalleryImage, Review |
| 3 | Subdomain middleware (`middleware.ts`) | Reads `Host` header, resolves subdomain → landlordId, attaches to request context |
| 4 | Auth pivot (NextAuth) | Session payload includes `landlordId`; admin login routes scoped to one landlord |
| 5 | Query helpers | Every Prisma call auto-filters by landlordId — service-layer wrappers, not raw Prisma |
| 6 | Vercel wildcard subdomain config | One DNS record (`*.furnishedportal.com` → Vercel) + project config flag |

**Acceptance:** A row inserted as landlord A is invisible to landlord B's session. Two test landlords can be created manually and both subdomains render correctly with isolated data.

---

## Tier 2 — Onboarding automation (the bridge)

The customer-facing automation. Payment → questionnaire → live site.

| # | Item | Notes |
|---|---|---|
| 7 | Stripe Payment Link → webhook handler | Lives in `furnishedportal-www/api/stripe-webhook.ts`; rewrites the existing webhook to create Landlord rows in the multi-tenant DB |
| 8 | Welcome email (Resend) with tokenized link | Token = signed JWT scoped to landlordId, expires in 7 days |
| 9 | Questionnaire backend | 4-page form submit → writes Property/Units/HouseRules/Branding rows tied to landlordId |
| 10 | BYO-Stripe wizard | Reuse Yellowstone's PR #6 pattern: landlord pastes their restricted key, backend validates, encrypts, stores |
| 11 | "Go live" trigger | When questionnaire complete + BYO-Stripe configured → set `landlord.status = 'live'`, send admin login email |
| 12 | Subdomain reservation collision handling | If `acme.furnishedportal.com` is taken, suggest alternatives; reserved word list (admin, www, app, api, etc.) |

**Acceptance:** A test customer pays via the live Payment Link, receives email, fills questionnaire, configures BYO Stripe, gets admin login email, and the resulting subdomain is live and accepts a tenant application. Total time under 30 minutes, zero Afshin involvement.

---

## Tier 3 — Customer admin experience

The dashboard the landlord uses post-launch. Most exists in the template — just needs landlordId scoping.

| # | Item | Notes |
|---|---|---|
| 13 | Per-landlord admin dashboard | Existing template admin (FAQ editor, gallery upload, applications view) — scope all queries to session.landlordId |
| 14 | Photo upload portal | S3 bucket prefix per landlord (`landlord/{id}/gallery/...`) |
| 15 | Lease template editor | Landlord can edit pre-filled defaults (rent escalation, late fee, jurisdiction language) |
| 16 | Profile editor | Brand name, primary color, logo, contact email |
| 17 | Subdomain change | Allow one rename per landlord (with redirect window) |

**Acceptance:** A landlord can log into their admin and change every field that the questionnaire originally populated, plus upload photos and edit FAQs.

---

## Tier 4 — Custom domain upgrade (optional, defer post-v1)

Skip this if Tier 1–3 is taking too long. Subdomain-only is a complete product.

| # | Item | Notes |
|---|---|---|
| 18 | Custom domain field on Landlord | Plus DNS verification status |
| 19 | Vercel API integration | Add custom domain to project programmatically |
| 20 | DNS-instructions email | Per-registrar guidance (Spaceship, GoDaddy, Namecheap, Cloudflare) |
| 21 | SSL provisioning | Vercel auto-handles, but UI needs to surface "issuing → ready" state |

---

## The 80/20 split (operational)

### Automated (the 80%)
- Stripe payment processing
- Landlord + Subscription row creation
- Welcome / login / receipt emails
- Subdomain provisioning
- Questionnaire-to-DB mapping
- BYO-Stripe key validation
- Default lease + FCRA template generation (with the landlord's business name template-merged)
- "Site is live" notification

### Afshin-in-the-loop (the 20%)
- Photo curation / cropping after the landlord uploads (sanity-check, optional)
- Lease template review — even with templating, jurisdiction-specific language needs eyes for the first few customers
- Custom-domain DNS hand-holding (when/if a landlord upgrades — DNS varies by registrar, ~5 min walkthrough)
- Stripe BYO walkthrough on first paste — landlord's first time pasting `sk_test_…` is 5–10 min of help
- "Go live" QA pass on the live subdomain before they invite their first applicant

---

## What this spec does NOT cover

- **Marketing site changes** beyond pricing — copy, SEO, blog, lead magnets are GTM concerns, not part of this build
- **Inbound sales / outreach automation** — separate research project (Researcher agent in FP-SaaS)
- **Yellowstone Stay migration** to the multi-tenant app — out of scope per 2026-05-08 decision
- **Tier 4 custom domains** — defer until 5+ paying customers ask for it
- **Multi-property pricing logic** — single tier covers everything; revisit only if a landlord with 50 units becomes problematic

---

## Source-of-truth files

| File | Role |
|---|---|
| **This spec** (`FURNISHEDPORTAL_SAAS_SPEC.md`) | North star; references everything below |
| `PHASE4_PROGRESS.md` | Cross-tier progress ledger, daily updated by the tracker artifact |
| `FurnishedPortal-Product/CLAUDE.md` | Technical reference for the multi-tenant Next.js app |
| `FurnishedPortal-SaaS/CLAUDE.md` | Business reference (pricing, ICP, marketing) |
| Memory `project_furnishedportal_phase4.md` | Cross-session decision record |
| `FurnishedPortal-Business-Brief-v2.md` | Long-form business overview (also updated 2026-05-08) |

---

## Sequencing recommendation

Don't try to build Tier 1–4 in parallel. Same lesson as Yellowstone's tenant workflow: build Tier 1 → walk it → Tier 2 → walk it. Each tier ends with a manual end-to-end test against a real test customer (Afshin acting as one).

Realistic timeline at the Yellowstone pace (~one tier per 2–3 sessions):
- Tier 1: 2–3 sessions
- Tier 2: 3–4 sessions
- Tier 3: 2 sessions
- Tier 4: deferred

First paying customer plausible after Tier 2 ships.
