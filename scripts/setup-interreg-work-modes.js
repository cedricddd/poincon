/**
 * Copies the work codes shown in the Interreg demo (PR / TT / MIS) to the real Interreg company.
 * No personal data is read or written: only WorkMode rows and the company meal break setting.
 *
 * Dry run (default):  node scripts/setup-interreg-work-modes.js
 * Apply:              node scripts/setup-interreg-work-modes.js --apply
 * Prod (no deploy needed, script sent on stdin):
 *   docker compose exec -T app node - --apply < scripts/setup-interreg-work-modes.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const ADMIN_EMAIL = 'danielle.houart@interreg-fwvl.org'
const APPLY = process.argv.includes('--apply')

// Same rules as scripts/seed-interreg-demo.ts, validated during the 2026-11-04 demo.
const MODES = [
  { code: 'PR', label: 'Bureau', boniCapMinutes: null, dailyMaxMinutes: 540, latestClockTime: '18:30', payrollFlag: null, blockArrivalAfterLatest: true, isDefault: true, sortOrder: 0 },
  { code: 'TT', label: 'Télétravail', boniCapMinutes: 0, dailyMaxMinutes: null, latestClockTime: null, payrollFlag: null, blockArrivalAfterLatest: false, isDefault: false, sortOrder: 1 },
  { code: 'MIS', label: 'Missions externes', boniCapMinutes: null, dailyMaxMinutes: null, latestClockTime: null, payrollFlag: 'no_social_transport', blockArrivalAfterLatest: false, isDefault: false, sortOrder: 2 },
]

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL }, select: { id: true } })
  if (!admin) throw new Error(`Admin ${ADMIN_EMAIL} not found`)
  const company = await prisma.company.findUnique({
    where: { adminId: admin.id },
    select: { id: true, name: true, isDemo: true, mealBreakEnabled: true, plan: { select: { name: true } } },
  })
  if (!company) throw new Error('Company not found')
  if (company.isDemo) throw new Error('Refusing to touch a demo company')

  const flag = await prisma.companyFeatureFlag.findUnique({
    where: { companyId_flag: { companyId: company.id, flag: 'work_rules' } },
  })
  const existing = await prisma.workMode.findMany({ where: { companyId: company.id }, select: { code: true } })

  console.log(`Company   : ${company.name} (${company.id})`)
  console.log(`Plan      : ${company.plan?.name ?? 'FREE'} · work_rules flag: ${flag?.enabled ? 'ON' : 'OFF'}`)
  console.log(`Meal break: ${company.mealBreakEnabled ? 'ON' : 'OFF'} → ON`)
  console.log(`Codes now : ${existing.map(m => m.code).join(', ') || '(none)'}`)
  for (const m of MODES) {
    console.log(`  ${existing.some(e => e.code === m.code) ? 'update' : 'create'} ${m.code} — ${m.label}`)
  }

  if (!APPLY) {
    console.log('\nDry run, nothing written. Re-run with --apply.')
    return
  }

  await prisma.$transaction([
    ...MODES.map(m => prisma.workMode.upsert({
      where: { companyId_code: { companyId: company.id, code: m.code } },
      create: { ...m, companyId: company.id },
      update: m,
    })),
    prisma.company.update({ where: { id: company.id }, data: { mealBreakEnabled: true } }),
  ])
  console.log('\nDone: 3 work codes + meal break written.')
}

main()
  .catch(e => { console.error(e.message); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
