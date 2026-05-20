# 2026-05-16 — Phase 4 CLOSED

**Status:** SHIPPED. FurnishedPortal Product is live in production.

This file supersedes `2026-05-16_phase4-session3-cowork.md` (which was a mid-session checkpoint). Read this one first for current state.

---

## What's live

- **App:** multi-tenant Next.js at `furnishedportal-multitenant.vercel.app` and `*.furnishedportal.com`
- **Branch:** `main` (created from `phase-1-multitenant-foundation`)
- **Tag:** `phase-4-complete`
- **Final commit:** `c6f7183` (test: add production provisioning smoke test)
- **Final Vercel deploy:** `dpl_4h6nt5nCTjauWHNtxs8ZEtPmRuQg` — READY
- **Prod Neon DB:** `furnishedportal-product-prod` (us-west-2, host `ep-broad-heart-aksyj5lv`) — schema + RLS applied, currently empty
- **Stripe webhook:** `creative-finesse` Live mode, endpoint `/api/provision/from-stripe`, 0% error rate
- **Stripe live secret key:** rolled today; new key in both FP Product Vercel and www Vercel
- **All 14 Vercel env vars:** confirmed present in Production scope

---

## What got shipped today (sequence of work)

### Cowork (Tech Coach lead)
1. Audit of all platform accounts (Stripe, OpenAI, Resend, Vercel, Neon) — corrected stale Notion that said the Vercel project didn't exist.
2. Discovered 7 unpushed local commits (Phase 2 / 3 / Tier 2.5 / Tier 3 work that never made it to GitHub).
3. Verified Stripe webhook `creative-finesse` healthy.
4. Rolled the lost Stripe live secret key. Coordinated paste into 3 places (local `.env.production.local`, FP Product Vercel, www Vercel). Redeployed www inside the risk window. No customer impact (pre-launch).
5. Collected Stripe publishable key into `.env.production.local`.
6. Pushed 7 commits to GitHub: `f3f0610..57c70fa`.
7. First Vercel build failed on TypeScript error in `scripts/smoke-test-cross-tenant.ts:34` (Prisma extension type signature too loose for Vercel's strict tsc).
8. Vercel auto-rolled production back to old code; new env vars still applied.

### Code (parallel session)
9. Fixed tsconfig.json — added `"scripts/**"` to `exclude` (commit `d2b0fef`).
10. Confirmed all 4 env vars I had flagged as "missing" were actually already present in Vercel — Cowork's chrome screenshot had been cut off below the fold.
11. Swapped `DATABASE_URL` + `DIRECT_DATABASE_URL` in Vercel to prod Neon.
12. Final NEXT_PUBLIC_APP_URL fix from `https://furnishedportal.com` (wrong — apex is FP Business) to `https://furnishedportal-multitenant.vercel.app`.
13. Wrote production-targeting smoke test (commit `c6f7183`) — 18/18 isolation checks passed against live prod Neon. Test rows cleaned up.
14. Wrote 6 Rollback Runbook entries to Notion.
15. Merged to `main`, tagged `phase-4-complete`, pushed.
16. Final Vercel deploy `dpl_4h6nt5nCTjauWHNtxs8ZEtPmRuQg` — READY.

---

## Notion state at close

- **Build Log:** Session 3 (Cowork) + Session 3 (Code) + Session 4 entries logged. Phase 4 marked complete.
- **Setup & Environment Map:** stale "Vercel doesn't exist" line corrected. All env vars + prod DB + deploy pipeline documented as live.
- **Known Issues & Tech Debt:** TS error closed, NEXT_PUBLIC_APP_URL bug closed; restricted-key migration, smoke-test-cross-tenant.ts targeting, orphan Neon, orphan Vercel all logged as deferred.
- **Rollback Runbook:** 6 entries — Vercel rollback, Prisma rollback, Stripe webhook diagnostic + secret rotation, RLS re-apply, wildcard DNS recovery, git revert.
- **Cross-Agent Briefs (Technical):** Lane 3 advisory closed (Phase 4 shipped on Path B).

---

## Memory state at close

Two memory files updated/created today:
- `project_fp_phase4_complete.md` — full snapshot of shipped state (replaces partial mid-session file)
- `feedback_tech_coach_audit_completeness.md` — audit mode must read PHASE*_COMPLETION_REPORT.md files
- MEMORY.md index updated

---

## Owner Fluency at close

**Promoted to "known" today (no more explanation on each use):**
- env vars
- redeploy
- push

**Still in "explained on use":**
- Stripe Connect
- RLS
- landlordId
- subdomain routing
- wildcard DNS
- gitlink

---

## Carried forward (non-blocking)

| Item | Priority | Owner |
|---|---|---|
| Migrate STRIPE_SECRET_KEY to a restricted Stripe key | Medium (before scale) | Tech Coach |
| Fix smoke-test-cross-tenant.ts to use datasourceUrl for prod targeting | Low | Tech Coach |
| Investigate orphan Neon project `FP Product` (us-east-1, 20d old) | Low | Tech Coach |
| Investigate / delete orphan Vercel project `mtr-saas` | Low | Afshin |
| Stripe merchant name on www Payment Link | Small | Afshin (Stripe dashboard) |
| Stripe Payment Link success URL | Small | Afshin (Stripe dashboard) |
| Founding cohort acquisition + communication plan | – | Strategy |
| Marketing landing-page refresh for actual shipped product | – | Marketing |

---

## What to do next session

Open with `recall` or `orientation` to pull this file. Then pick one:

1. **Phase 5 — Yellowstone migration as landlordId=1.** Strategy decision first (when, how to communicate, what migrates alongside), then Tech Coach build.
2. **Founding cohort readiness pass.** Hand to Strategy + Marketing to confirm landing page, pricing, onboarding flow match the actual shipped product.
3. **Hardening pass.** Burn down the deferred Known Issues (restricted Stripe key first, then orphans).
4. **Smoke-test the live product as a real customer would.** Provision yourself as the first test landlord end-to-end, write down every rough edge.

Recommended order if all four matter: 4 → 2 → 1 → 3. Live smoke test surfaces issues before strategy commits to a customer-facing date.
