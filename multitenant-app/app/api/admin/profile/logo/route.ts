export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveLandlord } from '@/lib/landlord-context'
import { prisma } from '@/lib/prisma'
import { uploadToBlob, logoBlobPath } from '@/lib/blob'

async function requireAdmin() {
  const landlord = await resolveLandlord()
  if (!landlord) return null
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  if (session.user.landlordId !== landlord.id) return null
  if (session.user.role !== 'admin' && session.user.role !== 'owner') return null
  return { landlord, session }
}

export async function POST(request: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const path = logoBlobPath(ctx.landlord.id, file.name)
  const { url } = await uploadToBlob(path, buffer, file.type)

  await prisma.landlord.update({
    where: { id: ctx.landlord.id },
    data: { logoUrl: url },
  })

  return NextResponse.json({ logoUrl: url })
}
