# Phase 1 Completion Report — Multi-tenant Foundation

> Generated: 2026-05-12
> Branch: `phase-1-multitenant-foundation`
> Commit: `25881b2`

---

## Status

**Code: COMPLETE. Deployment: BLOCKED on 3 Sean actions (listed below).**

All code has been written, committed, and is ready to deploy once
you create the Neon project, the Vercel project, and generate the
encryption key.

---

## Acceptance test status

Tests cannot be run until the Neon DB is provisioned and the app is
deployed to Vercel. Status column will be updated after Sean's walk.

| Test | Description | Status |
|---|---|---|
| 1 | Subdomain routing | PENDING — needs Vercel deploy |
| 2 | Data isolation (cross-tenant) | PENDING |
| 3 | Auth scope (session tied to subdomain) | PENDING |
| 4 | Cross-tenant email collision | PENDING |
| 5 | Reserved-subdomain protection | PENDING |
| 6 | Subscription/billing scoping | PENDING |

---

## Files created (49 files + 2 docs updated)

### Configuration
| File | Purpose |
|---|---|
| `multitenant-app/package.json` | Dependencies |
| `multitenant-app/tsconfig.json` | TypeScript strict |
| `multitenant-app/next.config.ts` | Next.js 14 config |
| `multitenant-app/tailwind.config.ts` | Tailwind with fp-* colour tokens |
| `multitenant-app/postcss.config.js` | PostCSS |
| `multitenant-app/.env.example` | All required env vars documented |
| `multitenant-app/.gitignore` | Standard Next.js ignores + .env |

### Database
| File | Purpose |
|---|---|
| `multitenant-app/prisma/schema.prisma` | v2 multi-tenant schema — Landlord, Subscription, OnboardingResponse, User, Property, Unit, HouseRule, Amenity, LeaseTemplate + landlordId on all existing models |
| `multitenant-app/prisma/rls-policies.sql` | RLS ENABLE + `landlord_isolation` policy on 14 tables; PLATFORM sentinel for seed/webhook bypass |
| `multitenant-app/prisma/seed.ts` | Creates `acme` + `beta` landlords with 3 units, 2 FAQ categories, 3 items each, 2 tenants, 1 application each |

### Multi-tenant plumbing
| File | Purpose |
|---|---|
| `multitenant-app/middleware.ts` | Edge runtime subdomain router; strips spoofed x-fp-* headers; sets x-fp-subdomain/x-fp-custom-domain |
| `multitenant-app/lib/landlord-context.ts` | resolveLandlord(), requireLandlord(), landlordPrisma(), withLandlordContext() (RLS GUC), withPlatformContext() |
| `multitenant-app/lib/auth.ts` | NextAuth v4 — subdomain-scoped credentials, session carries landlordId + role, wildcard cookie domain |
| `multitenant-app/types/next-auth.d.ts` | Session/User/JWT type augmentation |
| `multitenant-app/lib/prisma.ts` | Singleton Prisma client |
| `multitenant-app/lib/utils.ts` | cn(), formatCurrency(), formatDate(), calculateProration() |
| `multitenant-app/lib/s3.ts` | AWS S3 helpers with per-landlord key prefix |

### App pages
| File | Route | Purpose |
|---|---|---|
| `app/layout.tsx` | All | Dynamic metadata from Landlord.brandName |
| `app/page.tsx` | / | Homepage: shows units, amenities, house rules for the subdomain's landlord. Apex domain shows platform stub. |
| `app/faq/page.tsx` | /faq | Public FAQ reader |
| `app/gallery/page.tsx` | /gallery | Public photo gallery |
| `app/not-found.tsx` | 404 | Generic not-found page |
| `app/admin/page.tsx` | /admin | Admin dashboard — guarded by session + landlordId match |
| `app/admin/faq/page.tsx` | /admin/faq | FAQ editor (client component, calls API) |
| `app/admin/applications/page.tsx` | /admin/applications | Application review |
| `app/tenant/login/page.tsx` | /tenant/login | Subdomain-scoped login form |
| `app/tenant/signup/page.tsx` | /tenant/signup | Tenant registration |
| `app/tenant/portal/page.tsx` | /tenant/portal | Tenant portal — applications + payments |

### API routes
| File | Method | Purpose |
|---|---|---|
| `app/api/auth/[...nextauth]/route.ts` | GET/POST | NextAuth handler |
| `app/api/faq/route.ts` | GET | Public FAQ data |
| `app/api/gallery/route.ts` | GET | Public gallery URLs |
| `app/api/contact/route.ts` | POST | Contact form submission |
| `app/api/signup/route.ts` | POST | Tenant self-registration |
| `app/api/admin/faq/categories/route.ts` | GET, POST | List + create FAQ categories |
| `app/api/admin/faq/categories/[id]/route.ts` | PATCH, DELETE | Update + delete FAQ categories |
| `app/api/admin/faq/items/route.ts` | POST | Create FAQ item |
| `app/api/admin/faq/items/[id]/route.ts` | PATCH, DELETE | Update + delete FAQ item |
| `app/api/admin/gallery/route.ts` | GET, POST | List + upload gallery images |
| `app/api/admin/gallery/[id]/route.ts` | PATCH, DELETE | Update + delete gallery image |
| `app/api/admin/applications/route.ts` | GET | List applications (admin) |
| `app/api/admin/applications/[id]/route.ts` | PATCH | Update application status |
| `app/api/tenant/apply/route.ts` | POST | Submit tenant application |
| `app/api/tenant/applications/route.ts` | GET | List tenant's own applications |

---

## How data isolation works (the fence)

Every customer-data query goes through `withLandlordContext(landlordId, fn)`:

1. **ORM layer** (`$extends`): every `findMany/findFirst/count/create/update/delete`
   has `{ landlordId }` injected into `where` or `data` automatically.

2. **DB layer** (RLS): the same call opens a short-lived Prisma transaction,
   runs `SET LOCAL app.landlord_id = '<landlordId>'`, then executes the query.
   The RLS policy `landlordId = current_setting('app.landlord_id', true)::text`
   enforces isolation at the Postgres level — even raw SQL is blocked.

3. **Auth guard**: every admin/tenant route checks `session.user.landlordId ===
   landlord.id`. A session cookie from acme.furnishedportal.com is rejected
   at beta.furnishedportal.com.

---

## Environment variables needed

Paste these into the Vercel project after creating it.

| Variable | Where to get it | Example |
|---|---|---|
| `DATABASE_URL` | Neon project → Connection String | `postgresql://user:pass@ep-...neon.tech/neondb?sslmode=require` |
| `NEXTAUTH_URL` | Vercel deployment URL (primary domain) | `https://acme.furnishedportal.com` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | (generate locally) |
| `FP_ENCRYPTION_KEY` | `openssl rand -base64 32` — **ESCALATION ITEM** | (generate + paste) |
| `PLATFORM_ADMIN_KEY` | `openssl rand -hex 32` | (generate locally) |
| `OPENAI_API_KEY` | OpenAI dashboard | `sk-...` |
| `RESEND_API_KEY` | Resend dashboard | `re_...` |
| `RESEND_FROM_EMAIL` | Verified sender in Resend | `noreply@furnishedportal.com` |
| `AWS_BUCKET_NAME` | S3 bucket name | `furnishedportal-media` |
| `AWS_REGION` | S3 bucket region | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS IAM user | (from IAM) |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM user | (from IAM) |

AWS/OpenAI/Resend are needed for full feature operation but NOT for the
6 acceptance tests (which only test routing, auth, and data isolation).
For the acceptance walk you only need DATABASE_URL, NEXTAUTH_URL,
NEXTAUTH_SECRET, and FP_ENCRYPTION_KEY.

---

## DB migrations to run

After Sean creates the Neon project and pastes DATABASE_URL into
`.env.local` inside `multitenant-app/`:

```powershell
# From multitenant-app/ directory
cd multitenant-app

# 1. Pause OneDrive sync before this (large package install)
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Apply schema to new Neon DB (creates all tables)
npx prisma migrate dev --name init

# 4. Apply RLS policies (run ONCE after migration)
#    Replace $DATABASE_URL with the actual connection string
psql "postgresql://..." -f prisma/rls-policies.sql

# 5. Seed test data
npx ts-node --project tsconfig.json prisma/seed.ts
```

Verify seed worked:
```
npx prisma studio
```
Should show Landlord table with 2 rows: `acme` and `beta`.

---

## Vercel settings (Sean to apply)

See also: `phase4-tier1-proposals/VERCEL_SETUP.md` for DNS + Vercel UI steps.

| Setting | Value |
|---|---|
| Project name | `furnishedportal-multitenant` |
| Root directory | `multitenant-app` |
| Framework preset | Next.js |
| Branch to deploy | `phase-1-multitenant-foundation` |
| Wildcard domain | `*.furnishedportal.com` |
| Apex redirect | `furnishedportal.com` → marketing site (leave unchanged) |

---

## What Sean still clicks (the copy-paste list)

### Step 1 — Create Neon project
1. Go to neon.tech → New Project
2. Name: `furnishedportal-multitenant`
3. Region: us-east-1 (or closest to you)
4. Copy the connection string
5. Paste it here as `DATABASE_URL` and into Vercel env vars

### Step 2 — Run migrations (terminal, from multitenant-app/)
Follow the DB migrations section above.

### Step 3 — Generate FP_ENCRYPTION_KEY
```
openssl rand -base64 32
```
Copy the output. Keep it safe — you will need it permanently.

### Step 4 — Create Vercel project
1. Vercel dashboard → Add New → Project
2. Import from Git (or upload the branch)
3. Root directory: `multitenant-app`
4. Paste all env vars from the table above
5. Deploy

### Step 5 — Attach wildcard domain
1. Vercel project → Settings → Domains
2. Add `*.furnishedportal.com`
3. Vercel shows a DNS record — add it at Spaceship (CNAME `*` → `cname.vercel-dns.com`)
4. Also confirm `acme.furnishedportal.com` and `beta.furnishedportal.com` resolve

### Step 6 — Run the acceptance walk
See `phase4-tier1-proposals/ACCEPTANCE_TESTS.md`.
Both subdomains should be live with isolated data.
Fill in the sign-off checklist and update this file.

---

## Acceptance walk sign-off

Fill this in after the Vercel deploy + acceptance walk.

- [ ] Test 1: subdomain routing
- [ ] Test 2: data isolation
- [ ] Test 3: auth scope
- [ ] Test 4: cross-tenant email collision
- [ ] Test 5: reserved-subdomain protection
- [ ] Test 6: subscription/billing scoping

**Tier 1 is done when all 6 are checked. Do not start Tier 2 until then.**
