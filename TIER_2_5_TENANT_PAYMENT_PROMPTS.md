# Tier 2.5 — Tenant Payment Collection · Session Prompts

Launch-critical work that closes the gap between landlord onboarding (Tier 1+2+3 — shipped) and tenant rent collection (not yet built).

**Architectural path (locked):**
- BYO restricted-key carried forward from Tier 2 (encrypted in DB via `lib/encryption.ts`, retrieved per-request).
- Redirect-confirm pattern after Stripe Checkout (no per-landlord webhooks in v1).
- Server-side verification via `stripe.checkout.sessions.retrieve` against the landlord's account.

**Sequencing:** Sessions are strictly sequential. Each one's deliverables are dependencies of the next.

**Hand-back loop:** After Code completes a session, Afshin reports the result to Claude (Cowork). Claude then issues the next session's prompt informed by what Code actually shipped.

---

## Session 1 — Per-landlord Stripe client + Payment schema audit

```
# Tier 2.5 Session 1 — Per-landlord Stripe client + Payment schema audit

## Context (Code start here)
You're working on the FurnishedPortal multitenant app at
`multitenant-app/`. Tiers 1, 2, and 3 are shipped. Tier 2 stored each
landlord's Stripe restricted key encrypted in DB (via /admin/stripe-connect
and lib/encryption.ts), but the actual tenant payment flow was never
built. This is Session 1 of 4 to close that gap.

## Architectural path (do not deviate)
- Tenant payments hit the LANDLORD's own Stripe account, never the
  platform's, using the landlord's BYO restricted key.
- Restricted keys are per-account by design — no Stripe Connect, no
  stripeAccount header trickery, just instantiate Stripe SDK with the
  decrypted restricted key and every call lands on the landlord's
  account.
- Redirect-confirm pattern (no webhooks) — payment confirmation via
  stripe.checkout.sessions.retrieve on the success-URL handler.

## Scope of this session
Foundation only. No user-facing changes. No new API routes for tenants.
Just the per-landlord Stripe client + the Payment schema + a smoke test.

## Deliverables
1. NEW `multitenant-app/lib/stripe-tenant.ts`
   - Exports `getLandlordStripeClient(landlordId: string): Promise<Stripe>`
   - Fetches the landlord row, decrypts `stripeRestrictedKey` via the
     existing `lib/encryption.ts:decrypt()` helper.
   - Returns `new Stripe(decryptedKey, { apiVersion: '<current>' })`.
   - Throws a typed `MissingStripeKeyError` if no key is stored —
     callers should handle this gracefully (the landlord hasn't
     completed onboarding).
   - NEVER log the decrypted key. Add an explicit comment to that
     effect at the top of the file.
   - Cache decryption per-request (avoid re-decrypting in the same
     request). Do NOT cache across requests.

2. AUDIT `multitenant-app/prisma/schema.prisma` Payment model. Required
   shape:
   - id (cuid pk)
   - landlordId (FK to Landlord, indexed)
   - tenantId (nullable FK to Tenant — anonymous one-off payments allowed)
   - applicationId (nullable FK to Application)
   - leaseId (nullable FK to Lease)
   - type (enum: RENT | DEPOSIT | FEE)
   - amount (Int — cents)
   - currency (String, default "usd")
   - status (enum: PENDING | PAID | FAILED | REFUNDED)
   - stripeSessionId (String, indexed, unique)
   - stripePaymentIntentId (String, nullable)
   - description (String, nullable)
   - paidAt (DateTime, nullable)
   - refundedAt (DateTime, nullable)
   - createdAt, updatedAt
   If anything is missing, generate a Prisma migration and apply it to
   the Neon database. Name the migration descriptively.

3. NEW `multitenant-app/scripts/smoke-test-stripe-tenant.js`
   - Picks the first landlord that has a non-null `stripeRestrictedKey`
   - Calls `getLandlordStripeClient(landlord.id)` then
     `stripe.balance.retrieve()`
   - Prints the resulting balance object
   - Exits 0 on success, non-zero on failure
   - This proves: decryption works AND the key authenticates against
     the landlord's own Stripe account (not the platform's).

4. Wire `smoke:stripe-tenant` script in `multitenant-app/package.json`.

## Acceptance
- `npm run smoke:stripe-tenant` from inside `multitenant-app/` prints a
  real Stripe balance object pulled against a real landlord's account.
- `npx prisma migrate status` is clean.
- `tsc --noEmit` passes for the new files.
- The decrypted key never appears in any log or error message.

## Hand-back report
When done, report:
1. Files changed/created (paths only)
2. Migration name (if one was generated)
3. Output of `npm run smoke:stripe-tenant` (with the actual key value
   redacted — paste the balance object only)
4. Anything you flagged as ambiguous or that required a judgment call
```

---

## Session 2 — Tenant payment API

*Issued after Session 1 hand-back. Will cover `/api/tenant/pay` (POST — creates checkout session) and `/api/tenant/pay/confirm` (GET — verifies via stripe.checkout.sessions.retrieve and writes the Payment row to PAID).*

---

## Session 3 — Tenant-facing payment UI

*Issued after Session 2 hand-back. Will cover `/pay`, `/pay/success`, `/pay/cancel` — all landlord-branded via landlord-context. End of session: real tenant can pay $0.50 on `acme.furnishedportal.com/pay` and the Payment row shows PAID.*

---

## Session 4 — Admin payment history + refund

*Issued after Session 3 hand-back. Will cover `/admin/payments` (filterable table) and `/api/admin/payments/[id]/refund` (POST). Closes with a full end-to-end acceptance walk: pay → confirm → refund → confirm refund in Stripe dashboard.*

---

## Things Claude (Cowork) will do in parallel
- Update the `yellowstone-to-product-tracker` artifact to reflect Tier 2.5 as an active phase and remove the "ready for first paying customer" overclaim from Phase 6.
- Update memory file `project_fp_tier3_complete.md` to demote the launch-readiness framing.
- Hold any "first customer dry-run" plans until Session 4 closes clean.
