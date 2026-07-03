import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { companyHasAddon } from '@/lib/plan'
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
  return token
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

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucune donnée' }, { status: 400 })
    }

    const updated = await prisma.kioskToken.update({
      where: { id },
      data: updates,
      include: { site: { select: { id: true, name: true } } },
    })
    return NextResponse.json(updated)
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
