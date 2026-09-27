const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const bcrypt = require('bcryptjs')
require('dotenv').config({ path: '.env.local' })

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const admin = await prisma.adminCredential.findFirst()
  console.log('Username:', admin.username)
  console.log('Hash:', admin.password_hash)

  const passwords = ['admin123', 'Admin@123', 'nutritrack2026', 'admin', 'password', 'rohit2026']
  for (const p of passwords) {
    const ok = await bcrypt.compare(p, admin.password_hash)
    if (ok) console.log('PASSWORD FOUND:', p)
    else console.log('Not matching:', p)
  }

  await prisma.$disconnect()
}
main().catch(console.error)
