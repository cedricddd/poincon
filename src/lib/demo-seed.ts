import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const DEMO_COMPANY_NAME = 'Dupont & Associés SPRL'
const DEMO_ADDRESS = 'Rue de la Régence 45, 4000 Liège'
const DEMO_PHONE = '+32 4 123 45 67'
const DEMO_VAT = 'BE0123456789'
const DEMO_DURATION_DAYS = 15

function daysAgo(n: number, h = 8, m = 0) {
  const d = new Date()
  d.setDate(d.getDate() - n)
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

type EmpDef = { name: string; localPart: string; role: string; hoursPerDay: number }

const EMPLOYEE_DEFS: EmpDef[] = [
  { name: 'Patrick Renard', localPart: 'p.renard', role: 'MANAGER', hoursPerDay: 8 },
  { name: 'Thomas Laurent', localPart: 't.laurent', role: 'EMPLOYEE', hoursPerDay: 8 },
  { name: 'Sophie Mertens', localPart: 's.mertens', role: 'EMPLOYEE', hoursPerDay: 8 },
  { name: 'Kevin Léonard', localPart: 'k.leonard', role: 'EMPLOYEE', hoursPerDay: 8 },
  { name: 'Julie Pirard', localPart: 'j.pirard', role: 'EMPLOYEE', hoursPerDay: 6.5 },
  { name: 'Nicolas Gilles', localPart: 'n.gilles', role: 'EMPLOYEE', hoursPerDay: 8 },
  { name: 'Amira Bouchard', localPart: 'a.bouchard', role: 'EMPLOYEE', hoursPerDay: 8 },
  { name: 'Isabelle Charlier', localPart: 'i.charlier', role: 'EMPLOYEE', hoursPerDay: 6.5 },
]

export class DemoAccountExistsError extends Error {
  constructor() {
    super('Un compte existe déjà avec cet email')
    this.name = 'DemoAccountExistsError'
  }
}

export async function createProspectDemoCompany(params: {
  adminEmail: string
  adminName: string
  locale?: string
}): Promise<{ companyId: string; password: string }> {
  const adminEmail = params.adminEmail.toLowerCase().trim()

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (existing) throw new DemoAccountExistsError()

  const teamPlan = await prisma.plan.findUnique({ where: { name: 'TEAM' } })
  if (!teamPlan) throw new Error('TEAM plan not found — run the plan seeder first')

  const password = randomBytes(9).toString('base64url')
  const hashedPwd = await bcrypt.hash(password, 10)

  const admin = await prisma.user.create({
    data: {
      name: params.adminName,
      email: adminEmail,
      password: hashedPwd,
      role: 'ADMIN',
      locale: params.locale,
    },
  })

  const demoExpiresAt = new Date(Date.now() + DEMO_DURATION_DAYS * 24 * 60 * 60 * 1000)

  const company = await prisma.company.create({
    data: {
      name: DEMO_COMPANY_NAME,
      address: DEMO_ADDRESS,
      phone: DEMO_PHONE,
      vatNumber: DEMO_VAT,
      adminId: admin.id,
      planId: teamPlan.id,
      isDemo: true,
      demoExpiresAt,
      contactEmail: adminEmail,
    },
  })

  await prisma.user.update({ where: { id: admin.id }, data: { companyId: company.id } })

  // Fictitious employee emails are suffixed with a slug unique to this company
  // — User.email is @unique globally, so a 2nd demo would otherwise collide
  // with the hardcoded addresses reused across every prospect instance.
  const emailSuffix = company.id.slice(-6)

  const employees: Array<{ id: string; hoursPerDay: number }> = []
  for (const def of EMPLOYEE_DEFS) {
    const emp = await prisma.user.create({
      data: {
        name: def.name,
        email: `${def.localPart}.${emailSuffix}@dupont-demo.be`,
        password: hashedPwd,
        role: def.role,
        companyId: company.id,
      },
    })
    employees.push({ id: emp.id, hoursPerDay: def.hoursPerDay })
  }

  const days = workdays(DEMO_DURATION_DAYS)
  for (const emp of employees) {
    const variance = () => Math.floor(Math.random() * 20) - 10 // ±10 min

    for (const daysBack of days) {
      if (Math.random() < 0.1) continue // ~10% absence

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
          duration: Math.round(workMin),
          date: arrival,
        },
      })
    }
  }

  const team = await prisma.team.create({
    data: { name: 'Équipe Commerciale', companyId: company.id },
  })
  for (const emp of employees.slice(0, 3)) {
    await prisma.teamMember.create({ data: { userId: emp.id, teamId: team.id } })
  }

  return { companyId: company.id, password }
}

export async function deleteDemoCompany(companyId: string): Promise<void> {
  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) return

  // Company.adminId → User.id is ON DELETE RESTRICT, so members must go first,
  // then the company (which frees the admin's row), then the admin last.
  const members = await prisma.user.findMany({
    where: { companyId: company.id, NOT: { id: company.adminId } },
    select: { id: true },
  })
  for (const m of members) {
    await prisma.clockRecord.deleteMany({ where: { userId: m.id } })
    await prisma.user.delete({ where: { id: m.id } })
  }

  await prisma.clockRecord.deleteMany({ where: { userId: company.adminId } })
  await prisma.company.delete({ where: { id: company.id } })
  await prisma.user.delete({ where: { id: company.adminId } })
}
