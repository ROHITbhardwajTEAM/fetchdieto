const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const bcrypt = require('bcryptjs')
require('dotenv').config({ path: '.env.local' })

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL })
const prisma = new PrismaClient({ adapter })

// Set your desired password here
const NEW_PASSWORD = 'Admin@1234'

async function main() {
  const hash = await bcrypt.hash(NEW_PASSWORD, 12)
  const updated = await prisma.adminCredential.update({
    where: { username: 'admin' },
    data: { password_hash: hash },
  })
  console.log('Password reset successfully for:', updated.username)
  console.log('New password is:', NEW_PASSWORD)
  await prisma.$disconnect()
}
main().catch(console.error)
