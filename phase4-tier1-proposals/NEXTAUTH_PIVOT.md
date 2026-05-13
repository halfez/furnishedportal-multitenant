# NextAuth Pivot — landlord-scoped session

Status: DRAFT 2026-05-08, part of Tier 1 (Phase 4).

## Problem

The Yellowstone template's NextAuth setup has two assumptions that break under multi-tenant:

1. **Globally unique `Tenant.email`** — used as the credential lookup key. Under Path A, two different landlords might both have `jane@example.com` as a tenant, so the lookup must include landlordId.

2. **Single-landlord world** — the session has `userId` but no `landlordId`. Every API route assumes "the one landlord". After the pivot, every authenticated request must know which landlord owns the session.

## Plan

### 1. Login routes are subdomain-scoped

The login page lives under each landlord's subdomain. When a tenant or admin lands on `acmerentals.furnishedportal.com/login`, the middleware has already set `x-fp-subdomain: acmerentals`. The login form posts to a route handler that:

```
1. Reads x-fp-subdomain from headers
2. Resolves to landlordId via Landlord.findUnique({ subdomain })
3. Looks up the user with email + landlordId compound key
4. Verifies password
5. Issues a session containing { userId, landlordId, role }
```

### 2. NextAuth credentials provider — updated authorize()

```ts
// pseudocode
async authorize(credentials, req) {
  const subdomain = req.headers['x-fp-subdomain']
  const customDomain = req.headers['x-fp-custom-domain']
  const landlord = await resolveLandlordForLogin({ subdomain, customDomain })
  if (!landlord) return null

  // Try admin first
  const admin = await prisma.user.findUnique({
    where: { landlordId_email: { landlordId: landlord.id, email: credentials.email } }
  })
  if (admin && bcrypt.compare(credentials.password, admin.password)) {
    return { id: admin.id, email: admin.email, landlordId: landlord.id, role: admin.role }
  }

  // Fall back to tenant
  const tenant = await prisma.tenant.findUnique({
    where: { landlordId_email: { landlordId: landlord.id, email: credentials.email } }
  })
  if (tenant && bcrypt.compare(credentials.password, tenant.password)) {
    return { id: tenant.id, email: tenant.email, landlordId: landlord.id, role: 'tenant' }
  }

  return null
}
```

### 3. Session callback — propagate landlordId

```ts
callbacks: {
  jwt: async ({ token, user }) => {
    if (user) {
      token.landlordId = user.landlordId
      token.role = user.role
    }
    return token
  },
  session: async ({ session, token }) => {
    session.user.landlordId = token.landlordId
    session.user.role = token.role
    return session
  },
}
```

### 4. Type augmentation

```ts
// types/next-auth.d.ts
import 'next-auth'
declare module 'next-auth' {
  interface Session {
    user: { id: string; email: string; landlordId: string; role: string }
  }
  interface User { landlordId: string; role: string }
}
declare module 'next-auth/jwt' {
  interface JWT { landlordId: string; role: string }
}
```

### 5. Middleware verifies session matches subdomain

If a session's `landlordId` doesn't match the resolved subdomain's landlord, the session is invalid for THIS subdomain. Force re-login. Prevents session-token replay across tenants if someone copies a cookie.

This check lives in the middleware OR a guard component on protected routes. Recommend: guard component, since middleware can't access DB.

## Migration notes

- Existing Yellowstone tenants have global-unique emails; on migration, all map to one landlordId so no collision occurs.
- `Tenant.password` field stays as bcrypt hash; no re-hash needed.
- Session cookie domain must include the wildcard: `Domain=.furnishedportal.com` so subdomain navigation doesn't lose login. Custom domain sessions are scoped to that domain only.

## Tests

- Tenant for landlord A cannot log in at landlord B's subdomain
- Admin for landlord A cannot read landlord B's data via API even with a stolen cookie
- Password reset emails link back to the tenant's specific subdomain
