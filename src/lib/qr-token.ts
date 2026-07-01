import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'

export function generateToken(): string {
  return randomBytes(24).toString('hex') // 48-char hex
}

export async function getOrRefreshSiteQrToken(siteId: string): Promise<string> {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { qrToken: true },
  })

  if (site?.qrToken) {
    return site.qrToken
  }

  const token = generateToken()

  await prisma.site.update({
    where: { id: siteId },
    data: { qrToken: token },
  })

  return token
}

export async function forceRotateSiteQrToken(siteId: string): Promise<string> {
  const token = generateToken()

  await prisma.site.update({
    where: { id: siteId },
    data: { qrToken: token },
  })

  return token
}
