# Vercel wildcard subdomain setup

Status: instructions for Sean. One-time setup, done after the multi-tenant code is deployed.

## What this does

Tells Vercel to accept any request matching `*.furnishedportal.com` (e.g. `acme.furnishedportal.com`, `bobshouse.furnishedportal.com`) and route it to the multi-tenant Next.js app. SSL certificates issue automatically via Vercel.

## One-time prerequisites

- Vercel project for the multi-tenant app exists (separate from the marketing-site project)
- `furnishedportal.com` DNS is at Spaceship (it is — already verified for the marketing site)

## Step-by-step (clicks only — no terminal needed)

### 1. Add the wildcard domain in Vercel

1. Go to the multi-tenant Vercel project's **Settings → Domains**
2. Click **Add**
3. Type: `*.furnishedportal.com`
4. Click **Add**
5. Vercel shows a CNAME record to set at your DNS provider — copy that target value (looks like `cname.vercel-dns.com`)

### 2. Add the CNAME at Spaceship

1. Sign in to Spaceship
2. Go to `furnishedportal.com` → **Advanced DNS**
3. Add a new record:
   - **Type**: `CNAME`
   - **Host**: `*`
   - **Value**: the Vercel target from step 1.5
   - **TTL**: 5 min (default is fine)
4. Save
5. Wait 1–5 min for DNS to propagate

### 3. Verify in Vercel

1. Back in Vercel → Settings → Domains
2. The `*.furnishedportal.com` entry should change from "Invalid Configuration" to "Valid Configuration"
3. SSL certificate provisioning takes another 1–2 minutes
4. Once green, ANY subdomain works — Vercel does not need to know names in advance

### 4. Smoke test

1. Open `https://test.furnishedportal.com` in a browser
2. The multi-tenant app should respond (likely a 404 page since no landlord with subdomain "test" exists — that's correct, it means routing is working)
3. Open `https://www.furnishedportal.com` — should 404 or hit the marketing app, depending on routing rules
4. Open `https://furnishedportal.com` — apex marketing site, unchanged

## Custom domains (per-customer, later)

When a paying customer upgrades to a custom domain like `acmerentals.com`:

1. **In the FurnishedPortal admin** — landlord enters `acmerentals.com`
2. **Backend calls Vercel API** to add the domain to the multi-tenant project
3. **Vercel returns DNS instructions** — landlord copies them to their registrar
4. **Once DNS propagates** — Vercel auto-issues SSL, the site is live at the custom domain

This is Tier 4 work — defer until at least 5 paying customers ask for it.

## Limits to know

- Vercel allows up to **10,000 domains per project** on the Pro plan (way more than we'll need)
- Wildcard SSL takes ~30 seconds per new subdomain on first request (cold-start cost)
- Vercel does NOT support nested wildcards — `*.foo.furnishedportal.com` would need a separate add

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Subdomain returns Vercel's "DEPLOYMENT_NOT_FOUND" | DNS hasn't propagated yet | Wait 5 min, try again |
| SSL cert error | Cert provisioning still running | Wait 2 min, refresh |
| Subdomain works but app shows wrong landlord | Middleware not reading Host header correctly | Check middleware.ts logs in Vercel Functions tab |
| Apex furnishedportal.com is broken | DNS A record was overwritten | Check Spaceship — A record for `@` should still point at marketing site |
