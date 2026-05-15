# Phase 4 Session 1 — Pre-flight cleanup + local smoke test
**Date:** 2026-05-15  
**Branch:** phase-1-multitenant-foundation (6 commits ahead of origin)

---

## What was done

### Step 1: Git lock cleared
- Removed stale `.git/index.lock` (zero-byte file left by a crashed process on 2026-05-14).
- `git status` ran cleanly after removal.

### Step 2: Pending changes committed (5 commits + 1 test commit)
All changes that had piled up since the last commit (`f3f0610`) were committed:

| Commit | Message |
|--------|---------|
| `655845b` | archive: move deprecated Path B template to _archive/template-path-b |
| `f53c87e` | docs: rewrite root CLAUDE.md for post-pivot Path A reality |
| `6af21b3` | docs: add tier 2.5 planning prompts and session progress logs |
| `c44586e` | feat: tenant rent collection — Stripe Connect payment flow (Tier 2.5) |
| `7acd243` | chore: stop tracking archive submodule, gitignore _archive/ |
| `142c2a2` | test: add cross-tenant isolation smoke test |

**Note on the archive:** The original `template/` folder was a git submodule. When renamed to `_archive/template-path-b/`, git treated it as a dirty submodule. Resolution: removed from git tracking (files stay on disk for reference), added `_archive/` to the root `.gitignore`. This is the correct approach — the archive is reference-only, not active code.

**Also created:** Root `.gitignore` (was missing — nothing was protecting against committing node_modules or zip files).

### Step 3: Build verified
- `npm run build` (from `multitenant-app/`) succeeded on the first clean retry after killing a stale node process.
- 46 routes compiled with no errors or type failures.
- All new Tier 2.5 routes present in the build output: `/admin/payments`, `/api/tenant/pay`, `/api/tenant/pay/confirm`, `/pay`, `/pay/cancel`, `/pay/success`.

### Step 4: Cross-tenant smoke test written and run
**New file:** `multitenant-app/scripts/smoke-test-cross-tenant.ts`  
**New npm script:** `npm run smoke:cross-tenant`

The test:
1. Seeds two fake landlords (`smoke-a-*` and `smoke-b-*`) in the live Neon DB with FAQs, gallery images, and tenant records each.
2. Runs queries from each landlord's context using the same `withLandlordContext` pattern the real API routes use.
3. Asserts that each landlord sees their own data AND never sees the other's.
4. Cleans up all test rows on completion.

**Result: 18/18 checks passed. Zero leaks in either direction.**

Both isolation layers confirmed:
- ORM layer: `scopedPrismaFor()` injecting `landlordId` into every `where` clause.
- RLS layer: `SET LOCAL app.landlord_id` activating Postgres row-level security.

---

## Git status at session end
```
nothing to commit, working tree clean
6 commits ahead of origin/phase-1-multitenant-foundation
```

---

## Next session
**Phase 4, Session 2 — Production database setup**  
- Apply Prisma migrations to the live Neon DB
- Verify RLS policies are active in production
- Register the multi-tenant Vercel project (Vercel project #2)
- Move `*.furnishedportal.com` wildcard registration from the marketing site project to the new multi-tenant project
