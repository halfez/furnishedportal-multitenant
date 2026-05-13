export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { resolveLandlord, withLandlordContext } from '@/lib/landlord-context'

export async function POST(request: NextRequest) {
  const landlord = await resolveLandlord()
  if (!landlord) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { name, phone, email, message, formType } = body

  if (!email || !message) {
    return NextResponse.json({ error: 'Email and message are required' }, { status: 400 })
  }

  const submission = await withLandlordContext(landlord.id, (db) =>
    db.contactSubmission.create({
      data: { name, phone, email, message, formType: formType ?? 'contact' },
    })
  )

  return NextResponse.json({ success: true, id: submission.id })
}
