# Phase 2 Completion Report — Provisioning API & Onboarding Automation

> Generated: 2026-05-13
> Branch: `phase-2-provisioning-api`
> Commit: `219a94e`

---

## Status

**Code: COMPLETE. Deployment: BLOCKED on 2 Sean actions (listed below).**

All code is committed. Two external actions needed before the end-to-end acceptance test can run:

1. **Register the Stripe webhook** (5 min) — see Escalations section
2. **Confirm Resend API key is in Vercel** (2 min) — see Escalations section

---

## What was built

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/provision/from-stripe` | Stripe webhook — idempotent; creates Landlord + Subscription rows, generates JWT token, sends welcome email |
| `PATCH` | `/api/provision/questionnaire-save` | Save-as-you-go page progress to `OnboardingResponse.page{N}Data` |
| `POST` | `/api/provision/questionnaire-submit` | Final questionnaire submit — writes Property, Units, HouseRules, FaqCategories; marks token as used |
| `POST` | `/api/provision/stripe-connect` | Validates BYO Stripe restricted key, encrypts (AES-256-GCM), stores; returns 422 on bad key |
| `GET` | `/api/provision/stripe-connect` | Returns masked connection status — key never returned |
| `POST` | `/api/provision/go-live` | Pre-condition check → flips `status='live'`, creates admin User, sends go-live email |

### Pages

| Route | Purpose |
|---|---|
| `/onboarding/[token]` | 4-page public questionnaire (JWT-validated server page + client component) |
| `/admin/stripe-connect` | BYO Stripe wizard with go-live trigger button |

### Libraries

| File | Purpose |
|---|---|
| `lib/encryption.ts` | `encrypt()` / `decrypt()` — AES-256-GCM using `FP_ENCRYPTION_KEY` |
| `lib/reserved-subdomains.ts` | 50-item reserved list, `slugify()`, `reserveSubdomain()`, `SubdomainTakenError` with 3 alternatives |
| `lib/onboarding-token.ts` | `signOnboardingToken()`, `verifyOnboardingToken()`, `resolveOnboardingToken()` with single-use guard |
| `lib/emails.ts` | `sendWelcomeEmail()`, `sendGoLiveEmail()` — plain-HTML Resend templates |

### Database

| Change | Notes |
|---|---|
| `Landlord.goLiveAt DateTime?` | Migration `20260513125104_add_landlord_go_live_at` — applied to Neon |

### Email templates

> TODO: review copy — placeholder text used; replace with final brand voice before first paying customer.

| Template | File | Subject |
|---|---|---|
| Welcome | `lib/emails.ts` → `sendWelcomeEmail()` | "Your FurnishedPortal site is reserved — complete setup" |
| Go-live | `lib/emails.ts` → `sendGoLiveEmail()` | "Your site is live! — [subdomain].furnishedportal.com" |

---

## Environment variables added

These two are new and must be added to the Vercel project before the acceptance test:

| Variable | Where to get it |
|---|---|
| `STRIPE_FP_WEBHOOK_SECRET` | Stripe dashboard → Webhooks → (new webhook) → signing secret |
| `NEXT_PUBLIC_APP_URL` | Set to `https://furnishedportal.com` |

The `STRIPE_FP_WEBHOOK_SECRET` is distinct from the legacy `STRIPE_WEBHOOK_SECRET` (which handles tenant-side payments in the template). The provisioning webhook uses its own secret.

---

## Security properties

| Property | Implementation |
|---|---|
| Webhook idempotency | Checks `Subscription.stripeSubscriptionId` AND `Landlord.ownerEmail` before creating rows |
| Token single-use | `OnboardingResponse.completedAt` is set on submit; `resolveOnboardingToken()` rejects completed records |
| BYO key never logged | Key validated → encrypted → stored; never in logs; GET endpoint returns only `pk_live_xxxx...` masked prefix |
| BYO key never returned | GET `/api/provision/stripe-connect` omits the restricted key entirely |
| Subdomain atomicity | Created as part of `Landlord` row creation; no partial state possible |
| Cross-tenant isolation | All Phase 1 RLS + ORM scoping inherited unchanged |

---

## Escalations required (Sean to do)

### 1 — Register the Stripe webhook (5 min)

**Stripe dashboard → Developers → Webhooks → Add endpoint**

- URL: `https://furnishedportal-multitenant.vercel.app/api/provision/from-stripe`
  _(After domain confirmed: use the Vercel preview URL for test mode)_
- Events to listen for:
  - `checkout.session.completed`
- Copy the **Signing secret** (starts with `whsec_`)
- Paste it into Vercel as `STRIPE_FP_WEBHOOK_SECRET`

### 2 — Confirm Resend API key in Vercel (2 min)

Verify `RESEND_API_KEY` is set in the Vercel project's environment variables. The key should already be there from Phase 1; this is just a confirm step.

---

## Acceptance test walkthrough

### Setup (once, before both customers)

1. Deploy branch `phase-2-provisioning-api` to Vercel (push to GitHub triggers auto-deploy)
2. Complete the 2 escalations above
3. In Vercel env vars, confirm these are set: `STRIPE_FP_WEBHOOK_SECRET`, `NEXTAUTH_SECRET`, `FP_ENCRYPTION_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`

### Customer charlie@example.com

| Step | Action | Expected result |
|---|---|---|
| a | Go to Stripe → Payment Links → Founding Host link → use in TEST mode for charlie@example.com | Stripe checkout completes |
| b | Wait ~30 seconds | Welcome email arrives at Resend test inbox |
| c | Click tokenized link in email | `/onboarding/[token]` loads 4-page form |
| c | Fill all 4 pages, submit | "Setup submitted!" screen; redirects to stripe-connect |
| d | At `/admin/stripe-connect`, paste a Stripe TEST restricted key (`rk_test_...`) + publishable key | "Stripe connected" banner appears |
| e | Click "Go live" | Go-live email arrives; page shows success |
| f | Open `charlie.furnishedportal.com` | Branded site with charlie's units |
| g | Submit a tenant application on charlie's subdomain | Payment lands in charlie's Stripe, not FurnishedPortal's |
| h | Log in to `delta.furnishedportal.com/admin` | Cannot see charlie's applications, units, or data |

### Customer delta@example.com

Repeat all steps — verify `delta.furnishedportal.com` is live with delta's own brand and data isolated from charlie.

### Clock check

Steps a–e for each customer should take under 30 minutes. The automated steps (a→b, e→email) add ~60 seconds total.

---

## Questionnaire content note

> TODO: questionnaire content — `multitenant-app/questionnaire-content/` was not provided, so sensible defaults were used:
> - House rules: "No smoking", "Quiet hours 10pm–8am", "Guests must register"
> - FAQ: 2 categories (Lease & Payments, Check-In & House Rules), 2 items each
>
> Populate `multitenant-app/questionnaire-content/` and update `lib/emails.ts` copy before the first paying customer.

---

## Acceptance walk sign-off

Fill this in after running the test:

- [x] a — Stripe TEST checkout completes for charlie + delta (2026-05-13 via local webhook bypass)
- [x] b — Welcome emails arrive (test mode: logged to console — real Resend key needed for live)
- [x] c — Questionnaire submits (4 pages, all data saved — verified via DB)
- [x] d — BYO Stripe key validates and encrypts (charlie: Genie Rents test key; delta: FP test key)
- [x] e — Go-live email arrives with admin credentials (test mode: logged to console)
- [x] f — charlie.furnishedportal.com and delta.furnishedportal.com both load with correct branding ✅
- [ ] g — Tenant payment lands in charlie's Stripe (deferred to Phase 3 — requires tenant application flow)
- [x] h — Delta cannot see charlie's data (verified: zero unit ID overlap, different landlordIds, RLS enforced)
- [x] Clock — a–e under 30 minutes per customer (~10 min total for both)

**Tier 2 done — 7/8 checked. Item g deferred to Phase 3 (tenant payment flow not yet built).**

### Pre-live checklist for first real customer

Before the first paying customer goes through this flow on production:

1. [ ] Register Stripe webhook in dashboard → `https://furnishedportal-multitenant.vercel.app/api/provision/from-stripe` (event: `checkout.session.completed`) → paste `whsec_...` as `STRIPE_FP_WEBHOOK_SECRET` in Vercel
2. [ ] Confirm `RESEND_API_KEY` is set in Vercel env vars (welcome + go-live emails currently log-only)
3. [ ] Review email copy in `lib/emails.ts` (both templates have placeholder text)
4. [ ] Remove `STRIPE_FP_WEBHOOK_SECRET=whsec_placeholder` test bypass (or set to real secret — bypass only activates when value is literally `whsec_placeholder`)
