export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withLandlordContext } from '@/lib/landlord-context'
import { resolveOnboardingToken, OnboardingTokenError } from '@/lib/onboarding-token'
import { slugify, RESERVED_SUBDOMAINS } from '@/lib/reserved-subdomains'
import { z } from 'zod'

// ---- Schema for each page's data ----

const UnitInput = z.object({
  identifier: z.string().min(1),
  monthlyRent: z.number().positive(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  sqft: z.number().int().positive().optional(),
  description: z.string().optional(),
})

const Page1 = z.object({
  businessName: z.string().min(1),
  brandName: z.string().min(1),
  ownerFirstName: z.string().min(1),
  ownerLastName: z.string().optional(),
  ownerPhone: z.string().optional(),
  propertyName: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(2).max(2),
  zip: z.string().min(5),
})

const Page2 = z.object({
  units: z.array(UnitInput).min(1),
})

const Page3 = z.object({
  houseRules: z.array(z.string()).optional(),
  faqCategories: z
    .array(
      z.object({
        title: z.string().min(1),
        icon: z.string().optional(),
        items: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
      }),
    )
    .optional(),
})

const Page4 = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  contactEmail: z.string().email().optional(),
  subdomain: z.string().min(1),
  logoUrl: z.string().url().optional(),
})

const SubmitBody = z.object({
  token: z.string(),
})

export async function POST(request: NextRequest) {
  let body: z.infer<typeof SubmitBody>
  try {
    body = SubmitBody.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const { record } = await resolveOnboardingToken(body.token)

    // Parse each page's saved data.
    const p1 = Page1.safeParse(record.page1Data)
    const p2 = Page2.safeParse(record.page2Data)
    const p3 = Page3.safeParse(record.page3Data ?? {})
    const p4 = Page4.safeParse(record.page4Data)

    const errors: string[] = []
    if (!p1.success) errors.push('Page 1 (property basics) is incomplete')
    if (!p2.success) errors.push('Page 2 (units) is incomplete')
    if (!p4.success) errors.push('Page 4 (branding / subdomain) is incomplete')
    if (errors.length) return NextResponse.json({ error: errors.join('; ') }, { status: 422 })

    const { data: d1 } = p1 as { data: z.infer<typeof Page1> }
    const { data: d2 } = p2 as { data: z.infer<typeof Page2> }
    const { data: d3 } = p3
    const { data: d4 } = p4 as { data: z.infer<typeof Page4> }

    // Validate desired subdomain.
    const desiredSlug = slugify(d4.subdomain)
    if (RESERVED_SUBDOMAINS.has(desiredSlug)) {
      return NextResponse.json({ error: `Subdomain "${desiredSlug}" is reserved` }, { status: 422 })
    }

    // Check collision only if subdomain is changing.
    const landlord = await prisma.landlord.findUnique({ where: { id: record.landlordId } })
    if (!landlord) return NextResponse.json({ error: 'Landlord not found' }, { status: 404 })

    if (desiredSlug !== landlord.subdomain) {
      const collision = await prisma.landlord.findFirst({
        where: { subdomain: desiredSlug, id: { not: landlord.id } },
      })
      if (collision) {
        return NextResponse.json(
          { error: `Subdomain "${desiredSlug}" is taken`, code: 'subdomain_taken' },
          { status: 409 },
        )
      }
    }

    // Write all data — idempotent: delete-then-create inside the landlord context.
    await withLandlordContext(landlord.id, async (db) => {
      // Update landlord core fields.
      await db.landlord.update({
        where: { id: landlord.id },
        data: {
          businessName: d1.businessName,
          brandName: d1.brandName,
          ownerFirstName: d1.ownerFirstName,
          ownerLastName: d1.ownerLastName ?? '',
          ownerPhone: d1.ownerPhone,
          subdomain: desiredSlug,
          primaryColor: d4.primaryColor ?? landlord.primaryColor,
          logoUrl: d4.logoUrl ?? landlord.logoUrl,
        },
      })

      // Property
      await db.property.deleteMany({})
      const property = await db.property.create({
        data: {
          landlordId: landlord.id,
          name: d1.propertyName,
          addressLine1: d1.addressLine1,
          addressLine2: d1.addressLine2,
          city: d1.city,
          state: d1.state.toUpperCase(),
          zip: d1.zip,
        },
      })

      // Units
      await db.unit.deleteMany({})
      for (const u of d2.units) {
        await db.unit.create({
          data: {
            landlordId: landlord.id,
            propertyId: property.id,
            identifier: u.identifier,
            monthlyRent: u.monthlyRent,
            bedrooms: u.bedrooms,
            bathrooms: u.bathrooms,
            sqft: u.sqft,
            description: u.description,
          },
        })
      }

      // House rules
      await db.houseRule.deleteMany({})
      if (d3?.houseRules?.length) {
        for (let i = 0; i < d3.houseRules.length; i++) {
          await db.houseRule.create({
            data: { landlordId: landlord.id, text: d3.houseRules[i], sortOrder: i },
          })
        }
      }

      // FAQ categories + items
      await db.faqCategory.deleteMany({})
      if (d3?.faqCategories?.length) {
        for (let ci = 0; ci < d3.faqCategories.length; ci++) {
          const cat = d3.faqCategories[ci]
          await db.faqCategory.create({
            data: {
              landlordId: landlord.id,
              title: cat.title,
              icon: cat.icon ?? 'HelpCircle',
              sortOrder: ci,
              items: {
                create: (cat.items ?? []).map((item, ii) => ({
                  question: item.question,
                  answer: item.answer,
                  sortOrder: ii,
                })),
              },
            },
          })
        }
      }
    })

    // Mark questionnaire as complete (single-use).
    await prisma.onboardingResponse.update({
      where: { id: record.id },
      data: { completedAt: new Date() },
    })

    // Update landlord status to 'onboarding' (idempotent — already there, but explicit).
    // Status stays 'onboarding' until go-live endpoint is called.
    await prisma.landlord.update({
      where: { id: landlord.id },
      data: { status: 'onboarding' },
    })

    return NextResponse.json({ submitted: true, subdomain: desiredSlug })
  } catch (err) {
    if (err instanceof OnboardingTokenError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 401 })
    }
    console.error('[questionnaire-submit]', err)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}
