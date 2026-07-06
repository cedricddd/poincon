import { prisma } from '@/lib/prisma'
import { getCompanyPlan, planCanAccess } from '@/lib/plan'
import { rateLimit } from '@/lib/rateLimit'
import { logAudit } from '@/lib/audit'
import { closeClockRecord } from '@/lib/clock'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

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
    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN invalide' }, { status: 400 })
    }

    // Find matching user in company
    const usersWithPin = await prisma.user.findMany({
      where: { companyId: kioskToken.companyId, active: true, deletedAt: null, kioskPin: { not: null } },
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
      return NextResponse.json({ error: 'PIN incorrect' }, { status: 401 })
    }

    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

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
