import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `pk_${crypto.randomBytes(32).toString('hex')}`
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  const prefix = raw.slice(0, 10)
  return { raw, hash, prefix }
}

export function hashApiKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export interface VerifiedApiKey {
  companyId: string
  keyId: string
}

export async function verifyApiKey(rawKey: string | null): Promise<VerifiedApiKey | null> {
  if (!rawKey || !rawKey.startsWith('pk_')) return null

  const hash = hashApiKey(rawKey)
  const record = await prisma.apiKey.findUnique({ where: { keyHash: hash } })
  if (!record) return null
  if (record.expiresAt && record.expiresAt < new Date()) return null

  // Best-effort — ne bloque jamais la requête si l'update échoue.
  prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } }).catch(() => {})

  return { companyId: record.companyId, keyId: record.id }
}
