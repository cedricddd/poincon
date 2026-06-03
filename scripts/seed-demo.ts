/**
 * Seed script for demo account.
 * Run: npx tsx scripts/seed-demo.ts
 * Or:  npm run seed:demo
 *
 * Creates / resets "Dupont & Associés SPRL" demo company with realistic Belgian data.
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEMO_EMAIL = 'demo@pointon.be'
const DEMO_PASSWORD = 'Demo2024!'
const DEMO_COMPANY_NAME = 'Dupont & Associés SPRL'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(n: number, h = 8, m = 0) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(h, m, 0, 0)
  return d
}

function todayAt(h: number, m = 0) {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
}

// Generate workdays (Mon-Fri) going back `count` days from today
function workdays(count: number): number[] {
  const days: number[] = []
  let offset = 1
  while (days.length < count) {
    const d = new Date()
    d.setDate(d.getDate() - offset)
    const dow = d.getDay() // 0=Sun 6=Sat
    if (dow !== 0 && dow !== 6) days.push(offset)
    offset++
  }
  return days
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🎭 Seeding demo account...')

  // 1. Get TEAM plan
  const teamPlan = await prisma.plan.findUnique({ where: { name: 'TEAM' } })
  if (!teamPlan) {
    console.error('❌ TEAM plan not found. Run the plan seeder first.')
    process.exit(1)
  }

  // 2. Clean up any existing demo data
  const existingAdmin = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } })
  if (existingAdmin) {
    const existingCompany = await prisma.company.findUnique({ where: { adminId: existingAdmin.id } })
    if (existingCompany) {
      // Delete members first (avoids FK constraint)
      const members = await prisma.user.findMany({ where: { companyId: existingCompany.id } })
      for (const m of members) {
        await prisma.clockRecord.deleteMany({ where: { userId: m.id } })
        await prisma.user.delete({ where: { id: m.id } })
      }
      await prisma.company.delete({ where: { id: existingCompany.id } })
    }
    await prisma.user.delete({ where: { email: DEMO_EMAIL } })
    console.log('  ♻️  Cleaned up previous demo data')
  }

  // 3. Create admin user
  const hashedPwd = await bcrypt.hash(DEMO_PASSWORD, 10)
  const admin = await prisma.user.create({
    data: {
      name: 'Marie Dupont',
      email: DEMO_EMAIL,
      password: hashedPwd,
      role: 'ADMIN',
    },
  })

  // 4. Create demo company (TEAM plan, isDemo=true)
  const company = await prisma.company.create({
    data: {
      name: DEMO_COMPANY_NAME,
      address: 'Rue de la Régence 45, 4000 Liège',
      phone: '+32 4 123 45 67',
      vatNumber: 'BE0123456789',
      adminId: admin.id,
      planId: teamPlan.id,
      isDemo: true,
      contactEmail: DEMO_EMAIL,
    },
  })

  // Link admin to company
  await prisma.user.update({ where: { id: admin.id }, data: { companyId: company.id } })

  // 5. Create employees
  type EmpDef = { name: string; email: string; role: string; hoursPerDay: number }
  const employeeDefs: EmpDef[] = [
    { name: 'Patrick Renard',    email: 'p.renard@dupont-demo.be',    role: 'MANAGER', hoursPerDay: 8 },
    { name: 'Thomas Laurent',    email: 't.laurent@dupont-demo.be',   role: 'EMPLOYEE', hoursPerDay: 8 },
    { name: 'Sophie Mertens',    email: 's.mertens@dupont-demo.be',   role: 'EMPLOYEE', hoursPerDay: 8 },
    { name: 'Kevin Léonard',     email: 'k.leonard@dupont-demo.be',   role: 'EMPLOYEE', hoursPerDay: 8 },
    { name: 'Julie Pirard',      email: 'j.pirard@dupont-demo.be',    role: 'EMPLOYEE', hoursPerDay: 6.5 },
    { name: 'Nicolas Gilles',    email: 'n.gilles@dupont-demo.be',    role: 'EMPLOYEE', hoursPerDay: 8 },
    { name: 'Amira Bouchard',    email: 'a.bouchard@dupont-demo.be',  role: 'EMPLOYEE', hoursPerDay: 8 },
    { name: 'Isabelle Charlier', email: 'i.charlier@dupont-demo.be',  role: 'EMPLOYEE', hoursPerDay: 6.5 },
  ]

  const employees: Array<{ id: string; hoursPerDay: number }> = []
  for (const def of employeeDefs) {
    const emp = await prisma.user.create({
      data: {
        name: def.name,
        email: def.email,
        password: hashedPwd,
        role: def.role,
        companyId: company.id,
      },
    })
    employees.push({ id: emp.id, hoursPerDay: def.hoursPerDay })
  }
  console.log(`  👥 Created ${employees.length} employees`)

  // 6. Generate clock records for the past 15 workdays
  const days = workdays(15)
  let totalRecords = 0

  for (const emp of employees) {
    const variance = () => Math.floor(Math.random() * 20) - 10 // ±10 min

    for (const daysBack of days) {
      // Skip ~10% of days (absence)
      if (Math.random() < 0.1) continue

      const arrivalMin = 8 * 60 + variance()
      const workMin = emp.hoursPerDay * 60 + variance()
      const arrival = daysAgo(daysBack)
      arrival.setHours(Math.floor(arrivalMin / 60), arrivalMin % 60, 0, 0)

      const departure = new Date(arrival)
      departure.setMinutes(departure.getMinutes() + workMin + 30) // +30 for lunch

      await prisma.clockRecord.create({
        data: {
          userId: emp.id,
          arrivalTime: arrival,
          departureTime: departure,
          duration: Math.round(workMin * 60),
          date: arrival,
        },
      })
      totalRecords++
    }
  }
  console.log(`  🕐 Created ${totalRecords} clock records`)

  // 7. Create a team
  const team = await prisma.team.create({
    data: {
      name: 'Équipe Commerciale',
      companyId: company.id,
    },
  })
  // Add 3 employees to the team
  for (const emp of employees.slice(0, 3)) {
    await prisma.teamMember.create({
      data: { userId: emp.id, teamId: team.id },
    })
  }

  console.log('\n✅ Demo account ready!')
  console.log(`   URL      : https://pointon.ced-it.be/login`)
  console.log(`   Email    : ${DEMO_EMAIL}`)
  console.log(`   Password : ${DEMO_PASSWORD}`)
  console.log(`   Company  : ${DEMO_COMPANY_NAME} (TEAM plan, isDemo=true)`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
