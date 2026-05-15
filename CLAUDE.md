# FurnishedPortal Product — White-Label MTR Portal

> **Architecture: Path A multi-tenant (locked 2026-05-08).** One Next.js
> app, one Vercel project, one Postgres DB. Every customer-data table is
> keyed by `landlordId`. Customers are reachable at their own subdomain
> under `*.furnishedportal.com`. The earlier Path B model (one Vercel
> project per client, `template/config/property.ts` as the only file
> that changed) was retired and the Path B starter codebase has been
> moved to `_archive/template-path-b/`.

## What this project is

The **software product** that paying customers receive — a single
multi-tenant Next.js app that serves every customer from one Vercel
deployment and one Postgres database. Each customer is reachable at
`<slug>.furnishedportal.com`. Custom domain is an upgrade.

This project is **NOT** the FurnishedPortal SaaS business. The marketing
site (`furnishedportal.com`), Stripe billing for the SaaS subscription,
and customer acquisition live in a separate Claude project named
**"FurnishedPortal SaaS"**. Never mix the two.

## Folder layout

The active codebase is `multitenant-app/`. Everything else at the root is
either project memory, archived code, or workspace tooling.

| Path | Purpose |
|---|---|
| `multitenant-app/` | **Active Next.js codebase.** Path A multi-tenant build. All current work happens here. |
| `_archive/template-path-b/` | Archived Path B starter codebase (do not edit; kept for reference). |
| `phase4-tier1-proposals/` | Phase 4 planning documents. |
| `scripts/` | Workspace-level tooling (legacy `generate-client.js` from Path B; review before reusing). |
| `start-dev.bat` | Launch the dev server (Windows). |
| `memory/` | Persistent project memory (file-based, auto-loaded). |
| `progress/` | Per-session log files (`save` skill writes here). |
| `.claude/skills/` | Project-specific skills: `save`, `recall`. |
| `FURNISHEDPORTAL_SAAS_SPEC.md` | Phase 0 audit / spec. |
| `PHASE*_COMPLETION_REPORT.md` | Phase close-out notes. |
| `PHASE4_PROGRESS.md` | Phase 4 working log. |

## The #1 architectural rule

**Multi-tenant single deployment. Every client-specific value lives in
the shared database, keyed by `landlordId`.**

- One Next.js app, one Vercel project, one Postgres DB serve every customer.
- Every customer-data table carries a `landlordId` foreign key.
- A landlord's brand, units, rents, fees, lease terms, chatbot greeting,
  reviews, and FAQs are DB rows tied to their landlord record — NOT
  compiled into the bundle.
- Middleware reads the request `Host` header. Subdomain
  `acmerentals.furnishedportal.com` resolves to a landlord row; the
  resulting `landlordId` is forwarded through every query.
- Postgres Row-Level Security (`prisma/rls-policies.sql`) is the
  defense-in-depth layer below application code.

Onboarding flow (built in Phases 1–3, deploy pending in Phase 4):
1. Customer pays $49/mo + $499 setup at `furnishedportal.com` (FP Business)
2. Stripe webhook + provisioning API create Landlord + Subscription rows
3. Tokenized email links them to the onboarding questionnaire
4. Questionnaire submit writes Property/Units/HouseRules/Branding rows tied to that `landlordId`
5. Subdomain is live immediately (Vercel wildcard `*.furnishedportal.com` — single DNS record covers all subdomains)

Custom domains are an upgrade — Vercel supports multiple custom domains
pointing at one app, so an upgraded landlord can serve at both
`acmerentals.com` and the subdomain simultaneously.

## Tech stack (multitenant-app/)

- **Framework**: Next.js 14.2.28 (App Router), TypeScript, Tailwind CSS
- **Database**: Neon Postgres via Prisma 6.7 (with Row-Level Security)
- **Auth**: NextAuth.js v4 (credentials provider) — for landlords and tenants logging into their portal
- **SaaS payments (FP Business collects)**: Stripe Billing — handled by the FP Business marketing site, not this codebase
- **Tenant payments (landlord collects rent)**: Stripe Connect — each landlord links their own Stripe via OAuth at runtime through the admin portal
- **Email**: Resend (`furnishedportal.com` sender domain verified)
- **Chatbot**: OpenAI
- **File storage**: Vercel Blob (gallery images)
- **Deployment**: Vercel — single multi-tenant deployment, subdomain routing via `middleware.ts`
- **DNS**: Spaceship registrar (wildcard `*.furnishedportal.com` pre-positioned)

## Key files (all under `multitenant-app/`)

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | DB models keyed by `landlordId` |
| `prisma/rls-policies.sql` | Postgres Row-Level Security policies (defense in depth) |
| `middleware.ts` | Reads Host header, classifies subdomain vs custom domain |
| `lib/landlord-context.ts` | Resolves Host → `landlordId` (server-side, post-middleware) |
| `app/api/provisioning/` | Provisioning API (Stripe webhook + questionnaire intake) |
| `app/admin/` | Landlord-facing admin portal (gallery, lease, profile, settings) |
| `app/api/stripe/` | Tenant-rent Stripe Connect flows |
| `.env` / `.env.example` | Required environment variables |

## Environment variables (multitenant-app/)

- `DATABASE_URL`, `DIRECT_DATABASE_URL` — Neon Postgres (pooled + direct)
- `NEXTAUTH_URL` — full URL of the deployed app (currently localhost for dev)
- `NEXTAUTH_SECRET` — `openssl rand -base64 32`
- `FP_ENCRYPTION_KEY` — encrypts per-landlord Stripe Connect tokens at rest
- `PLATFORM_ADMIN_KEY` — platform-admin (FurnishedPortal-side) access
- `STRIPE_SECRET_KEY` — FurnishedPortal's own Stripe (for Connect OAuth + SaaS billing handoff)
- `STRIPE_FP_WEBHOOK_SECRET` — Stripe webhook signing secret
- `RESEND_API_KEY` — transactional email
- *(OpenAI + Vercel Blob keys to be confirmed in env audit)*

## Roadmap (from Notion Project Overview)

Phase 1 (multi-tenant foundation) — **done**
Phase 2 (provisioning API + onboarding questionnaire + BYO-Stripe wizard) — **done**
Phase 3 (admin tools: gallery, profile, lease, settings + Vercel Blob) — **done**
Tier 2.5 (tenant rent collection end-to-end) — **done 2026-05-14**
Tier 3 (admin dashboard) — **done 2026-05-14**

Phase 4 (deploy as Vercel project #2, attach `*.furnishedportal.com`, cross-tenant smoke test) — **next, launch-gating**
Phase 5 (migrate Yellowstone in as `landlordId = 1`, point `yellowstone2.com` at FP Product) — depends on Phase 4 stable for a week
Phase 6 (open public onboarding form, hand-walk customers 1–3, then self-serve) — depends on Phase 5

## Working with Afshin

- He is **non-technical**. Use plain language; explain the "why" behind decisions.
- Never assume coding background.
- All landlord-specific values live in the shared database, keyed by `landlordId`. Never hardcode property names, addresses, phone numbers, emails, fees, or brand names anywhere in the bundle.
- The Tech Coach foundation pages in Notion (Tech Stack & Architecture, Setup & Environment Map, Build Log, Known Issues & Tech Debt, Rollback Runbook, Cross-Agent Briefs (Technical)) are the canonical technical source of truth. CLAUDE.md is the in-repo quick-orientation doc.
