/**
 * Demo company for the Interreg FWVL prospect — work codes TT / PR / MIS and Boni/Mali rules.
 * Run: npx tsx scripts/seed-interreg-demo.ts   (idempotent: resets the demo company each run)
 *
 * The first employee replays, block by block, the September 2026 timesheet extract the prospect
 * sent, so the Boni/Mali Excel export can be compared line by line with their own file.
 * The admin must set up 2FA at first login, like any admin.
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const ADMIN_EMAIL = 'demo-interreg@pointon.be'
const PASSWORD = process.env.DEMO_PASSWORD ?? 'DemoInterreg2026!'
const COMPANY_NAME = 'Démo — Secrétariat conjoint'
const DEMO_EXPIRES_AT = new Date('2026-12-31T23:00:00Z')
const HOURS_PER_DAY = 7.6 // 7h36

type Row = [day: string, code: 'TT' | 'PR' | 'MIS', in1: string, out1: string, in2: string, out2: string]

// Extract of the prospect's timesheet (dates in September 2026).
const TIMESHEET: Row[] = [
  ['01', 'TT', '08:40', '13:00', '13:30', '16:50'],
  ['02', 'PR', '09:00', '13:00', '13:30', '17:45'],
  ['03', 'PR', '09:00', '13:00', '13:30', '18:00'],
  ['04', 'TT', '08:30', '13:00', '13:30', '16:30'],
  ['07', 'PR', '08:55', '13:00', '13:30', '17:45'],
  ['08', 'TT', '08:30', '13:00', '13:30', '16:50'],
  ['09', 'TT', '08:45', '13:00', '13:30', '16:55'],
  ['10', 'MIS', '08:30', '13:00', '13:30', '19:30'],
  ['11', 'TT', '08:30', '13:00', '13:30', '16:40'],
  ['14', 'PR', '09:00', '13:00', '13:30', '16:00'],
  ['15', 'PR', '09:00', '13:00', '13:30', '17:30'],
  ['16', 'TT', '08:30', '13:00', '13:30', '16:40'],
  ['17', 'TT', '08:30', '13:00', '13:30', '16:40'],
  ['18', 'MIS', '08:30', '13:00', '13:30', '19:45'],
  ['21', 'TT', '09:30', '13:00', '13:30', '16:45'],
  ['22', 'MIS', '08:30', '13:00', '13:30', '20:00'],
  ['23', 'TT', '09:30', '13:00', '13:30', '16:55'],
]

// Two more employees on the same days, shifted, so the summary sheet has several lines —
// including a PR day beyond 9 h and a departure after 18h30 to show the rules at work.
const shift = (hhmm: string, minutes: number) => {
  const [h, m] = hhmm.split(':').map(Number)
  const t = h * 60 + m + minutes
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}
const COLLEAGUE_A: Row[] = TIMESHEET.map(([d, code, a, b, c, e], i) =>
  [d, i % 3 === 0 ? 'PR' : code, shift(a, -15), b, c, i % 4 === 0 ? '19:00' : shift(e, 10)] as Row)
const COLLEAGUE_B: Row[] = TIMESHEET.map(([d, code, a, b, c, e], i) =>
  [d, code === 'MIS' ? 'TT' : code, shift(a, 20), b, c, i % 5 === 0 ? shift(e, -45) : e] as Row)

const EMPLOYEES: { name: string; email: string; rows: Row[] }[] = [
  { name: 'Agent démo 1 (extrait)', email: 'agent1@demo-interreg.pointon.be', rows: TIMESHEET },
  { name: 'Agent démo 2', email: 'agent2@demo-interreg.pointon.be', rows: COLLEAGUE_A },
  { name: 'Agent démo 3', email: 'agent3@demo-interreg.pointon.be', rows: COLLEAGUE_B },
]

const MODES = [
  { code: 'PR', label: 'Bureau', boniCapMinutes: null, dailyMaxMinutes: 540, latestClockTime: '18:30', payrollFlag: null, blockArrivalAfterLatest: true, isDefault: true, sortOrder: 0 },
  { code: 'TT', label: 'Télétravail', boniCapMinutes: 0, dailyMaxMinutes: null, latestClockTime: null, payrollFlag: null, isDefault: false, sortOrder: 1 },
  { code: 'MIS', label: 'Missions externes', boniCapMinutes: null, dailyMaxMinutes: null, latestClockTime: null, payrollFlag: 'no_social_transport', isDefault: false, sortOrder: 2 },
]

// September is summer time in Brussels (UTC+2).
const at = (day: string, hhmm: string) => new Date(`2026-09-${day}T${hhmm}:00+02:00`)

async function reset() {
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } })
  if (!admin) return
  const company = await prisma.company.findUnique({ where: { adminId: admin.id } })
  if (company) {
    const members = await prisma.user.findMany({ where: { companyId: company.id, NOT: { id: admin.id } } })
    for (const m of members) {
      await prisma.clockRecord.deleteMany({ where: { userId: m.id } })
      await prisma.user.delete({ where: { id: m.id } })
    }
    await prisma.clockRecord.deleteMany({ where: { userId: admin.id } })
    await prisma.company.delete({ where: { id: company.id } }) // cascades work modes and feature flags
  }
  await prisma.user.delete({ where: { email: ADMIN_EMAIL } })
  console.log('  ♻️  Previous demo removed')
}

async function main() {
  console.log('🎭 Seeding Interreg demo...')
  const plan = await prisma.plan.findUnique({ where: { name: 'BUSINESS' } })
  if (!plan) throw new Error('BUSINESS plan not found — run prisma/seed.js first')

  await reset()

  const password = await bcrypt.hash(PASSWORD, 10)
  const admin = await prisma.user.create({ data: { name: 'Admin démo', email: ADMIN_EMAIL, password, role: 'ADMIN' } })
  const company = await prisma.company.create({
    data: {
      name: COMPANY_NAME,
      address: 'Belgique',
      phone: '',
      vatNumber: '',
      adminId: admin.id,
      planId: plan.id,
      isDemo: true,
      demoExpiresAt: DEMO_EXPIRES_AT,
      onboardingCompleted: true,
      mealBreakEnabled: true,
      contactEmail: ADMIN_EMAIL,
    },
  })
  await prisma.user.update({ where: { id: admin.id }, data: { companyId: company.id } })
  await prisma.companyFeatureFlag.create({ data: { companyId: company.id, flag: 'work_rules', enabled: true } })

  await prisma.workMode.createMany({ data: MODES.map(m => ({ ...m, companyId: company.id })) })
  const modeId = Object.fromEntries(
    (await prisma.workMode.findMany({ where: { companyId: company.id } })).map(m => [m.code, m.id]))
  const modeLabel = Object.fromEntries(MODES.map(m => [m.code, m.label]))

  let total = 0
  for (const emp of EMPLOYEES) {
    const user = await prisma.user.create({
      data: { name: emp.name, email: emp.email, password, role: 'EMPLOYEE', companyId: company.id },
    })
    await prisma.userSchedule.create({ data: { userId: user.id, hoursPerDay: HOURS_PER_DAY } })

    // One record per block, as when the employee clocks out for lunch and back in.
    const data = emp.rows.flatMap(([day, code, in1, out1, in2, out2]) =>
      [[in1, out1], [in2, out2]].map(([a, b]) => {
        const arrivalTime = at(day, a)
        const departureTime = at(day, b)
        return {
          userId: user.id,
          arrivalTime,
          departureTime,
          duration: Math.round((departureTime.getTime() - arrivalTime.getTime()) / 60000),
          date: arrivalTime,
          location: modeLabel[code],
          workModeId: modeId[code],
        }
      }))
    await prisma.clockRecord.createMany({ data })
    total += data.length
  }

  console.log(`  👥 ${EMPLOYEES.length} employees, 🕐 ${total} clock records, codes ${MODES.map(m => m.code).join(' / ')}`)
  console.log('\n✅ Demo ready')
  console.log(`   Admin    : ${ADMIN_EMAIL}`)
  console.log(`   Employee : ${EMPLOYEES[0].email}`)
  console.log(`   Password : ${PASSWORD}`)
  console.log('   Export   : Rapports → « Export Excel Boni/Mali », période 01/09/2026 → 30/09/2026')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
