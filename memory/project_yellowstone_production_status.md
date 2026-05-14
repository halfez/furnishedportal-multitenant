---
name: Yellowstone Stay — production status as of 2026-05-08
description: Yellowstone2.com is live and customer-ready. Full tenant flow + host portal shipped, Stripe in live mode verified end-to-end. Only remaining gap is photo upload UI on /admin/property.
type: project
---

# Yellowstone Stay — production status (2026-05-08)

**Yellowstone2.com is LIVE and ready for real customers.** This supersedes the
2026-04-26 progress snapshot which framed Yellowstone as a partially-built
scaffold with major migrations pending. Most of that work shipped via Claude Code
between 2026-04-26 and 2026-05-08.

## What's shipped end-to-end
- **Tenant flow:** apply → screening → gate decisions (human-in-the-loop by design) → holding deposit → pre-lease → lease → payment setup → auto-charge → move-in → all cancellation paths
- **Host portal:** Dashboard, Applications queue, Tenants list, Calendar with manual blocks, Property settings, Payments wizard, Account
- **Stripe live mode:** verified end-to-end on 2026-05-08 with a $0.50 test charge
- **Legacy "email us to book" framing:** removed everywhere — all paths route through the apply flow

## What's left on Yellowstone
- **Photo upload UI on `/admin/property`** — gallery editing works at `/admin/manage` as fallback in the meantime

## Why this matters
Yellowstone is no longer "a template that needs finishing" — it's a working production deployment that proves the model. The FurnishedPortal-Product handoff is now about **packaging Yellowstone for cloning**, not finishing core features.

## How to apply
- When asked about FurnishedPortal-Product status, do NOT recite the old roadmap items (NextAuth wiring, Stripe setup, lease generation, payment auto-charge) as pending — those are shipped.
- Open questions still worth asking: status of Abacus.AI → OpenAI/Resend/Node-PDF migrations (not mentioned in 2026-05-08 update); status of e-signature audit trail; status of reviews system.
- The real remaining work for FurnishedPortal-Product is now: (1) photo upload UI, (2) cloning infrastructure — client intake form, sub-30-min deployment checklist, welcome package PDF, (3) pricing decision for what hosts pay Afshin.
