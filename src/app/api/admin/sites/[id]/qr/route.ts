import { requireAdminWithCompany, forbiddenError } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { getOrRefreshSiteQrToken, forceRotateSiteQrToken } from '@/lib/qr-token'
import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

async function resolveSite(siteId: string, companyId: string) {
  return prisma.site.findFirst({
    where: { id: siteId, companyId },
    select: { id: true, name: true, qrTokenExpiresAt: true },
  })
}

function qrUrl(token: string, req: NextRequest): string {
  const base = process.env.NEXTAUTH_URL ?? req.nextUrl.origin
  return `${base}/qr/${token}`
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const site = await resolveSite(params.id, auth.admin.companyId)
  if (!site) return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })

  const token = await getOrRefreshSiteQrToken(site.id)
  const url = qrUrl(token, req)

  const qrDataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 300,
    color: { dark: '#000000', light: '#ffffff' },
  })

  return NextResponse.json({
    token,
    url,
    qrDataUrl,
    siteId: site.id,
    siteName: site.name,
    expiresAt: site.qrTokenExpiresAt,
  })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const site = await resolveSite(params.id, auth.admin.companyId)
  if (!site) return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })

  const token = await forceRotateSiteQrToken(site.id)
  const url = qrUrl(token, req)

  const qrDataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 300,
    color: { dark: '#000000', light: '#ffffff' },
  })

  return NextResponse.json({
    token,
    url,
    qrDataUrl,
    siteId: site.id,
    siteName: site.name,
    expiresAt: null,
  })
}
