const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
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

  // Pricing (HTVA): FREE=0 | STARTER=19.90 | TEAM=44.90 | BUSINESS=69.90 | ENTERPRISE=devis
  // Extra seats (HTVA): STARTER=+2.90 | TEAM=+2.60 | BUSINESS=+2.20
  // Annual = 10 months (2 months free = -17%)
  const plans = [
    {
      name: 'FREE',
      maxEmployees: 3,
      maxManagers: 0,
      maxCsvExportsPerMonth: 1,
      scheduledExport: null,
      hasTeams: false,
      hasAdvancedReports: false,
      hasKiosk: false,
      hasPlanning: false,
      baseIncludedSeats: 3,
      pricePerExtraSeatCents: 0,
    },
    {
      name: 'STARTER',
      maxEmployees: 5,
      maxManagers: 0,
      maxCsvExportsPerMonth: -1,
      scheduledExport: null,
      hasTeams: false,
      hasAdvancedReports: true,
      hasKiosk: true,
      hasPlanning: false,
      baseIncludedSeats: 5,
      pricePerExtraSeatCents: 290,
    },
    {
      name: 'TEAM',
      maxEmployees: 15,
      maxManagers: 5,
      maxCsvExportsPerMonth: -1,
      scheduledExport: 'monthly',
      hasTeams: true,
      hasAdvancedReports: true,
      hasKiosk: true,
      hasPlanning: true,
      baseIncludedSeats: 15,
      pricePerExtraSeatCents: 260,
    },
    {
      name: 'BUSINESS',
      maxEmployees: 30,
      maxManagers: 10,
      maxCsvExportsPerMonth: -1,
      scheduledExport: 'monthly',
      hasTeams: true,
      hasAdvancedReports: true,
      hasKiosk: true,
      hasPlanning: true,
      baseIncludedSeats: 30,
      pricePerExtraSeatCents: 220,
    },
    {
      name: 'ENTERPRISE',
      maxEmployees: -1,
      maxManagers: -1,
      maxCsvExportsPerMonth: -1,
      scheduledExport: 'weekly',
      hasTeams: true,
      hasAdvancedReports: true,
      hasKiosk: true,
      hasPlanning: true,
      baseIncludedSeats: -1,
      pricePerExtraSeatCents: 0,
    },
  ]

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    })
  }
  console.log('✅ Plans seeded:', plans.map(p => p.name).join(', '))

  // Migrate companies still on legacy SOLO plan → STARTER
  const starterPlan = await prisma.plan.findUnique({ where: { name: 'STARTER' } })
  const soloPlan = await prisma.plan.findUnique({ where: { name: 'SOLO' } })
  if (soloPlan && starterPlan) {
    const migrated = await prisma.company.updateMany({
      where: { planId: soloPlan.id },
      data: { planId: starterPlan.id },
    })
    if (migrated.count > 0) {
      console.log(`✅ Migrated ${migrated.count} company(ies) from SOLO → STARTER`)
    }
    await prisma.plan.delete({ where: { name: 'SOLO' } }).catch(() => {})
    console.log('✅ Legacy SOLO plan removed')
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
