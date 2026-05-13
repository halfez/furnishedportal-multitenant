// FurnishedPortal — Subdomain routing middleware
//
// Reads the Host header on every request and sets one of two internal headers:
//   x-fp-subdomain    — e.g. "acme" for acme.furnishedportal.com
//   x-fp-custom-domain — e.g. "acmerentals.com" for a custom-domain landlord
//
// The Edge runtime cannot run Prisma, so this file ONLY classifies the
// request. The actual subdomain → landlordId lookup happens in
// lib/landlord-context.ts (server component / route handler context).
//
// Inbound x-fp-* headers are stripped to prevent client spoofing.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const hostname = host.split(':')[0]

  const requestHeaders = new Headers(request.headers)

  // Strip any inbound copies — prevents client from spoofing landlord context.
  requestHeaders.delete('x-fp-subdomain')
  requestHeaders.delete('x-fp-custom-domain')

  // Production: acme.furnishedportal.com
  const prodMatch = hostname.match(
    new RegExp(`^([^.]+)\\.${PLATFORM_DOMAIN.replace('.', '\\.')}$`)
  )
  if (prodMatch) {
    const sub = prodMatch[1].toLowerCase()
    if (!RESERVED_SUBDOMAINS.has(sub)) {
      requestHeaders.set('x-fp-subdomain', sub)
    }
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Dev: acme.localhost
  const devMatch = hostname.match(new RegExp(`^([^.]+)\\.${DEV_DOMAIN}$`))
  if (devMatch) {
    const sub = devMatch[1].toLowerCase()
    if (!RESERVED_SUBDOMAINS.has(sub)) {
      requestHeaders.set('x-fp-subdomain', sub)
    }
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Apex domain — marketing site, no landlord context
  if (hostname === PLATFORM_DOMAIN || hostname === DEV_DOMAIN) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Everything else is a custom domain
  requestHeaders.set('x-fp-custom-domain', hostname.toLowerCase())
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/|fonts/|.*\\..*).*)',
  ],
}
