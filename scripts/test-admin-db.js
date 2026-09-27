const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
require('dotenv/config')

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  try {
    const row = await prisma.adminCredential.findFirst()
    console.log('DB OK:', JSON.stringify(row))
  } catch (e) {
    console.error('DB ERROR:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}
main()
