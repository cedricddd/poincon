/**
 * Read-only audit: lists employees sharing the same kiosk/QR PIN within a company.
 * PINs are never printed. No writes.
 *
 * Prod (script piped through stdin, nothing to deploy):
 *   ssh root@141.94.102.226 "pct exec 106 -- bash -c 'cd /opt/pointon && docker compose run --rm -T app sh -c \"npm install bcryptjs --no-save --quiet >/dev/null 2>&1; node -\"'" < scripts/find-duplicate-pins.js
 * Dev:
 *   node scripts/find-duplicate-pins.js
 */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()
const ALL_PINS = Array.from({ length: 10000 }, (_, i) => String(i).padStart(4, '0'))

async function main() {
  const users = await prisma.user.findMany({
    where: { active: true, deletedAt: null, kioskPin: { not: null }, companyId: { not: null } },
    select: { id: true, name: true, email: true, kioskPin: true, companyMember: { select: { id: true, name: true, isDemo: true } } },
    orderBy: { companyId: 'asc' },
  })

  const byCompany = new Map()
  for (const u of users) {
    if (!byCompany.has(u.companyMember.id)) byCompany.set(u.companyMember.id, { company: u.companyMember, users: [] })
    byCompany.get(u.companyMember.id).users.push(u)
  }

  console.log(`${users.length} employees with a PIN across ${byCompany.size} companies\n`)
  let totalGroups = 0

  for (const { company, users: members } of byCompany.values()) {
    const started = Date.now()
    const groups = new Map() // pin -> users (pin kept in memory only)
    for (const u of members) {
      const pin = ALL_PINS.find(p => bcrypt.compareSync(p, u.kioskPin))
      if (!pin) continue
      if (!groups.has(pin)) groups.set(pin, [])
      groups.get(pin).push(u)
    }
    const dups = [...groups.values()].filter(g => g.length > 1)
    totalGroups += dups.length
    const label = `${company.name}${company.isDemo ? ' [demo]' : ''}`
    const secs = ((Date.now() - started) / 1000).toFixed(0)
    if (dups.length === 0) {
      console.log(`OK   ${label} — ${members.length} PINs, no duplicate (${secs}s)`)
      continue
    }
    console.log(`DUP  ${label} — ${dups.length} shared PIN(s) among ${members.length} (${secs}s)`)
    dups.forEach((g, i) => {
      console.log(`     group ${i + 1}: ${g.map(u => `${u.name ?? '?'} <${u.email}>`).join(', ')}`)
    })
  }

  console.log(`\n${totalGroups === 0 ? 'No duplicate PIN found.' : `${totalGroups} duplicate group(s) found — fix before deploying.`}`)
}

main()
  .catch(err => { console.error(err); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
