---
name: FurnishedPortal-Product — codebase structure
description: The white-label MTR client product. Next.js 14 app lives under template/ subfolder (not at project root). All path references must be prefixed with template/.
type: project
---
# FurnishedPortal-Product — Structure

## The codebase lives in `template/`

The Next.js 14 white-label app is under the `template/` subfolder, not at the project root.
When referencing any file, prefix with `template/`:
- Config: `template/config/property.ts`
- Routes: `template/app/...`
- Env: `template/.env.example`, `template/.env.local`

**Why:** During migration from the old monorepo, the codebase landed nested as a subfolder
rather than flat at the project root. CLAUDE.md acknowledges this.

## What the product is

A white-label Next.js 14 midterm rental portal. Afshin sells this as a service:
each paying client gets their own deployment on their own domain (e.g. sunsetsuites.com).

- `template/config/property.ts` — per-client configuration (property name, owner, location, branding)
- Auth: NextAuth (tenants logging in to their portal)
- Stripe: collecting tenant rent (using the CLIENT's own Stripe account — NOT FurnishedPortal's)
- DB: Prisma ORM (Neon Postgres, not yet provisioned)

## What this is NOT

- NOT the FurnishedPortal SaaS business/marketing site (that's furnishedportal-www in the SaaS project)
- NOT where FurnishedPortal subscription billing happens
- NOT shared auth with the SaaS site
