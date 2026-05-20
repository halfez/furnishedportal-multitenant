# 2026-05-16 — Phase 4 Session 3 (Cowork / Tech Coach lead, Code parallel)

**Session type:** Cowork, Tech Coach + novice-guide skills.
**State at start:** Phase 4 Sessions 1-2 complete (yesterday). Prod Neon DB provisioned, RLS applied, secrets generated. Branch `phase-1-multitenant-foundation` 7 commits ahead of origin, never pushed.
**State at this checkpoint:** Production stable on OLD code, NEW Stripe key. Build of new commits failed on TypeScript error. Several env vars + DB swap still pending. Code session running in parallel to push remaining work through.

---

## Audit findings (corrected understanding of where we are)

Yesterday's Tech Coach audit had **two critical misses** that were caught today:

1. **Vercel project `furnishedportal-multitenant` already exists** since Phase 1 (2026-05-13). Notion Setup & Environment Map said "Does not exist yet." Wrong. URL: `furnishedportal-multitenant.vercel.app`. Wildcard `*.furnishedportal.com` already attached with valid SSL. Most env vars (10 of 14) already configured.
2. **7 local commits were never pushed to GitHub.** The work from Phase 2/3/Tier 2.5/Tier 3 was committed locally but `git push` was never run. Result: Vercel kept serving May 13 code while local had everything up through Session 1 of yesterday.

Root cause: yesterday's audit read local code + Notion but did NOT read `PHASE*_COMPLETION_REPORT.md` files at project root, which explicitly documented the existing Vercel project, the wildcard SSL, and the env var status. Memory saved as feedback.

---

## What got done today (in order)

### 1. Account audit (Cowork, no code changes)
Verified existence of all platform accounts:
- Stripe: GenieRents = FurnishedPortal Stripe account, confirmed by Afshin.
- OpenAI: account exists.
- Resend: `furnishedportal.com` sender domain already verified.
- Vercel: 4 projects total (`furnishedportal-multitenant`, `furnishedportal-www`, `duplex-website`, `mtr-saas`). FP Product = `furnishedportal-multitenant`.
- Neon: 3 projects (`furnishedportal-product-prod` set up yesterday, `frosty-sun-36615720` from Phase 1 dev, `FP Product` 20-day-old orphan — needs investigation).

### 2. Stripe webhook verified healthy
Existing webhook `creative-finesse` in Live mode, endpoint `https://furnishedportal-multitenant.vercel.app/api/provision/from-stripe`, event `checkout.session.completed`, 0% error rate. No changes needed. Matching `STRIPE_FP_WEBHOOK_SECRET` already in Vercel env (added May 13).

### 3. Stripe live secret key ROLLED (destructive, executed)
Original `sk_live_` key was lost (not stored anywhere in `FurnishedPortal-Product/` per grep; not in any obvious backup). Afshin chose to ROLL rather than use a restricted key.

Procedure executed:
1. Pre-flight: opened Stripe API keys page + FP Product Vercel env vars page + www Vercel env vars page + VS Code `.env.production.local` simultaneously.
2. Rolled secret key in Stripe (Live mode). Old key revoked immediately. New key shown once.
3. Pasted new `sk_live_...` into three places within ~60 seconds:
   - `multitenant-app/.env.production.local` (local staging)
   - Vercel `furnishedportal-multitenant` → Settings → Environment Variables (new entry, Production scope, Sensitive)
   - Vercel `furnishedportal-www` → Settings → Environment Variables (edited existing entry, replaced value)
4. Manually triggered Redeploy of `furnishedportal-www` to pick up the new key.
5. www redeploy went green within ~2 min. Risk window for www checkout: ~3-4 min total. No real customer impact (pre-launch).

### 4. Stripe publishable key collected
Copied `pk_live_...` from Stripe API keys page (no roll needed). Pasted into `multitenant-app/.env.production.local` as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=`. **NOT yet added to Vercel env vars.**

### 5. 7 commits pushed to GitHub
From `multitenant-app/` via terminal:
```
git push origin phase-1-multitenant-foundation
# f3f0610..57c70fa  phase-1-multitenant-foundation -> phase-1-multitenant-foundation
# Total 66 objects, 35.42 KiB
```
Push succeeded cleanly.

### 6. Vercel auto-build FAILED (commit 57c70fa, deploy `CWHqcpwHj`)
TypeScript error in `multitenant-app/scripts/smoke-test-cross-tenant.ts:34`:
```
Type '<A extends DynamicQueryExtensionCbArgs<...>...>' is not assignable to type 'DynamicQueryExtensionCb<...>'.
  Types of parameters '__0' and 'args' are incompatible.
    Type 'A' is not assignable to type '{ args: never; query: (a: never) => Promise<unknown>; }'.
```
Root cause: the Prisma extension type signature on line 34 (`{ args: Prisma.Args<never, 'findMany'>; query: ... }`) is fudgey. Works at runtime via `tsx`/`ts-node` transpileOnly, but Vercel's full `tsc` validation rejects it.

**Why this slipped through Session 1 local build:** Session 1 ran `npm run build` which compiled the app routes successfully (46 routes, no errors). The smoke test script lives in `scripts/` which Next.js doesn't include in app build by default — but tsconfig's `include: ["**/*.ts"]` pulled it in for full type-checking on Vercel.

### 7. Vercel auto-rolled production back to last good build
Production currently serving `9eI2A4s2N` (redeploy of `q6eDK6Woo` which is a redeploy of `FHxFHMHft` = commit `f3f0610`, original May 14 code). Translation: production is on OLD code (pre-Tier 2.5) with NEW env vars (new Stripe key applies because Vercel uses current env on every build).

---

## What's still pending (Code session is handling now)

1. **Fix tsconfig.json** — add `"scripts/**"` to `exclude` array. One-line change.
2. **Add to Vercel env vars (Production scope):**
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (value already in `.env.production.local`)
   - `OPENAI_API_KEY` (Afshin to create a new key labeled `furnishedportal-multitenant-prod`)
   - `NEXT_PUBLIC_APP_URL` = `https://furnishedportal.com`
3. **Update Vercel env vars (Production scope):**
   - `DATABASE_URL` → swap from dev Neon (`frosty-sun-36615720`) to prod Neon (`furnishedportal-product-prod`)
   - `DIRECT_DATABASE_URL` → same swap
4. **Push tsconfig fix + any other changes** → Vercel rebuilds with new code AND new env vars in one shot.
5. **Smoke test**: hit `https://any-slug.furnishedportal.com`, expect 404 (proves middleware running on empty prod DB).
6. **Confirm `acme.furnishedportal.com` returns 404** (proves DB swap took effect).

---

## Current production state at this checkpoint

| Layer | State |
|---|---|
| Code | OLD (commit `f3f0610`, May 14, pre-Tier 2.5) |
| Stripe secret key (FP Product Vercel) | NEW (post-roll) |
| Stripe secret key (www Vercel) | NEW (post-roll) |
| Stripe publishable key in Vercel | NOT YET ADDED |
| OpenAI key in Vercel | NOT YET ADDED |
| NEXT_PUBLIC_APP_URL in Vercel | NOT YET ADDED |
| DATABASE_URL in Vercel | DEV Neon (needs swap) |
| BLOB_READ_WRITE_TOKEN | ✓ (May 14) |
| RESEND_API_KEY | ✓ (May 14) |
| Stripe webhook | ✓ verified healthy |
| Wildcard DNS | ✓ |
| GitHub remote | up to date (commit `57c70fa`) |

---

## Known Issues opened today

1. `scripts/smoke-test-cross-tenant.ts:34` — Prisma extension type signature is wrong (works at runtime, fails Vercel build). Workaround: tsconfig exclude. Real fix: rewrite the type signature properly. Low priority.
2. Neon orphan project `FP Product` (us-east-1, 20 days old) — purpose unknown. Investigate before any cleanup.
3. Neon orphan project `frosty-sun-36615720` (us-east-1, 3 days old, 0 branches) — was the dev DB; may be deletable after Phase 4 ships and we confirm nothing depends on it.
4. Vercel orphan project `mtr-saas` — deprecated Path B starter, never deployed for FP Product. Candidate for deletion after audit.
5. Root project repo `.git/index.lock` issue from 2026-05-14 was resolved in Session 1 yesterday but root repo still has untracked file: `progress/2026-05-15_phase4-session2.md`. Not blocking — just a git hygiene item.
6. `STRIPE_SECRET_KEY` is currently a full secret key, not a restricted key. Migrate to restricted scopes (Customers, PaymentIntents, Checkout Sessions, Connect) as a future hardening step.
7. `NEXT_PUBLIC_APP_URL=https://furnishedportal.com` per docs — but apex is served by FP Business marketing site, not FP Product. Onboarding email links may need to point at a subdomain or the Vercel URL. Verify in Session 4 smoke test.

---

## Tech Coach process improvements (memory candidates)

- **Audit mode must read `PHASE*_COMPLETION_REPORT.md` files at project root**, not just code + Notion. Yesterday's audit missed Vercel/env-var existence because completion reports weren't included in the read pass.
- **Pre-push checks**: before recommending `git push`, run `npm run build` once with the Vercel tsconfig (or instruct Code to). Local builds may pass when Vercel's stricter build fails — `scripts/` folder tsconfig coverage being a concrete example today.

---

## Open questions for Afshin (next session)

- Want to investigate the orphan Neon project `FP Product` before deleting it, or leave it alone for now?
- Want to delete the orphan Vercel project `mtr-saas`?
- After Phase 4 ships: ready for Path A handoff to Strategy (Yellowstone lifecycle port), or stay on Path B through founding cohort?

---

## Hand-back to Cowork after Code finishes

When Code completes the remaining work, paste back:
- Final commit hash on origin
- Vercel deploy ID + status
- Smoke test results (3 URLs)
- Any new Known Issues found
- Any rollback procedures written

Then this Cowork session will:
- Update Notion Build Log + Setup & Environment Map (reflect reality)
- Update Known Issues with anything new
- Begin Rollback Runbook entries
- Session close summary
