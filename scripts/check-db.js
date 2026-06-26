process.env.DATABASE_URL = 'file:./dev.db'

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, password: true }
  })
  console.log('Users in DB:', JSON.stringify(users, null, 2))
  await prisma.$disconnect()
}

main().catch(console.error)
