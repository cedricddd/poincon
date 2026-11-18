import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { companyHasAddon, getCompanyPlan, planCanAccess } from '@/lib/plan'
import { logAudit } from '@/lib/audit'
import { KIOSK_DISPLAY_MODES, isDynamicQrMode, isValidInterval, generateQrPublicId, generateQrSecret } from '@/lib/kiosk-qr'
import { publicTerminal } from '@/lib/kiosk-qr-server'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdminToken(req: NextRequest, id: string) {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, companyId: true },
  })
  if (!isAdminRole(user?.role) || !user?.companyId) return null
  const token = await prisma.kioskToken.findUnique({ where: { id } })
  if (!token || token.companyId !== user.companyId) return null
  return { ...token, adminId: session.user.id }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = await requireAdminToken(req, id)
    if (!token) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const updates: Record<string, unknown> = {}

    if ('theme' in body) {
      if (!['dark', 'light'].includes(body.theme)) {
        return NextResponse.json({ error: 'Thème invalide' }, { status: 400 })
      }
      updates.theme = body.theme
    }
    if ('visitorsEnabled' in body) {
      if (typeof body.visitorsEnabled !== 'boolean') {
        return NextResponse.json({ error: 'visitorsEnabled invalide' }, { status: 400 })
      }
      updates.visitorsEnabled = body.visitorsEnabled
    }
    if ('siteId' in body) {
      if (body.siteId) {
        const site = await prisma.site.findFirst({
          where: { id: body.siteId, companyId: token.companyId },
        })
        if (!site) return NextResponse.json({ error: 'Site introuvable' }, { status: 400 })
      }
      updates.siteId = body.siteId ?? null
    }

    const advancedFieldsRequested = ['logoUrl', 'accentColor', 'autoRotateEnabled', 'autoRotateIntervalHours'].some(k => k in body)
    if (advancedFieldsRequested) {
      if (!await companyHasAddon(token.companyId, 'addon_kiosk_advanced')) {
        return NextResponse.json({ error: 'Add-on Kiosk avancé requis' }, { status: 403 })
      }
      if ('logoUrl' in body) updates.logoUrl = body.logoUrl ?? null
      if ('accentColor' in body) {
        if (body.accentColor !== null && !/^#[0-9a-fA-F]{6}$/.test(body.accentColor)) {
          return NextResponse.json({ error: 'accentColor invalide (format #RRGGBB)' }, { status: 400 })
        }
        updates.accentColor = body.accentColor ?? null
      }
      if ('autoRotateEnabled' in body) {
        if (typeof body.autoRotateEnabled !== 'boolean') {
          return NextResponse.json({ error: 'autoRotateEnabled invalide' }, { status: 400 })
        }
        updates.autoRotateEnabled = body.autoRotateEnabled
        if (!body.autoRotateEnabled) updates.autoRotateIntervalHours = null
      }
      if ('autoRotateIntervalHours' in body) {
        const hours = Number(body.autoRotateIntervalHours)
        if (!Number.isInteger(hours) || hours < 24 || hours > 8760) {
          return NextResponse.json({ error: 'autoRotateIntervalHours doit être entre 24 et 8760 heures' }, { status: 400 })
        }
        updates.autoRotateIntervalHours = hours
      }
    }

    // Dynamic QR (all plans with the kiosk): display mode and code interval.
    if ('displayMode' in body) {
      if (!(KIOSK_DISPLAY_MODES as readonly unknown[]).includes(body.displayMode)) {
        return NextResponse.json({ error: 'displayMode invalide' }, { status: 400 })
      }
      if (isDynamicQrMode(body.displayMode)) {
        const plan = await getCompanyPlan(token.companyId)
        if (!planCanAccess(plan, 'kiosk')) {
          return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
        }
        // The QR id and secret are created once and kept, so switching modes does not break anything.
        if (!token.qrPublicId) updates.qrPublicId = generateQrPublicId()
        if (!token.qrSecret) updates.qrSecret = generateQrSecret()
      }
      updates.displayMode = body.displayMode
    }
    if ('qrIntervalSeconds' in body) {
      if (!isValidInterval(body.qrIntervalSeconds)) {
        return NextResponse.json({ error: 'qrIntervalSeconds doit valoir 30 ou 60' }, { status: 400 })
      }
      updates.qrIntervalSeconds = body.qrIntervalSeconds
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucune donnée' }, { status: 400 })
    }

    const updated = await prisma.kioskToken.update({
      where: { id },
      data: updates,
      include: { site: { select: { id: true, name: true } } },
    })

    if ('displayMode' in updates || 'qrIntervalSeconds' in updates) {
      await logAudit({
        userId: token.adminId,
        action: 'settings_change',
        resource: 'kioskToken',
        resourceId: token.id,
        changes: {
          before: { displayMode: token.displayMode, qrIntervalSeconds: token.qrIntervalSeconds },
          after: { displayMode: updated.displayMode, qrIntervalSeconds: updated.qrIntervalSeconds },
        },
        ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
      })
    }

    return NextResponse.json(publicTerminal(updated))
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = await requireAdminToken(req, id)
    if (!token) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.kioskToken.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
