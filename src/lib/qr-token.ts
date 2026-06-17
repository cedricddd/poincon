import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'

export function generateToken(): string {
  return randomBytes(24).toString('hex') // 48-char hex
}

export function nextMidnightBrussels(): Date {
  const now = new Date()
  // Get current date in Brussels timezone (YYYY-MM-DD)
  const brusselsDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
  const [y, m, d] = brusselsDate.split('-').map(Number)

  // Compute Brussels UTC offset (works when server runs in UTC, as in Docker)
  const offsetMs =
    new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Brussels' })).getTime() -
    now.getTime()

  // Tomorrow midnight Brussels in UTC
  const midnight = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0) - offsetMs)

  // If less than 2h away, push to day-after-tomorrow (avoids very-short-lived tokens)
  if (midnight.getTime() - now.getTime() < 2 * 3_600_000) {
    return new Date(Date.UTC(y, m - 1, d + 2, 0, 0, 0) - offsetMs)
  }

  return midnight
}

export async function getOrRefreshSiteQrToken(siteId: string): Promise<string> {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { qrToken: true, qrTokenExpiresAt: true },
  })

  const now = new Date()
  if (site?.qrToken && site.qrTokenExpiresAt && site.qrTokenExpiresAt > now) {
    return site.qrToken
  }

  const token = generateToken()
  const expiresAt = nextMidnightBrussels()

  await prisma.site.update({
    where: { id: siteId },
    data: { qrToken: token, qrTokenExpiresAt: expiresAt },
  })

  return token
}

export async function forceRotateSiteQrToken(siteId: string): Promise<string> {
  const token = generateToken()
  const expiresAt = nextMidnightBrussels()

  await prisma.site.update({
    where: { id: siteId },
    data: { qrToken: token, qrTokenExpiresAt: expiresAt },
  })

  return token
}
