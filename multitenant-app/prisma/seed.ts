// FurnishedPortal multi-tenant seed script
//
// Creates two isolated test landlords — `acme` and `beta` — each with:
//   - 1 Landlord row + 1 User (admin)
//   - 1 Property, 3 Units
//   - 2 FaqCategories with 3 items each
//   - 2 sample Tenants
//   - 1 sample Application per tenant
//   - 3 GalleryImage stubs
//   - HouseRules and Amenities
//
// Run via: npx ts-node --project tsconfig.json prisma/seed.ts
//
// Requires DATABASE_URL to be set and the schema migrated.
// Uses withPlatformContext so RLS policies allow the inserts.

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function withPlatform<T>(fn: (db: PrismaClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await (tx as PrismaClient).$executeRaw`SELECT set_config('app.landlord_id', 'PLATFORM', true)`
    return fn(tx as PrismaClient)
  })
}

async function seedLandlord(config: {
  subdomain: string
  brandName: string
  businessName: string
  ownerEmail: string
  adminEmail: string
  adminPassword: string
  primaryColor: string
  city: string
  state: string
}) {
  const adminHash = await bcrypt.hash(config.adminPassword, 12)

  const landlord = await withPlatform((db) =>
    db.landlord.upsert({
      where: { subdomain: config.subdomain },
      update: {},
      create: {
        subdomain: config.subdomain,
        brandName: config.brandName,
        businessName: config.businessName,
        ownerFirstName: 'Test',
        ownerLastName: 'Owner',
        ownerEmail: config.ownerEmail,
        status: 'live',
        primaryColor: config.primaryColor,
      },
    })
  )

  // Admin user
  await withPlatform((db) =>
    db.user.upsert({
      where: { landlordId_email: { landlordId: landlord.id, email: config.adminEmail } },
      update: {},
      create: {
        landlordId: landlord.id,
        email: config.adminEmail,
        password: adminHash,
        firstName: 'Admin',
        lastName: config.brandName,
        role: 'admin',
      },
    })
  )

  // Property + 3 Units
  const property = await withPlatform((db) =>
    db.property.create({
      data: {
        landlordId: landlord.id,
        name: `${config.brandName} Property`,
        addressLine1: '123 Main St',
        city: config.city,
        state: config.state,
        zip: '00000',
      },
    })
  )

  const unitData = [
    { identifier: '101', monthlyRent: 1800, bedrooms: 1, bathrooms: 1, sqft: 650, description: 'Cozy studio with city views.' },
    { identifier: '202', monthlyRent: 2400, bedrooms: 2, bathrooms: 1, sqft: 950, description: 'Spacious 2BR with updated kitchen.' },
    { identifier: '305', monthlyRent: 3200, bedrooms: 3, bathrooms: 2, sqft: 1300, description: 'Corner unit with natural light.' },
  ]

  const units = await Promise.all(
    unitData.map((u) =>
      withPlatform((db) =>
        db.unit.create({
          data: { landlordId: landlord.id, propertyId: property.id, ...u },
        })
      )
    )
  )

  // FAQ
  const faqData = [
    {
      title: 'Booking & Check-in',
      icon: 'Calendar',
      items: [
        { question: 'What is the minimum stay?', answer: '30 days minimum.' },
        { question: 'How do I check in?', answer: 'Keypad code sent 24h before arrival.' },
        { question: 'Is parking included?', answer: 'One assigned spot included.' },
      ],
    },
    {
      title: 'Policies',
      icon: 'FileText',
      items: [
        { question: 'Are pets allowed?', answer: 'Small pets under 25 lbs with $250 pet fee.' },
        { question: 'Is smoking permitted?', answer: 'No smoking inside the unit.' },
        { question: 'What utilities are included?', answer: 'Water, trash, and WiFi are included.' },
      ],
    },
  ]

  for (let ci = 0; ci < faqData.length; ci++) {
    const cat = await withPlatform((db) =>
      db.faqCategory.create({
        data: {
          landlordId: landlord.id,
          title: faqData[ci].title,
          icon: faqData[ci].icon,
          sortOrder: ci,
        },
      })
    )
    for (let ii = 0; ii < faqData[ci].items.length; ii++) {
      await withPlatform((db) =>
        db.faqItem.create({
          data: { categoryId: cat.id, ...faqData[ci].items[ii], sortOrder: ii },
        })
      )
    }
  }

  // House Rules
  const rules = [
    'No smoking inside the unit or on balconies.',
    'Quiet hours 10 PM – 8 AM.',
    'Maximum occupancy per unit as listed.',
  ]
  for (let i = 0; i < rules.length; i++) {
    await withPlatform((db) =>
      db.houseRule.create({ data: { landlordId: landlord.id, text: rules[i], sortOrder: i } })
    )
  }

  // Amenities
  const amenities = ['High-speed WiFi', 'In-unit washer/dryer', 'Fully equipped kitchen', 'Central A/C']
  for (let i = 0; i < amenities.length; i++) {
    await withPlatform((db) =>
      db.amenity.create({ data: { landlordId: landlord.id, text: amenities[i], sortOrder: i } })
    )
  }

  // Gallery stubs (no S3 files needed for acceptance tests)
  for (let i = 0; i < 3; i++) {
    await withPlatform((db) =>
      db.galleryImage.create({
        data: {
          landlordId: landlord.id,
          unitId: units[i % units.length].id,
          publicUrl: `https://placehold.co/800x600?text=${config.subdomain}+unit+${i + 1}`,
          isPublic: true,
          caption: `${config.brandName} — Unit ${units[i % units.length].identifier}`,
          sortOrder: i,
        },
      })
    )
  }

  // 2 tenants
  const tenantPass = await bcrypt.hash('password123', 12)
  const tenantARow = await withPlatform((db) =>
    db.tenant.upsert({
      where: { landlordId_email: { landlordId: landlord.id, email: `jane@${config.subdomain}.test` } },
      update: {},
      create: {
        landlordId: landlord.id,
        firstName: 'Jane',
        lastName: 'Smith',
        email: `jane@${config.subdomain}.test`,
        password: tenantPass,
        phone: '555-0101',
        status: 'active',
      },
    })
  )

  const tenantBRow = await withPlatform((db) =>
    db.tenant.upsert({
      where: { landlordId_email: { landlordId: landlord.id, email: `bob@${config.subdomain}.test` } },
      update: {},
      create: {
        landlordId: landlord.id,
        firstName: 'Bob',
        lastName: 'Jones',
        email: `bob@${config.subdomain}.test`,
        password: tenantPass,
        phone: '555-0202',
        status: 'active',
      },
    })
  )

  // 1 application per tenant
  const now = new Date()
  const sixMonths = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate())

  for (const [tenant, unit] of [[tenantARow, units[0]], [tenantBRow, units[1]]] as const) {
    await withPlatform((db) =>
      db.application.create({
        data: {
          landlordId: landlord.id,
          tenantId: tenant.id,
          unitId: unit.id,
          moveInDate: now,
          moveOutDate: sixMonths,
          monthlyRent: unit.monthlyRent,
          contactPhone: tenant.phone ?? '555-0000',
          contactEmail: tenant.email,
          emergencyName: 'Emergency Contact',
          emergencyPhone: '555-9999',
          status: 'submitted',
        },
      })
    )
  }

  console.log(`Seeded landlord: ${config.brandName} (${config.subdomain}.furnishedportal.com)`)
  console.log(`  Admin: ${config.adminEmail} / ${config.adminPassword}`)
  console.log(`  Tenants: jane@${config.subdomain}.test / password123`)
  console.log(`           bob@${config.subdomain}.test  / password123`)
  console.log()
  return landlord
}

async function main() {
  console.log('Seeding FurnishedPortal multi-tenant database...\n')

  await seedLandlord({
    subdomain: 'acme',
    brandName: 'Acme Rentals',
    businessName: 'Acme Properties LLC',
    ownerEmail: 'acme-owner@test.com',
    adminEmail: 'admin@acme.test',
    adminPassword: 'acmeAdmin123!',
    primaryColor: '#00798c',
    city: 'Austin',
    state: 'TX',
  })

  await seedLandlord({
    subdomain: 'beta',
    brandName: 'Beta Living',
    businessName: 'Beta Residential LLC',
    ownerEmail: 'beta-owner@test.com',
    adminEmail: 'admin@beta.test',
    adminPassword: 'betaAdmin456!',
    primaryColor: '#6b21a8',
    city: 'Denver',
    state: 'CO',
  })

  console.log('Done. Two test landlords ready.')
  console.log('acme.furnishedportal.com and beta.furnishedportal.com')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
