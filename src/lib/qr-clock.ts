import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rateLimit'
import { logAudit } from '@/lib/audit'
import { closeClockRecord, brusselsDayRange } from '@/lib/clock'
import { findUsersByPin, PIN_REGEX } from '@/lib/kiosk-pin'
import type { QrAccess } from '@/lib/qr-access'
import { resolveWorkMode, checkArrivalAllowed } from '@/lib/work-modes'
import { NextResponse } from 'next/server'

// Clocking from a scanned QR code, shared by the printed site QR (/api/qr/[token]/clock) and the
// dynamic QR shown on a kiosk terminal (/api/qr/t/[id]/clock). The caller has already checked the
// QR itself, the plan and the session (resolveQrAccess); this handles who clocks and what happens.

export type QrClockCompany = {
  id: string
  name: string
  logoUrl: string | null
  mealBreakEnabled: boolean
}

export type QrClockInput = {
  company: QrClockCompany
  /** Site recorded on the clock-in (the terminal's site may be null = all sites). */
  siteId: string | null
  access: Extract<QrAccess, { kind: 'account' } | { kind: 'pin' }>
  body: { pin?: unknown; action?: unknown }
  ip: string
  /** Rate-limit key of the QR (site token or dynamic QR id). */
  rateKey: string
  /** Audit trail: `via` plus the reference of the QR, merged into clock-in/out entries. */
  audit: { via: 'qr' | 'qr_dynamic'; ref: Record<string, string>; resource: 'site' | 'kioskToken'; resourceId: string }
}

const ACTIONS = ['clock_out', 'break_start', 'break_end'] as const
type Action = typeof ACTIONS[number]

export async function handleQrClock(input: QrClockInput): Promise<NextResponse> {
  const { company, siteId, access, body, ip, rateKey, audit } = input
  const action = body.action as Action | undefined
  if (action !== undefined && action !== null && !(ACTIONS as readonly unknown[]).includes(action)) {
    return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  }

  let matchedUser: { id: string; name: string }
  if (access.kind === 'account') {
    matchedUser = access.user
  } else {
    const pin = body.pin
    if (typeof pin !== 'string' || !PIN_REGEX.test(pin)) {
      return NextResponse.json({ error: 'PIN invalide' }, { status: 400 })
    }
    const matches = await findUsersByPin(company.id, pin)
    if (matches.length === 0) {
      const rlFail = rateLimit(`qr-fail:${ip}:${rateKey}`, 10, 5 * 60 * 1000)
      if (!rlFail.allowed) {
        return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans 5 minutes.' }, { status: 429 })
      }
      return NextResponse.json({ error: 'PIN incorrect' }, { status: 401 })
    }
    if (matches.length > 1) {
      await logAudit({
        userId: matches[0].id,
        action: 'kiosk_pin_ambiguous',
        resource: audit.resource,
        resourceId: audit.resourceId,
        changes: { via: audit.via, userIds: matches.map(m => m.id) },
        ipAddress: ip,
      })
      return NextResponse.json(
        { error: 'Ce PIN est partagé par plusieurs employés. Contactez votre administrateur.', code: 'PIN_AMBIGUOUS' },
        { status: 409 }
      )
    }
    matchedUser = matches[0]
  }

  const firstName = matchedUser.name.split(' ')[0]
  const now = new Date()
  const { start: today, end: tomorrow } = brusselsDayRange(now)
  const reply = (data: Record<string, unknown>) => NextResponse.json({
    ...data,
    firstName,
    userName: matchedUser.name,
    logoUrl: company.logoUrl,
    companyName: company.name,
  })

  const openRecord = await prisma.clockRecord.findFirst({
    where: { userId: matchedUser.id, date: { gte: today, lt: tomorrow }, departureTime: null },
  })

  if (!openRecord) {
    // With work codes on, a QR applies the company's default code and its arrival rules.
    const resolved = await resolveWorkMode(company.id)
    const workMode = (resolved && 'mode' in resolved ? resolved.mode : null) ?? null
    const refused = checkArrivalAllowed(workMode, now, true)
    if (refused) return NextResponse.json(refused.body, { status: refused.status })

    const record = await prisma.clockRecord.create({
      data: {
        userId: matchedUser.id,
        arrivalTime: now,
        location: 'QR Code',
        ...(siteId && { siteId }),
        ...(workMode && { workModeId: workMode.id }),
      },
    })
    await prisma.company.update({ where: { id: company.id }, data: { lastActivityAt: now } })
    await logAudit({
      userId: matchedUser.id,
      action: 'kiosk_clock_in',
      resource: 'clockRecord',
      resourceId: record.id,
      changes: { via: audit.via, ...audit.ref, workModeId: record.workModeId },
      ipAddress: ip,
    })
    return reply({ action: 'clock_in', time: now.toISOString() })
  }

  const clockOut = async () => {
    const { finalDuration } = await closeClockRecord({
      userId: matchedUser.id,
      record: openRecord,
      departureTime: now,
    })
    await prisma.company.update({ where: { id: company.id }, data: { lastActivityAt: now } })
    await logAudit({
      userId: matchedUser.id,
      action: 'kiosk_clock_out',
      resource: 'clockRecord',
      resourceId: openRecord.id,
      changes: { via: audit.via, ...audit.ref, duration: finalDuration },
      ipAddress: ip,
    })
    return reply({ action: 'clock_out', time: now.toISOString() })
  }

  if (!action) {
    // Without a clocked meal break, a second scan is the departure.
    if (!company.mealBreakEnabled) return clockOut()

    // Clocked break enabled: no mutation, the employee chooses next.
    const openBreak = await prisma.breakEntry.findFirst({
      where: { clockRecordId: openRecord.id, endedAt: null },
      select: { startedAt: true },
    })
    return reply({
      action: 'choice',
      hasOpenBreak: !!openBreak,
      breakStartedAt: openBreak?.startedAt.toISOString(),
    })
  }

  if (action === 'clock_out') return clockOut()

  // break_start / break_end
  if (!company.mealBreakEnabled) {
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
      changes: { via: audit.via },
      ipAddress: ip,
    })
    return reply({ action: 'break_start', time: now.toISOString() })
  }

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
    changes: { via: audit.via, durationMinutes },
    ipAddress: ip,
  })
  return reply({ action: 'break_end', time: now.toISOString() })
}
