// Apply RLS policies to Neon DB using Prisma's executeRawUnsafe
// Run: node prisma/apply-rls.mjs
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dirname, 'rls-policies.sql'), 'utf8')

// Split on semicolons but keep meaningful statements
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !/^\s*$/.test(s))

const prisma = new PrismaClient()

async function main() {
  console.log(`Applying ${statements.length} RLS statements...`)
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    const preview = stmt.replace(/\s+/g, ' ').substring(0, 60)
    try {
      await prisma.$executeRawUnsafe(stmt)
      console.log(`  [${i + 1}/${statements.length}] OK: ${preview}`)
    } catch (e) {
      console.error(`  [${i + 1}/${statements.length}] ERR: ${preview}`)
      console.error(`  ${e.message}`)
    }
  }
  console.log('Done.')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1) })
