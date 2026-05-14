export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveLandlord } from '@/lib/landlord-context'
import { prisma } from '@/lib/prisma'

const RESERVED = new Set([
  'www','app','api','admin','mail','ftp','staging','dev','test','support',
  'help','docs','blog','status','go','pay','portal','login','signup',
  'billing','dashboard','platform','furnishedportal',
])

async function requireOwner() {
  const landlord = await resolveLandlord()
  if (!landlord) return null
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  if (session.user.landlordId !== landlord.id) return null
  if (session.user.role !== 'owner') return null
  return { landlord, session }
}

export async function PATCH(request: NextRequest) {
  const ctx = await requireOwner()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subdomain } = await request.json()
  if (!subdomain || typeof subdomain !== 'string') {
    return NextResponse.json({ error: 'subdomain required' }, { status: 400 })
  }

  const cleaned = subdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, '')
  if (cleaned.length < 3 || cleaned.length > 48) {
    return NextResponse.json({ error: 'Subdomain must be 3–48 characters' }, { status: 400 })
  }
  if (RESERVED.has(cleaned)) {
    return NextResponse.json({ error: `"${cleaned}" is a reserved name` }, { status: 400 })
  }
  if (cleaned === ctx.landlord.subdomain) {
    return NextResponse.json({ error: 'That is already your subdomain' }, { status: 400 })
  }

  const taken = await prisma.landlord.findUnique({ where: { subdomain: cleaned } })
  if (taken) {
    return NextResponse.json({ error: `"${cleaned}.furnishedportal.com" is already taken` }, { status: 409 })
  }

  const updated = await prisma.landlord.update({
    where: { id: ctx.landlord.id },
    data: {
      previousSubdomain: ctx.landlord.subdomain,
      subdomainChangedAt: new Date(),
      subdomain: cleaned,
    },
    select: { subdomain: true },
  })

  return NextResponse.json({ subdomain: updated.subdomain })
}
