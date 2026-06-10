import crypto from 'crypto'

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `pk_${crypto.randomBytes(32).toString('hex')}`
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  const prefix = raw.slice(0, 10)
  return { raw, hash, prefix }
}

export function hashApiKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}
