import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const rows = await prisma.$queryRawUnsafe(
  `SELECT column_name FROM information_schema.columns WHERE table_name = 'User' ORDER BY ordinal_position`
)
console.log(rows.map(r => r.column_name).join(', '))
await prisma.$disconnect()
