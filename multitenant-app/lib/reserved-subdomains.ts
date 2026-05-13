import { prisma } from '@/lib/prisma'

export const RESERVED_SUBDOMAINS = new Set([
  // Platform routes
  'admin', 'www', 'app', 'api', 'mail', 'ftp', 'smtp', 'pop', 'imap',
  'support', 'help', 'status', 'blog', 'docs', 'documentation',
  'login', 'logout', 'signup', 'register', 'onboarding',
  'dashboard', 'portal', 'account', 'accounts', 'billing', 'pricing',
  'auth', 'oauth', 'sso', 'saml', 'verify', 'reset',
  'static', 'assets', 'cdn', 'media', 'images', 'files', 'uploads',
  'dev', 'staging', 'test', 'sandbox', 'demo', 'preview',
  'beta', 'alpha', 'v1', 'v2', 'v3',
  // Vercel-reserved
  'vercel', 'now', 'zeit',
  // Common brand conflicts
  'furnishedportal', 'furnished', 'portal', 'platform',
  'null', 'undefined', 'localhost',
])

export function isReserved(slug: string): boolean {
  return RESERVED_SUBDOMAINS.has(slug.toLowerCase())
}

export function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}

// Derives a candidate subdomain slug from the customer email.
// charlie@example.com  → "charlie"
// charlie.smith@co.com → "charliesmith"
export function slugFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email
  return slugify(local.replace(/\./g, ''))
}

// Returns the chosen slug, or throws SubdomainTakenError with 3 alternatives.
export async function reserveSubdomain(
  candidateSlug: string,
): Promise<string> {
  const base = slugify(candidateSlug)

  if (!base) throw new Error('Could not derive a valid subdomain from the provided value')

  const pick = async (slug: string): Promise<string | null> => {
    if (isReserved(slug)) return null
    const exists = await prisma.landlord.findUnique({ where: { subdomain: slug } })
    return exists ? null : slug
  }

  const winner = await pick(base)
  if (winner) return winner

  // Generate 3 alternatives
  const alternatives: string[] = []
  for (let i = 1; alternatives.length < 3; i++) {
    const alt = `${base}${i}`
    const ok = await pick(alt)
    if (ok) alternatives.push(ok)
  }

  throw new SubdomainTakenError(base, alternatives)
}

export class SubdomainTakenError extends Error {
  alternatives: string[]
  constructor(slug: string, alternatives: string[]) {
    super(`Subdomain "${slug}" is already taken`)
    this.name = 'SubdomainTakenError'
    this.alternatives = alternatives
  }
}
