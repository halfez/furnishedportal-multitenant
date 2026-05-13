# Tier 1 acceptance tests — Multi-tenant foundation

Status: test plan for Tier 1 of Phase 4. Run after schema migration + middleware + landlord-context + NextAuth pivot all merge into the multi-tenant codebase. Same model as the Yellowstone Phase 12 e2e walk: a real human (Sean acting as test customer) goes through every scenario and signs off.

## Setup

Before running these tests:

1. Multi-tenant Next.js app deployed to Vercel
2. `*.furnishedportal.com` wildcard configured (see VERCEL_SETUP.md)
3. Schema-v2 migration applied to the shared Neon DB
4. Two manually-created Landlord rows in the DB:
   - **Landlord A** — subdomain `acme`, ownerEmail `acme-owner@test.com`, status `live`
   - **Landlord B** — subdomain `bob`, ownerEmail `bob-owner@test.com`, status `live`
5. One admin User row per landlord (manually inserted with bcrypt-hashed password)
6. Sample data per landlord: 1 Property, 2 Units, 3 GalleryImages, 2 FaqCategories with 3 Items each

## Test 1 — Subdomain routing

| Step | Expected |
|---|---|
| Open `https://acme.furnishedportal.com` | Landlord A's homepage renders, landlord A's brand name visible |
| Open `https://bob.furnishedportal.com` | Landlord B's homepage renders, landlord B's brand name visible |
| Open `https://furnishedportal.com` | Marketing site renders (apex unchanged) |
| Open `https://www.furnishedportal.com` | Marketing site renders (www reserved) |
| Open `https://nonexistent.furnishedportal.com` | 404 page or "Site not found" — does NOT crash |
| Open `https://app.furnishedportal.com` | Reserved — does NOT resolve to a landlord |

## Test 2 — Data isolation (CRITICAL — this is what Path A is FOR)

| Step | Expected |
|---|---|
| Log in as admin@acme on `acme.furnishedportal.com/admin` | Lands on landlord A's admin dashboard |
| View applications list | Sees ONLY landlord A's applications, zero of landlord B's |
| View gallery images | Sees ONLY landlord A's images |
| Open a Prisma Studio session connected to the shared DB | Both landlords' rows visible (this is the platform view, no scoping) |
| In landlord A's admin, manually craft a URL targeting a known landlord-B Application ID | 404 or "Not found" — landlord A admin can NOT read landlord B data via direct ID |
| Submit a contact form on `acme.furnishedportal.com/contact` | New row appears tied to landlord A only; landlord B's contact list is unchanged |

## Test 3 — Auth scope

| Step | Expected |
|---|---|
| Log in as admin@acme on `acme.furnishedportal.com` | Success |
| Copy the session cookie | Manually visit `bob.furnishedportal.com/admin` with that cookie | Forced re-login OR landlord-mismatch error — does NOT show landlord B data |
| Try to log in as `admin@acme` on `bob.furnishedportal.com/login` | "Invalid credentials" — admin@acme exists for landlord A, not for landlord B |
| Log out, then attempt to read `acme.furnishedportal.com/admin` | Redirect to login |

## Test 4 — Cross-tenant email collision

| Step | Expected |
|---|---|
| In Prisma Studio, create a Tenant with email `jane@example.com` for landlord A | Success |
| Create a Tenant with email `jane@example.com` for landlord B | Success — composite unique on (landlordId, email) allows it |
| Log in as `jane@example.com` on `acme.furnishedportal.com/login` (with landlord A's password) | Success — tenant A is logged in |
| Log in as `jane@example.com` on `bob.furnishedportal.com/login` (with landlord B's password) | Success — tenant B is logged in. Two separate sessions, no leakage. |

## Test 5 — Reserved-subdomain protection

| Step | Expected |
|---|---|
| Manually attempt to insert a Landlord with `subdomain = 'admin'` | Either DB rejects (if reserved-list check is at the DB level) OR the API rejects (if it's at the app level) — must NOT succeed |
| Try `subdomain = 'www'` | Same — rejected |
| Try `subdomain = 'AdMiN'` | Rejected — case-insensitive |

## Test 6 — Subscription / billing scoping

| Step | Expected |
|---|---|
| Open Stripe (platform account) → Customers | Two customer rows, one per landlord, with correct subscription status |
| Cancel landlord A's subscription via Stripe | After webhook fires, landlord A's `status` flips to `canceled` |
| Visit `acme.furnishedportal.com` | Either redirects to a "subscription canceled" notice OR returns 404 — does NOT show stale content |
| Visit `bob.furnishedportal.com` | Still works — landlord B unaffected |

## Sign-off

- [ ] Test 1: subdomain routing
- [ ] Test 2: data isolation
- [ ] Test 3: auth scope
- [ ] Test 4: cross-tenant email collision
- [ ] Test 5: reserved-subdomain protection
- [ ] Test 6: subscription / billing scoping

If any of these fail, Tier 1 is NOT done. Do not proceed to Tier 2 until all six pass.
