# Phase 4 Session 2 — Production database setup
**Date:** 2026-05-15  
**Branch:** phase-1-multitenant-foundation (7 commits ahead of origin)

---

## What was done

### Pre-condition
Afshin created a new Neon Postgres project named `furnishedportal-product-prod` and pasted the pooled + direct connection strings into `multitenant-app/.env.production.local`. The file was initially empty and then had quoted URL values — both issues were resolved before proceeding.

**Production DB host:** `ep-broad-heart-aksyj5lv.c-3.us-west-2.aws.neon.tech`  
(Separate Neon project from Yellowstone — confirmed different host.)

### Step 1: Gitignore confirmed
`multitenant-app/.gitignore` line 16 already covers `.env.production.local` via the `.env*.local` pattern. `git check-ignore` returned exit 0.

### Step 2: Connection strings validated
- `DATABASE_URL`: contains `-pooler` ✓, `sslmode=require` ✓  
- `DIRECT_DATABASE_URL`: no `-pooler` ✓, `sslmode=require` ✓  
- Connectivity check (`SELECT 1` via `prisma db execute --url DIRECT_DATABASE_URL`): **passed**

**Note:** The `.env.production.local` had URLs wrapped in quotes (`"postgresql://..."`). Prisma doesn't strip these automatically, causing `P1013: scheme not recognized` on first attempt. Fixed by stripping quotes when loading env vars in PowerShell.

### Step 3: Prisma migrations applied
Ran `npx prisma migrate deploy` from `multitenant-app/` with prod env vars loaded.

```
3 migrations found in prisma/migrations

Applying migration `20260513064614_init`
Applying migration `20260513125104_add_landlord_go_live_at`
Applying migration `20260514071827_add_payment_model`

All migrations have been successfully applied.
```

`prisma migrate status` confirmed: **Database schema is up to date!**

All tables created: Landlord, Tenant, Application, Payment, Unit, GalleryImage, FaqCategory, FaqItem, Property, HouseRule, Amenity, LeaseTemplate, ContactSubmission, Booking, User, Subscription, OnboardingResponse, plus Prisma internals.

### Step 4: RLS policies applied
No `psql` installed on Windows — used the Prisma 6 fallback:
```
npx prisma db execute --url DIRECT_DATABASE_URL --file prisma/rls-policies.sql
Exit code: 0 — Script executed successfully.
```

The SQL enables `ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` on all 14 customer-data tables (Tenant, Application, Payment, GalleryImage, FaqCategory, Booking, Unit, Property, HouseRule, Amenity, LeaseTemplate, ContactSubmission, User, Subscription, OnboardingResponse).  
Each table gets a `landlord_isolation` policy with a `PLATFORM` bypass sentinel.  
Script is idempotent (DROP POLICY IF EXISTS before CREATE).

> **Note:** Prisma 6 `db execute` does not return SELECT query results — it's a DDL execution tool only. RLS enablement confirmed via script exit code 0 + direct inspection of `rls-policies.sql`.

### Step 5: Production secrets generated
Three cryptographically random 32-byte base64 secrets generated via `System.Security.Cryptography.RandomNumberGenerator`. **Shown to Afshin in terminal. Not committed anywhere.**

- `NEXTAUTH_SECRET` — NextAuth JWT signing key
- `FP_ENCRYPTION_KEY` — AES-256-GCM key for encrypting per-landlord Stripe Connect tokens at rest
- `PLATFORM_ADMIN_KEY` — platform-admin access key

All three were appended to `multitenant-app/.env.production.local` (gitignored).

### Step 6: Remaining env vars surfaced
Keys that still need real values before Session 3:

| Key | Status | Action |
|-----|--------|--------|
| `STRIPE_SECRET_KEY` | Local .env has **test key** (`sk_test_...`) | Grab live key from dashboard.stripe.com → Developers → API Keys |
| `RESEND_API_KEY` | Local .env has placeholder | Copy real key from resend.com → API Keys |
| `OPENAI_API_KEY` | Not in local .env at all | Get from platform.openai.com → API Keys |
| `STRIPE_FP_WEBHOOK_SECRET` | Placeholder | Will be created in Session 3 when webhook endpoint is registered |
| `BLOB_READ_WRITE_TOKEN` | Not present | Will be auto-created in Session 3 when Vercel Blob store is provisioned |
| `NEXTAUTH_URL` | `http://localhost:3000` | Will be set to Vercel production URL in Session 3 |

### Step 7: Env-var manifest output
Full manifest printed to terminal for Session 3 Vercel paste. See Notion Build Log for the template.

---

## Files changed
- `multitenant-app/.env.production.local` — created (Afshin) + secrets appended (this session). **Gitignored.**

---

## Git status at session end
No new commits — `.env.production.local` is gitignored and should never be committed.

---

## Next session
**Phase 4, Session 3 — Vercel project creation + first deploy**
- Create the Vercel project (project #2) connected to this repo
- Add the env vars from the manifest above (filling in Stripe live key, Resend key, OpenAI key first)
- Provision Vercel Blob store → auto-generates `BLOB_READ_WRITE_TOKEN`
- Configure Stripe webhook for production URL → generates `STRIPE_FP_WEBHOOK_SECRET`
- Move `*.furnishedportal.com` wildcard DNS from the marketing site Vercel project to this one
- Trigger first production deploy, verify all 46 routes compile
