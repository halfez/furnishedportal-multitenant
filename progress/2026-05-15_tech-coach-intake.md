# 2026-05-15 — Tech Coach intake + Phase 4 kickoff

**Session type:** Cowork (discussion + audit), Tech Coach skill.

## What got done

1. **Tech Coach skill onboarded for FurnishedPortal.** First session for this skill. Audit mode engaged because multitenant-app codebase is mounted.
2. **Archived deprecated Path B template.** Renamed `template/` → `_archive/template-path-b/` on disk. (Rename is effective; commit blocked by stuck root `.git/index.lock`.)
3. **Rewrote root `CLAUDE.md`** to reflect post-pivot reality: `multitenant-app/` is the active codebase, Vercel Blob replaces AWS S3, env-var list matches reality.
4. **Populated Notion foundation pages (audit mode):**
   - **Tech Stack & Architecture** — full stack pulled from `multitenant-app/package.json`, `schema.prisma`, `middleware.ts`, cross-referenced with Project Overview.
   - **Setup & Environment Map** — code locations, services, deploy pipeline, env vars, safety-net status, access (Afshin + Claude only), Owner Fluency section seeded.
5. **Seeded Known Issues & Tech Debt:**
   - Stripe merchant name on Payment Link (open).
   - Stripe Payment Link success URL (open).
   - Stuck `.git/index.lock` at project root (open — one PowerShell command to fix).
   - 10+ uncommitted root-repo files from prior sessions (open — same fix).
   - Custom Domain admin-portal UI deferred (scheduled — waiting on Strategy pricing decision).
   - **Phase 4 readiness gate: multitenant-app missing full Yellowstone tenant lifecycle (escalated to Strategy).**
   - Exposed GitHub PAT in archived `_archive/template-path-b/.git/config` (closed per Afshin).
6. **Yellowstone bug-parity audit (closed):** Afshin provided `CHANGELOG_2026-05-15_for_furnishedportal.md`. None of the seven Yellowstone fixes apply directly to multitenant-app today because the affected file paths don't exist. The bigger gap: multitenant-app is structurally simpler than Yellowstone (no `ApplicationStage` enum, no holding-deposit / pre-lease / lease-signing / payment-setup pages, no progress bar). Patterns logged for whenever the lifecycle gets ported.
7. **Cross-Agent Briefs (Technical):** Lane 3 (Technical → Strategy) — opened an advisory asking Strategy to decide Path A (port full lifecycle) vs Path B (ship Phase 4 with current simpler flow).
8. **Cross-Agent Briefs (general):** added a pointer in the Open summary so Strategy sees the advisory at session start.
9. **Memory:** saved feedback memory "Cowork vs Code routing rule" — discussion stays in Cowork, technical fine-tuning transfers to Code with a written brief, results return via Build Log + progress files.

## Owner Fluency

Recently introduced this session (still being explained on each use): `landlordId`, `subdomain routing`, `Row-Level Security (RLS)`, `Stripe Connect`, `Vercel project`, `wildcard DNS`, `gitlink`. None promoted to "known" yet.

## Strategy advisory pending

Phase 4 readiness — Yellowstone tenant lifecycle missing from multitenant-app. Strategy needs to decide Path A vs Path B. **Per Afshin's directive 2026-05-15: Phase 4 infrastructure work is proceeding in parallel; the advisory does not block.**

## Phase 4 plan (split into 4 Code sessions)

Infrastructure track only. Tenant-flow scope is the Strategy decision (separate).

- **Session 1 — Pre-flight cleanup + local smoke test.** Clear `.git/index.lock`, commit pending root-repo changes, verify multitenant-app builds cleanly, run cross-tenant smoke test locally (or write one if it doesn't exist). Self-contained, no external dashboards.
- **Session 2 — Production database setup.** Create new Neon Postgres project for FP Product (Afshin clicks in Neon dashboard; Code drafts the exact values). Run `prisma migrate deploy` against production DB. Apply `prisma/rls-policies.sql`. Generate production secrets.
- **Session 3 — Vercel project creation + first deploy.** Create Vercel project #2 linked to GitHub repo. Set production env vars. First deploy. Attach wildcard `*.furnishedportal.com`. Verify subdomain resolution.
- **Session 4 — Live smoke test + rollback runbook.** End-to-end production smoke test (real provisioning flow). Cross-tenant isolation verification on the live deploy. Write Rollback Runbook entries. Final Build Log entry.

## Open follow-ups

- Strategy decides Path A vs Path B (separate session).
- Stripe dashboard fixes (merchant name + success URL) — minutes of Afshin's time, no code.
- The stuck `.git/index.lock` — one PowerShell command from Afshin: `del C:\Users\seanm\OneDrive\Documents\Claude\Projects\FurnishedPortal-Product\.git\index.lock`. Session 1 handles this.

## Files touched this session

- `CLAUDE.md` (rewrote)
- `template/` → `_archive/template-path-b/` (renamed)
- Notion: Tech Stack & Architecture, Setup & Environment Map, Known Issues & Tech Debt, Build Log, Cross-Agent Briefs (Technical), Cross-Agent Briefs (general)
- Auto-memory: `feedback_cowork_vs_code_routing.md` + MEMORY.md index update
