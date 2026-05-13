// =====================================================================
// FurnishedPortal — Subdomain routing middleware (Tier 1, Phase 4)
// =====================================================================
//
// Status: PROPOSAL 2026-05-08. Lives outside template/ so Next.js does
// not pick it up. Once accepted, this file moves to template/middleware.ts.
//
// Job: every incoming request, look at the Host header, decide which
// landlord (if any) this request is for, and forward that information
// downstream via custom headers. Cannot do DB lookups here directly —
// Vercel Edge runtime does not support Prisma. The actual subdomain →
// landlordId lookup happens in a server-component helper (see
// landlord-context.ts proposal).
//
// Routing matrix:
//   acmerentals.furnishedportal.com   → forward x-fp-subdomain: "acmerentals"
//   acmerentals.localhost:3000        → forward x-fp-subdomain: "acmerentals"  (dev)
//   acmerentals.com                   → forward x-fp-custom-domain: "acmerentals.com"
//   www.furnishedportal.com           → marketing site (skip multi-tenant routing)
//   furnishedportal.com               → marketing site (skip multi-tenant routing)
//   app.furnishedportal.com           → reserved (skip)
//
// Reserved subdomains never resolve to a landlord — they fall through to
// the marketing app or platform pages. The reserved list also acts as a
// signup-time validator (see Tier 2 questionnaire flow).
// =====================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Subdomains that can NEVER be used as a landlord identifier. Validated
// at signup; also short-circuits routing here.
const RESERVED_SUBDOMAINS = new Set([
  'www',
  'app',
  'api',
  'admin',
  'mail',
  'ftp',
  'staging',
  'dev',
  'test',
  'support',
  'help',
  'docs',
  'blog',
  'status',
  'go',
  'pay',
])

const PLATFORM_DOMAIN = 'furnishedportal.com'
const DEV_DOMAIN = 'localhost'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const hostname = host.split(':')[0]

  const requestHeaders = new Headers(request.headers)

  // Strip any inbound copies of our internal headers — protects against
  // a client trying to spoof landlord context by setting them itself.
  requestHeaders.delete('x-fp-subdomain')
  requestHeaders.delete('x-fp-custom-domain')

  // Match production: acme.furnishedportal.com
  const prodMatch = hostname.match(
    new RegExp(`^([^.]+)\\.${PLATFORM_DOMAIN.replace('.', '\\.')}$`)
  )
  if (prodMatch) {
    const subdomain = prodMatch[1].toLowerCase()
    if (RESERVED_SUBDOMAINS.has(subdomain)) {
      // Reserved — let it through to the marketing/platform app
      return NextResponse.next({ request: { headers: requestHeaders } })
    }
    requestHeaders.set('x-fp-subdomain', subdomain)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Match dev: acme.localhost
  const devMatch = hostname.match(
    new RegExp(`^([^.]+)\\.${DEV_DOMAIN}$`)
  )
  if (devMatch) {
    const subdomain = devMatch[1].toLowerCase()
    if (RESERVED_SUBDOMAINS.has(subdomain)) {
      return NextResponse.next({ request: { headers: requestHeaders } })
    }
    requestHeaders.set('x-fp-subdomain', subdomain)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Apex furnishedportal.com — marketing site
  if (hostname === PLATFORM_DOMAIN || hostname === DEV_DOMAIN) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Anything else is a custom domain — pass through for landlord lookup
  requestHeaders.set('x-fp-custom-domain', hostname.toLowerCase())
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    // Run on every request EXCEPT static assets and Next internals
    '/((?!_next/static|_next/image|favicon.ico|images/|fonts/|.*\\..*).*)',
  ],
}
