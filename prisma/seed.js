const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // Générer un nouveau hash à chaque fois pour éviter les problèmes d'échappement
  const hashedPassword = await bcrypt.hash('password123', 10)

  try {
    const user = await prisma.user.upsert({
      where: { email: 'admin@pointon.be' },
      update: { password: hashedPassword },
      create: {
        email: 'admin@pointon.be',
        name: 'Admin User',
        password: hashedPassword,
        role: 'ADMIN',
        active: true,
      },
    })

    console.log('✅ User created/updated:', user.email)
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
