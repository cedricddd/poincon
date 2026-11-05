import { execFileSync } from 'child_process'

/**
 * Runs a Prisma snippet inside the dev app container and returns its JSON result.
 * The host port 5433 can be shadowed by a native Postgres, so the DB is only
 * reached from inside Docker. `prisma` and `bcrypt` are in scope; `ARGS` holds the input.
 */
export function db<T = unknown>(body: string, args: unknown = {}): T {
  const script = `
    const { PrismaClient } = require('@prisma/client')
    const bcrypt = require('bcryptjs')
    const prisma = new PrismaClient()
    const ARGS = ${JSON.stringify(args)}
    ;(async () => { ${body} })()
      .then(r => { process.stdout.write(JSON.stringify(r ?? null)) })
      .catch(e => { console.error(e); process.exitCode = 1 })
      .finally(() => prisma.$disconnect())
  `
  const out = execFileSync('docker', ['exec', '-i', 'pointon-app-dev', 'node', '-'], { input: script, encoding: 'utf8' })
  return JSON.parse(out) as T
}
