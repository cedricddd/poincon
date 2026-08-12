import { prisma } from '@/lib/prisma'
import { getCompanyPlan, planCanAccess } from '@/lib/plan'
import { rateLimit } from '@/lib/rateLimit'
import { logAudit } from '@/lib/audit'
import { closeClockRecord, brusselsDayRange } from '@/lib/clock'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const site = await prisma.site.findUnique({
    where: { qrToken: token },
    select: {
      name: true,
      active: true,
      company: { select: { name: true, logoUrl: true } },
    },
  })
  if (!site || !site.active) {
    return NextResponse.json({ error: 'QR code invalide' }, { status: 404 })
  }
  return NextResponse.json({
    siteName: site.name,
    companyName: site.company.name,
    logoUrl: site.company.logoUrl,
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
    const rl = rateLimit(`qr-clock:${ip}:${token}`, 30, 5 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans 5 minutes.' }, { status: 429 })
    }

    const site = await prisma.site.findUnique({
      where: { qrToken: token },
      select: {
        id: true,
        active: true,
        company: { select: { id: true, name: true, logoUrl: true, mealBreakEnabled: true } },
      },
    })

    if (!site || !site.active) {
      return NextResponse.json({ error: 'QR code invalide' }, { status: 404 })
    }

    const plan = await getCompanyPlan(site.company.id)
    if (!planCanAccess(plan, 'kiosk')) {
      return NextResponse.json({ error: 'Fonctionnalité non disponible sur votre plan' }, { status: 403 })
    }

    const { pin, action } = await req.json()
    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN invalide' }, { status: 400 })
    }
    if (action && !['clock_out', 'break_start', 'break_end'].includes(action)) {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }

    const usersWithPin = await prisma.user.findMany({
      where: { companyId: site.company.id, active: true, deletedAt: null, kioskPin: { not: null } },
      select: { id: true, name: true, kioskPin: true },
    })

    let matchedUser: { id: string; name: string } | null = null
    for (const u of usersWithPin) {
      if (u.kioskPin && await bcrypt.compare(pin, u.kioskPin)) {
        matchedUser = { id: u.id, name: u.name ?? 'Employé' }
        break
      }
    }
    if (!matchedUser) {
      const rlFail = rateLimit(`qr-fail:${ip}:${token}`, 10, 5 * 60 * 1000)
      if (!rlFail.allowed) {
        return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans 5 minutes.' }, { status: 429 })
      }
      return NextResponse.json({ error: 'PIN incorrect' }, { status: 401 })
    }

    const firstName = matchedUser.name.split(' ')[0]
    const now = new Date()
    const { start: today, end: tomorrow } = brusselsDayRange(now)

    const openRecord = await prisma.clockRecord.findFirst({
      where: { userId: matchedUser.id, date: { gte: today, lt: tomorrow }, departureTime: null },
    })

    if (!openRecord) {
      const record = await prisma.clockRecord.create({
        data: {
          userId: matchedUser.id,
          arrivalTime: now,
          location: 'QR Code',
          siteId: site.id,
        },
      })
      await prisma.company.update({ where: { id: site.company.id }, data: { lastActivityAt: now } })
      await logAudit({
        userId: matchedUser.id,
        action: 'kiosk_clock_in',
        resource: 'clockRecord',
        resourceId: record.id,
        changes: { via: 'qr', token },
        ipAddress: ip,
      })
      return NextResponse.json({
        action: 'clock_in',
        firstName,
        userName: matchedUser.name,
        time: now.toISOString(),
        logoUrl: site.company.logoUrl,
        companyName: site.company.name,
      })
    }

    const mealBreakEnabled = site.company.mealBreakEnabled

    if (!action) {
      if (!mealBreakEnabled) {
        // Auto clock-out — comportement inchangé pour les sociétés sans pause pointée
        const { finalDuration } = await closeClockRecord({
          userId: matchedUser.id,
          record: openRecord,
          departureTime: now,
        })
        await prisma.company.update({ where: { id: site.company.id }, data: { lastActivityAt: now } })
        await logAudit({
          userId: matchedUser.id,
          action: 'kiosk_clock_out',
          resource: 'clockRecord',
          resourceId: openRecord.id,
          changes: { via: 'qr', token, duration: finalDuration },
          ipAddress: ip,
        })
        return NextResponse.json({
          action: 'clock_out',
          firstName,
          userName: matchedUser.name,
          time: now.toISOString(),
          logoUrl: site.company.logoUrl,
          companyName: site.company.name,
        })
      }

      // Pause pointée activée : aucune mutation, l'employé choisit ensuite
      const openBreak = await prisma.breakEntry.findFirst({
        where: { clockRecordId: openRecord.id, endedAt: null },
        select: { startedAt: true },
      })
      return NextResponse.json({
        action: 'choice',
        hasOpenBreak: !!openBreak,
        breakStartedAt: openBreak?.startedAt.toISOString(),
        firstName,
        userName: matchedUser.name,
        logoUrl: site.company.logoUrl,
        companyName: site.company.name,
      })
    }

    if (action === 'clock_out') {
      const { finalDuration } = await closeClockRecord({
        userId: matchedUser.id,
        record: openRecord,
        departureTime: now,
      })
      await prisma.company.update({ where: { id: site.company.id }, data: { lastActivityAt: now } })
      await logAudit({
        userId: matchedUser.id,
        action: 'kiosk_clock_out',
        resource: 'clockRecord',
        resourceId: openRecord.id,
        changes: { via: 'qr', token, duration: finalDuration },
        ipAddress: ip,
      })
      return NextResponse.json({
        action: 'clock_out',
        firstName,
        userName: matchedUser.name,
        time: now.toISOString(),
        logoUrl: site.company.logoUrl,
        companyName: site.company.name,
      })
    }

    // break_start / break_end
    if (!mealBreakEnabled) {
      return NextResponse.json({ error: 'Pause non activée pour votre société' }, { status: 403 })
    }
    const openBreak = await prisma.breakEntry.findFirst({
      where: { clockRecordId: openRecord.id, endedAt: null },
    })

    if (action === 'break_start') {
      if (openBreak) {
        return NextResponse.json({ error: 'Pause déjà en cours' }, { status: 409 })
      }
      await prisma.breakEntry.create({ data: { clockRecordId: openRecord.id, startedAt: now } })
      await logAudit({
        userId: matchedUser.id,
        action: 'kiosk_break_start',
        resource: 'clockRecord',
        resourceId: openRecord.id,
        changes: { via: 'qr' },
        ipAddress: ip,
      })
      return NextResponse.json({
        action: 'break_start',
        firstName,
        userName: matchedUser.name,
        time: now.toISOString(),
        logoUrl: site.company.logoUrl,
        companyName: site.company.name,
      })
    }

    // break_end
    if (!openBreak) {
      return NextResponse.json({ error: 'Aucune pause en cours' }, { status: 409 })
    }
    const durationMinutes = Math.round((now.getTime() - openBreak.startedAt.getTime()) / 60000)
    await prisma.breakEntry.update({ where: { id: openBreak.id }, data: { endedAt: now } })
    await logAudit({
      userId: matchedUser.id,
      action: 'kiosk_break_end',
      resource: 'clockRecord',
      resourceId: openRecord.id,
      changes: { via: 'qr', durationMinutes },
      ipAddress: ip,
    })
    return NextResponse.json({
      action: 'break_end',
      firstName,
      userName: matchedUser.name,
      time: now.toISOString(),
      logoUrl: site.company.logoUrl,
      companyName: site.company.name,
    })
  } catch (err) {
    console.error('QR clock error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
