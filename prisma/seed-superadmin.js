const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('cedric@ced-it', 10)

  const user = await prisma.user.upsert({
    where: { email: 'cedric@ced-it.be' },
    update: { password: hashedPassword, role: 'SUPER_ADMIN' },
    create: {
      email: 'cedric@ced-it.be',
      name: 'Cédric Deroanne',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      active: true,
    },
  })

  console.log('✅ Super-admin user created:', user.email, '— role:', user.role)
  console.log('   Password: cedric@ced-it (change it in production!)')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
