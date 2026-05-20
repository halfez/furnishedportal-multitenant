# Phase 4 Session 3 — Deploy to Production
**Date:** 2026-05-16  
**Branch:** phase-1-multitenant-foundation (now 9 commits ahead of origin at session start; all pushed by end)

---

## What was done

### Step 1: Pre-flight env audit
Read `multitenant-app/.env.production.local`. Found and fixed two issues before proceeding:
- `DATABASE_URL` and `DIRECT_DATABASE_URL` were wrapped in quotes (same `P1013` issue from Session 2) — stripped automatically.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` was missing — Afshin added `pk_live_51...`.

Final audit result: all 8 required keys present and correctly prefixed.
- `DATABASE_URL` — no quotes, prod endpoint `ep-broad-heart-aksyj5lv` ✅
- `DIRECT_DATABASE_URL` — no quotes, prod endpoint ✅
- `STRIPE_SECRET_KEY` — `sk_live_51...` ✅
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — `pk_live_51...` ✅
- `OPENAI_API_KEY` — `sk-proj-...` ✅
- `NEXTAUTH_SECRET` — 44 chars ✅
- `FP_ENCRYPTION_KEY` — 44 chars ✅
- `PLATFORM_ADMIN_KEY` — 44 chars ✅

### Step 2: Stripe webhook confirmed
`STRIPE_FP_WEBHOOK_SECRET` confirmed present in Vercel (Afshin confirmed). Webhook "creative-finesse" already registered.

### Step 3: Added 4 Vercel env vars (Production scope)
Via Vercel dashboard → Settings → Environment Variables:
- `STRIPE_SECRET_KEY` — live key, Production only
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — live key, Production + Preview
- `OPENAI_API_KEY` — Production + Preview
- `NEXT_PUBLIC_APP_URL` — `https://furnishedportal.com`, Production + Preview

### Step 4: Swapped DATABASE_URL + DIRECT_DATABASE_URL in Vercel
Replaced dev DB connection strings (pointing at `frosty-sun-36615720`) with prod DB strings (pointing at `ep-broad-heart-aksyj5lv.c-3.us-west-2.aws.neon.tech`). Production scope only — Preview left pointing at dev DB.

Afshin confirmed before clicking Save. Site will show platform stub on all subdomains until first real landlord is provisioned (correct empty-production state).

### Step 5: NEXTAUTH_URL confirmed
Discovered via Vercel API (browser-authenticated): all "missing" vars (NEXTAUTH_URL, NEXTAUTH_SECRET, FP_ENCRYPTION_KEY, PLATFORM_ADMIN_KEY) were actually present in Vercel for preview+production scope — they just weren't visible in the paginated UI to the Chrome agent. Confirmed via `ENV_CONFLICT` response when attempting to add them.

`NEXTAUTH_URL` = `https://furnishedportal-multitenant.vercel.app` ✅

### Step 6: Pushed commits to origin
Committed one previously untracked file (`progress/2026-05-15_phase4-session2.md`) then pushed all commits:

```
7645a56  docs: Phase 4 Session 2 progress log (2026-05-15)
57c70fa  docs: Phase 4 Session 1 progress log (2026-05-15)
142c2a2  test: add cross-tenant isolation smoke test
7acd243  chore: stop tracking archive submodule, gitignore _archive/
c44586e  feat: tenant rent collection — Stripe Connect payment flow (Tier 2.5)
6af21b3  docs: add tier 2.5 planning prompts and session progress logs
f53c87e  docs: rewrite root CLAUDE.md for post-pivot Path A reality
655845b  archive: move deprecated Path B template to _archive/template-path-b
```

### Step 7: Build failed — TypeScript error diagnosed and fixed

**First build** (`dpl_EgmzLJZbreDLMwAPpsnDE1ac7uW8`): ERROR — `lint_or_type_error`.

Root cause: `scripts/smoke-test-cross-tenant.ts` (created in Session 1) was being picked up by Next.js's TypeScript checker. The Prisma `$extends` callback on line 34 had a type signature that didn't match the exact `DynamicQueryExtensionCb` generic. The scripts directory is a utility runner, not part of the app.

Fix: Added `"scripts"` to the `exclude` array in `multitenant-app/tsconfig.json`.

Verified locally: `npm run build` → exit code 0, all routes compiled cleanly.

Committed `d2b0fef` and pushed. **Second build** (`dpl_9j5aaxzkAU5gAqUt1edBiUSUSF`): **READY ✅**

### Step 8: Smoke check — PASSED ✅

- `https://furnishedportal-multitenant.vercel.app/` → Platform stub ("FurnishedPortal / Furnished midterm rentals. Find your next home.") — correct, prod DB empty
- `https://randomtestslug99.furnishedportal.com/` → Same platform stub — correct, subdomain not in DB

No 500 errors. Middleware running. Prod DB confirmed empty (correct state).

---

## Commits in this session

| Commit | Message |
|--------|---------|
| `7645a56` | docs: Phase 4 Session 2 progress log |
| `d2b0fef` | fix: exclude scripts/ from tsconfig to prevent smoke-test Prisma type error in build |

---

## Git state at session end
```
branch: phase-1-multitenant-foundation
all commits pushed to origin
working tree clean
```

---

## Vercel state at session end
- Project: `furnishedportal-multitenant` (halfezs-projects)
- Latest deploy: `dpl_9j5aaxzkAU5gAqUt1edBiUSUSF` — READY
- Production DB: `furnishedportal-product-prod` (us-west-2) — empty, correct
- All 14 env vars confirmed present in Vercel

---

## Next session
**Phase 4, Session 4 — Live smoke test + rollback runbook**
- End-to-end provisioning smoke test on production
- Cross-tenant isolation verification on live deploy
- Write Rollback Runbook (5+ entries)
- Final Notion updates
- Merge to main + tag phase-4-complete
