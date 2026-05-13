export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { resolveLandlord, withLandlordContext } from '@/lib/landlord-context'

export async function POST(request: NextRequest) {
  const landlord = await resolveLandlord()
  if (!landlord) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { firstName, lastName, email, password, phone } = body

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const hash = await bcrypt.hash(password, 12)

  try {
    const tenant = await withLandlordContext(landlord.id, (db) =>
      db.tenant.create({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.toLowerCase().trim(),
          password: hash,
          phone: phone ?? null,
        },
      })
    )
    return NextResponse.json({ success: true, id: tenant.id })
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === 'P2002') {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }
    console.error('[signup] error:', err)
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 })
  }
}
