/**
 * Run this script to create/reset the admin account:
 *   node scripts/seed-admin.js
 *
 * Default credentials after running:
 *   Username : admin
 *   Password : admin@2026   ← CHANGE THIS after first login!
 */

const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
require('dotenv/config')

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const username = 'admin'
  const password = 'admin@2026'   // ← change to your desired password here

  const hash = await bcrypt.hash(password, 12)

  const admin = await prisma.adminCredential.upsert({
    where: { username },
    update: { password_hash: hash },
    create: { username, password_hash: hash },
  })

  console.log('✅ Admin account created/updated successfully!')
  console.log(`   Username : ${admin.username}`)
  console.log(`   Password : ${password}`)
  console.log(`   Hash     : ${hash}`)
  console.log('\n⚠️  IMPORTANT: Change your password after first login at /admin')
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
