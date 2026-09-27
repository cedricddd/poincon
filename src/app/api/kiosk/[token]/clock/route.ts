import { prisma } from '@/lib/prisma'
import { getCompanyPlan, planCanAccess } from '@/lib/plan'
import { rateLimit } from '@/lib/rateLimit'
import { logAudit } from '@/lib/audit'
import { closeClockRecord, brusselsDayRange } from '@/lib/clock'
import { NextRequest, NextResponse } from 'next/server'
import { findUsersByPin, PIN_REGEX } from '@/lib/kiosk-pin'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
    const rl = rateLimit(`kiosk-clock:${ip}:${token}`, 10, 5 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans 5 minutes.' }, { status: 429 })
    }

    const kioskToken = await prisma.kioskToken.findUnique({
      where: { token },
      select: { companyId: true, siteId: true },
    })
    if (!kioskToken) return NextResponse.json({ error: 'Terminal introuvable' }, { status: 404 })

    const plan = await getCompanyPlan(kioskToken.companyId)
    if (!planCanAccess(plan, 'kiosk')) {
      return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
    }

    const { pin } = await req.json()
    if (!pin || !PIN_REGEX.test(pin)) {
      return NextResponse.json({ error: 'PIN invalide' }, { status: 400 })
    }

    const matches = await findUsersByPin(kioskToken.companyId, pin)
    if (matches.length === 0) {
      return NextResponse.json({ error: 'PIN incorrect' }, { status: 401 })
    }
    if (matches.length > 1) {
      await logAudit({
        userId: matches[0].id,
        action: 'kiosk_pin_ambiguous',
        resource: 'kioskToken',
        resourceId: token,
        changes: { via: 'kiosk', userIds: matches.map(m => m.id) },
        ipAddress: ip,
      })
      return NextResponse.json(
        { error: 'Ce PIN est partagé par plusieurs employés. Contactez votre administrateur.', code: 'PIN_AMBIGUOUS' },
        { status: 409 }
      )
    }
    const matchedUser = matches[0]

    const now = new Date()
    const { start: today, end: tomorrow } = brusselsDayRange(now)

    const openRecord = await prisma.clockRecord.findFirst({
      where: {
        userId: matchedUser.id,
        date: { gte: today, lt: tomorrow },
        departureTime: null,
      },
    })

    if (!openRecord) {
      // Clock in
      const record = await prisma.clockRecord.create({
        data: {
          userId: matchedUser.id,
          arrivalTime: now,
          location: 'Kiosque',
          ...(kioskToken.siteId ? { siteId: kioskToken.siteId } : {}),
        },
      })

      await prisma.company.update({
        where: { id: kioskToken.companyId },
        data: { lastActivityAt: now },
      })

      await logAudit({
        userId: matchedUser.id,
        action: 'kiosk_clock_in',
        resource: 'clockRecord',
        resourceId: record.id,
        changes: { via: 'kiosk', token },
        ipAddress: ip,
      })

      return NextResponse.json({ action: 'clock_in', userName: matchedUser.name, time: now.toISOString() })
    }

    // Clock out
    const { finalDuration } = await closeClockRecord({
      userId: matchedUser.id,
      record: openRecord,
      departureTime: now,
    })

    await prisma.company.update({
      where: { id: kioskToken.companyId },
      data: { lastActivityAt: now },
    })

    await logAudit({
      userId: matchedUser.id,
      action: 'kiosk_clock_out',
      resource: 'clockRecord',
      resourceId: openRecord.id,
      changes: { via: 'kiosk', token, duration: finalDuration },
      ipAddress: ip,
    })

    return NextResponse.json({ action: 'clock_out', userName: matchedUser.name, time: now.toISOString() })
  } catch (err) {
    console.error('Kiosk clock error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
