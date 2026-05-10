const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // Utiliser un hash pré-généré pour éviter les problèmes async
  // Hash de 'password123' avec bcrypt (salt 10)
  const hashedPassword = '$2a$10$K9P.FWmVyL0A3oWlBhNLX.ZkH8vH0Vd7vH5M0V5M0V5M0V5M0'

  // Ou regénérer le hash
  try {
    const newHash = await bcrypt.hash('password123', 10)
    console.log('Hashed password:', newHash)

    const user = await prisma.user.upsert({
      where: { email: 'admin@poincon.be' },
      update: { password: newHash },
      create: {
        email: 'admin@poincon.be',
        name: 'Admin User',
        password: newHash,
        role: 'ADMIN',
        active: true,
      },
    })

    console.log('✅ User created/updated:', user.email, 'with hash:', newHash.substring(0, 20) + '...')
  } catch (e) {
    console.error('❌ Error creating user:', e.message)
    throw e
  }

  // Seed plans
  const plans = [
    { name: 'FREE',       maxEmployees: 3,  maxManagers: 0, maxCsvExportsPerMonth: 1,  scheduledExport: null,      hasTeams: false, hasAdvancedReports: false },
    { name: 'SOLO',       maxEmployees: 10, maxManagers: 0, maxCsvExportsPerMonth: -1, scheduledExport: null,      hasTeams: false, hasAdvancedReports: true  },
    { name: 'TEAM',       maxEmployees: 50, maxManagers: 5, maxCsvExportsPerMonth: -1, scheduledExport: 'monthly', hasTeams: true,  hasAdvancedReports: true  },
    { name: 'ENTERPRISE', maxEmployees: -1, maxManagers: -1,maxCsvExportsPerMonth: -1, scheduledExport: 'weekly',  hasTeams: true,  hasAdvancedReports: true  },
  ]

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    })
  }
  console.log('✅ Plans seeded:', plans.map(p => p.name).join(', '))
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
