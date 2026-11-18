/**
 * Lower-cases and trims User.email for accounts created before emails were
 * normalized. Such accounts could not log in with a lower-case address and
 * never received the password-reset mail.
 *
 * Dry run by default (read-only, lists what would change). Pass --apply to write.
 * An address whose lower-case form already belongs to another account is never
 * touched: it is reported as a collision to resolve by hand.
 *
 * Prod (script piped through stdin, nothing to deploy):
 *   ssh root@141.94.102.226 "pct exec 106 -- bash -c 'cd /opt/pointon && docker compose run --rm -T app sh -c \"node -\"'" < scripts/normalize-emails.js
 *   ssh root@141.94.102.226 "pct exec 106 -- bash -c 'cd /opt/pointon && docker compose run --rm -T app sh -c \"node - --apply\"'" < scripts/normalize-emails.js
 * Dev:
 *   node scripts/normalize-emails.js [--apply]
 */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')

const normalize = (email) => email.trim().toLowerCase()

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } })
  const owners = new Map()
  for (const u of users) {
    const key = normalize(u.email)
    owners.set(key, [...(owners.get(key) ?? []), u])
  }

  const toFix = users.filter((u) => u.email !== normalize(u.email))
  let fixed = 0
  let collisions = 0

  for (const u of toFix) {
    const target = normalize(u.email)
    if (owners.get(target).length > 1) {
      collisions++
      console.log(`COLLISION  ${u.email}  (${owners.get(target).length} accounts share ${target}) — skipped`)
      continue
    }
    console.log(`${apply ? 'FIXED     ' : 'WOULD FIX '} ${u.email}  ->  ${target}`)
    if (apply) {
      await prisma.user.update({ where: { id: u.id }, data: { email: target } })
      fixed++
    }
  }

  console.log(
    `\n${users.length} users, ${toFix.length} with capitals/spaces, ` +
      `${apply ? `${fixed} fixed` : 'dry run (use --apply to write)'}, ${collisions} collision(s)`,
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
