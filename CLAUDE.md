# FurnishedPortal Product — White-Label MTR Portal

> **ARCHITECTURE PIVOT 2026-05-08 — Path B → Path A.** This document was
> written under the original Path B architecture (one Vercel project per
> client, one DB per client, `template/config/property.ts` as the only
> file that changes). That model has been retired in favor of Path A:
> a single multi-tenant Next.js app, one shared Postgres DB, every table
> keyed by `landlordId`, customers get subdomains under
> `*.furnishedportal.com`. Sections below that still describe Path B
> ("one project per client", "config/property.ts is the only file") are
> stale and being reworked. Phase 4 is the build of the multi-tenant
> automation layer. New work follows Path A.

## What this project is

This is the **software product** that paying customers receive. Under
Path A (locked 2026-05-08), it's a single multi-tenant Next.js app that
serves every customer from one Vercel deployment and one Postgres DB,
with each customer reachable at their own subdomain
(e.g. `acmerentals.furnishedportal.com`). The existing `template/`
codebase is the starting point — components, schema, and business logic
carry over; the architectural rules around per-client deployment do not.

This project is **NOT** the FurnishedPortal SaaS business. The marketing site,
Stripe billing for the SaaS subscription, and customer acquisition all live in a
separate Claude project named **"FurnishedPortal SaaS"**. Never mix the two.

## Folder layout

The Next.js codebase lives inside a `template/` subfolder at the project root,
not directly at the root. So when this document refers to `config/property.ts`,
the actual path is `template/config/property.ts`. Same for every code path
mentioned below — prefix with `template/`.

| Path | Purpose |
|---|---|
| `template/` | The Next.js codebase (everything `app/`, `components/`, `prisma/`, etc.) |
| `scripts/` | Workspace-level client-generator tooling (`generate-client.js`, `test-generator.js`) |
| `start-dev.bat` | Launch the dev server |
| `memory/` | Persistent project memory |
| `progress/` | Per-session log files (`save` skill writes here) |
| `.claude/skills/` | `save`, `recall` |

> **Future cleanup option**: flatten `template/` contents up to the project
> root and delete the empty `template/` folder. Cleaner long-term, but requires
> moving ~50k files (mostly `node_modules/`). Defer until you're regenerating
> `node_modules/` anyway.

---

## The #1 architectural rule (revised 2026-05-08)

**Multi-tenant single deployment. Every client-specific value lives in
the shared database, keyed by `landlordId`.**

The previous Path B rule ("config/property.ts is the only file that
changes per client") was abandoned 2026-05-08. Under Path A:

- One Next.js app, one Vercel project, one Postgres DB serve every customer
- Every table carries a `landlordId` foreign key
- A landlord's brand, units, rents, fees, lease terms, chatbot greeting,
  reviews, and FAQs are DB rows tied to their landlord record — NOT
  compiled into the bundle
- Middleware reads the request `Host` header. Subdomain
  `acmerentals.furnishedportal.com` resolves to a landlord row; the
  resulting `landlordId` is forwarded through every query

Onboarding flow (built in Phase 4):
1. Customer pays $49/mo + $499 setup at furnishedportal.com
2. Stripe webhook creates Landlord + Subscription rows
3. Tokenized email links them to the onboarding questionnaire
4. Questionnaire submit writes Property/Units/HouseRules/Branding rows tied to that landlordId
5. Subdomain is live immediately (Vercel wildcard `*.furnishedportal.com` — single DNS record covers all subdomains)

Custom domains are an upgrade — Vercel allows multiple custom domains
pointing at one app, so an upgraded landlord can serve at
`acmerentals.com` and the subdomain simultaneously.

## Tech stack

- **Framework**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Database**: PostgreSQL via Prisma ORM (Supabase or Neon)
- **Auth**: NextAuth.js v4 (credentials provider) — for **tenants** logging into their portal (NOT for FurnishedPortal SaaS hosts)
- **Payments**: Stripe — collecting **tenant rent** on behalf of the deployed client. Each client uses their **own** Stripe account so rent flows to their bank.
- **Email**: Resend (legacy: Abacus.AI — being migrated)
- **Chatbot**: OpenAI (legacy: Abacus.AI — being migrated)
- **File storage**: AWS S3 (gallery images)
- **Deployment**: Vercel (single multi-tenant deployment serving all landlords via subdomain routing)

## Key files (all paths relative to project root, so prefix with `template/`)

| File | Purpose |
|---|---|
| `template/config/property.ts` | **The only file to edit per client.** All brand, owner, unit, lease, and chatbot config. |
| `template/prisma/schema.prisma` | DB models: Tenant, Application, Payment, Booking, FaqCategory, FaqItem, GalleryImage |
| `template/app/api/tenant/apply/route.ts` | Rental applications — generates lease, sends email, stores in DB |
| `template/app/api/chatbot/route.ts` | AI chatbot — calls OpenAI, forwards unanswered questions |
| `template/app/api/stripe/` | **Tenant rent** Stripe checkout + webhook (NOT FurnishedPortal SaaS billing) |
| `template/lib/contract-template.ts` | Generates the HTML lease contract from application data + CONFIG |
| `template/scripts/seed.ts` | Seeds the DB with FAQs, sample booking, test admin |
| `template/.env.example` | Required environment variables |
| `scripts/generate-client.js` | Workspace-level tooling to spin up a new per-client deployment |

## Environment variables (per-client)

Copy `.env.example` to `.env` and fill in. The Stripe vars below are the
**client's own** Stripe creds — not FurnishedPortal's.

- `DATABASE_URL` — Postgres (Supabase, Neon, etc.)
- `NEXTAUTH_URL` — full URL of the deployed client site
- `NEXTAUTH_SECRET` — `openssl rand -base64 32`
- `ADMIN_KEY` — admin panel password
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` — **client's** Stripe creds
- `OPENAI_API_KEY`, `RESEND_API_KEY`
- `AWS_BUCKET_NAME`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` — for gallery uploads

## Legacy migrations in progress (Abacus.AI → modern providers)

| Feature | Current (legacy) | Replace with |
|---|---|---|
| AI Chatbot | Abacus.AI completions | OpenAI (`gpt-4o-mini`) |
| PDF generation | Abacus.AI HTML-to-PDF | A Node PDF library |
| Email notifications | Abacus.AI sendNotificationEmail | Resend |

Do not add new Abacus.AI dependencies.

## Roadmap

- [ ] Replace Abacus.AI chatbot with OpenAI
- [ ] Replace Abacus.AI PDF generation
- [ ] Replace Abacus.AI email with Resend throughout
- [ ] E-signature audit trail: IP + timestamp at sign, PDF copy emailed to both parties at submission
- [ ] Reviews system: DB model + post-stay request flow + public display
- [ ] **Deployment checklist**: under-30-min spin-up doc (Vercel, DB, domain, Stripe, env)
- [ ] **Client intake form**: plain-language form that fills `config/property.ts`
- [ ] **Client welcome package**: PDF with site URL, admin login, admin guide
- [ ] AI-assisted prospecting: Claude in Chrome to source FF / FB MTR host contacts

## Working with Afshin

- He is **non-technical**. Use plain language; explain the "why" behind decisions.
- Never assume coding background.
- All client-specific values come from `CONFIG` imported from `@/config/property`.
- Never hardcode property names, addresses, phone numbers, emails, fees, brand names.
- `RENT_MAP` is always derived: `Object.fromEntries(CONFIG.units.map(u => [u.id, u.monthlyRent]))`.
