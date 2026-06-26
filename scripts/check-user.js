const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  const user = await prisma.user.findUnique({
    where: { email: 'cedric@ced-it.be' },
    select: { email: true, role: true, name: true, password: { select: {} } },
  })
  console.log('User found:', user)
  await prisma.$disconnect()
}

main().catch(e => {
  console.error('Error:', e.message)
  process.exit(1)
})
