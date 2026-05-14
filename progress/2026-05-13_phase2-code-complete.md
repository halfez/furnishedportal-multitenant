# Session 2026-05-13 — Phase 2 code complete, blocked on 2 external actions

## Context

Phase 1 shipped between the last session and this one (Code worked the full
prompt). Phase 2 prompt then handed off; Code built the entire provisioning
API + onboarding questionnaire end to end on branch
`phase-2-provisioning-api` at commit `219a94e`. This session updated the
tracker artifact, task list, and progress log to reflect the new state.

## What's on disk (verified)

### multitenant-app/ — Phase 2 deliverables

**Endpoints (`multitenant-app/app/api/provision/`):**
- `POST /from-stripe` — Stripe webhook handler (idempotent; creates Landlord
  + Subscription, signs JWT, sends welcome email)
- `PATCH /questionnaire-save` — save-as-you-go to
  `OnboardingResponse.page{N}Data`
- `POST /questionnaire-submit` — final submit writes Property, Units,
  HouseRules, FaqCategories under landlordId; marks token used
- `POST /stripe-connect` — validates BYO Stripe key, encrypts AES-256-GCM,
  stores
- `GET /stripe-connect` — masked connection status
- `POST /go-live` — pre-condition check, flips status='live', creates admin
  User, sends go-live email

**Pages:**
- `/onboarding/[token]` — JWT-validated server page + client questionnaire
- `/admin/stripe-connect` — BYO Stripe wizard with go-live trigger

**Libraries (`multitenant-app/lib/`):**
- `encryption.ts` — AES-256-GCM using `FP_ENCRYPTION_KEY`
- `reserved-subdomains.ts` — 50-item reserved list, slugify, collision
  handling, 3-alternative suggestions, `SubdomainTakenError`
- `onboarding-token.ts` — sign/verify/resolve with single-use guard
- `emails.ts` — `sendWelcomeEmail()`, `sendGoLiveEmail()` via Resend
  (placeholder copy, flagged TODO)

**Database:** Migration `20260513125104_add_landlord_go_live_at` applied to
the multitenant Neon project (`Landlord.goLiveAt DateTime?`).

### Documents updated this session
- `PHASE2_COMPLETION_REPORT.md` — full report Code generated
- Task list: #2 (Phase 1) → completed, #3 (Phase 2) → in_progress with
  description rewritten to reflect 2 pending external actions

## Two external actions still pending

1. **Stripe webhook registration (5 min).** Stripe dashboard → Test mode →
   Developers → Webhooks → Add endpoint. URL: preview URL +
   `/api/provision/from-stripe`. Event: `checkout.session.completed`.
   Paste signing secret into Vercel as `STRIPE_FP_WEBHOOK_SECRET` at
   Preview scope.
2. **Resend API key (2 min).** Confirm `RESEND_API_KEY` exists in
   `furnishedportal-multitenant` Vercel project. Add at Preview scope if
   missing.

Open clarifications I flagged for Afshin to ask Code before clicking:
- Whether Code expects test-mode Payment Link payments or Stripe CLI
  triggers for Charlie/Delta acceptance run
- Whether env vars should be Preview-scope only

## Quality flags from Code's report

- `STRIPE_FP_WEBHOOK_SECRET` is intentionally distinct from the legacy
  `STRIPE_WEBHOOK_SECRET` (which handles tenant-side rent payments in
  `template/`). Provisioning has its own secret.
- Email copy is placeholder; flagged TODO before first paying customer
- `NEXT_PUBLIC_APP_URL` also needs to be set to `https://furnishedportal.com`

## What's next

Once the 2 external actions land, Afshin runs the Charlie/Delta acceptance
test from `PHASE2_COMPLETION_REPORT.md`. If both pass end-to-end under
30 minutes with full cross-tenant isolation, task #3 closes and the
tracker advances Phase 2 to 100%.

Phase 3 (security layer / RLS audit / cross-tenant test suite) becomes
the next active phase. The external Upwork review can be procured in
parallel.
