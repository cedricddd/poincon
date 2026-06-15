import { prisma } from '@/lib/prisma'
import { getCompanyPlan, planCanAccess } from '@/lib/plan'
import { rateLimit } from '@/lib/rateLimit'
import { logAudit } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

const OVERTIME_GRACE_MINUTES = 30

function computeShiftDuration(
  actualArrival: Date,
  actualDeparture: Date,
  startTimeStr: string | null | undefined,
  endTimeStr: string | null | undefined,
  hoursPerDay: number
): { duration: number; hoursWorked: number; hoursStandard: number } {
  if (!startTimeStr || !endTimeStr) {
    const duration = Math.round((actualDeparture.getTime() - actualArrival.getTime()) / 60000)
    return { duration, hoursWorked: duration / 60, hoursStandard: hoursPerDay }
  }

  const parseTime = (timeStr: string, ref: Date) => {
    const [h, m] = timeStr.split(':').map(Number)
    const d = new Date(ref)
    d.setHours(h, m, 0, 0)
    return d
  }

  const shiftStart = parseTime(startTimeStr, actualArrival)
  let shiftEnd = parseTime(endTimeStr, actualArrival)
  if (shiftEnd <= shiftStart) shiftEnd.setDate(shiftEnd.getDate() + 1)

  const effectiveArrival = actualArrival < shiftStart ? shiftStart : actualArrival
  const graceEnd = new Date(shiftEnd.getTime() + OVERTIME_GRACE_MINUTES * 60000)
  const effectiveDeparture = actualDeparture <= graceEnd ? shiftEnd : actualDeparture

  const duration = Math.round((effectiveDeparture.getTime() - effectiveArrival.getTime()) / 60000)
  const hoursStandard = Math.round((shiftEnd.getTime() - shiftStart.getTime()) / 60000) / 60

  return { duration, hoursWorked: duration / 60, hoursStandard }
}

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
    const userSchedule = await prisma.userSchedule.findUnique({
      where: { userId: matchedUser.id },
      include: { workSchedule: true },
    })

    const hoursPerDay = userSchedule?.hoursPerDay ?? 8
    const { duration: computedDuration, hoursWorked, hoursStandard } = computeShiftDuration(
      openRecord.arrivalTime,
      now,
      userSchedule?.workSchedule?.startTime,
      userSchedule?.workSchedule?.endTime,
      hoursPerDay
    )

    const openBreak = await prisma.breakEntry.findFirst({
      where: { clockRecordId: openRecord.id, endedAt: null },
    })
    if (openBreak) {
      await prisma.breakEntry.update({ where: { id: openBreak.id }, data: { endedAt: now } })
    }

    const allBreaks = await prisma.breakEntry.findMany({
      where: { clockRecordId: openRecord.id, endedAt: { not: null } },
      select: { startedAt: true, endedAt: true },
    })
    const totalBreakMinutes = allBreaks.reduce((sum, b) => {
      return sum + Math.round((b.endedAt!.getTime() - b.startedAt.getTime()) / 60000)
    }, 0)

    const finalDuration = Math.max(1, computedDuration - totalBreakMinutes)

    await prisma.clockRecord.update({
      where: { id: openRecord.id },
      data: { departureTime: now, duration: finalDuration },
    })

    await prisma.company.update({
      where: { id: kioskToken.companyId },
      data: { lastActivityAt: now },
    })

    if (finalDuration / 60 > hoursStandard) {
      await prisma.detectedOvertime.create({
        data: {
          userId: matchedUser.id,
          date: openRecord.date,
          hoursWorked: finalDuration / 60,
          hoursStandard,
          overtimeHours: finalDuration / 60 - hoursStandard,
          status: 'PENDING',
        },
      })
    }

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
