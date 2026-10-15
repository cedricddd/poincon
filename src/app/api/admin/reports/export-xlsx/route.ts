import { NextRequest, NextResponse } from 'next/server'
import { requireAdminWithCompany } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { brusselsDateKey, brusselsDayOffset, brusselsMidnightFromDateString } from '@/lib/clock'
import { LEAVE_TYPE_LABEL_FR } from '@/lib/leaveTypes'
import { hasWorkRules } from '@/lib/work-modes'
import { baseMinutesFromHours, type WorkModeRules } from '@/lib/boni-mali'
import { buildEmployeeReport, dayKeysBetween } from '@/lib/boni-mali-report'
import { buildBoniMaliWorkbook, type EmployeeSheet } from '@/lib/boni-mali-xlsx'

// Boni/Mali timesheet export (.xlsx) — feature flag work_rules.
// GET ?from=YYYY-MM-DD&to=YYYY-MM-DD[&userId=…]  (default: current month to date, max 93 days)

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_DAYS = 93
const DEFAULT_HOURS_PER_DAY = 8

const toRules = (m: { code: string; label: string; boniCapMinutes: number | null; dailyMaxMinutes: number | null; latestClockTime: string | null; payrollFlag: string | null } | null): WorkModeRules | null =>
  m && { code: m.code, label: m.label, boniCapMinutes: m.boniCapMinutes, dailyMaxMinutes: m.dailyMaxMinutes, latestClockTime: m.latestClockTime, payrollFlag: m.payrollFlag }

export async function GET(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const companyId = auth.admin.companyId
  if (!await hasWorkRules(companyId)) return NextResponse.json({ error: 'Fonctionnalité non activée' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const today = brusselsDateKey(new Date())
  const from = searchParams.get('from') || `${today.slice(0, 8)}01`
  const to = searchParams.get('to') || today
  const userId = searchParams.get('userId') || undefined
  if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) {
    return NextResponse.json({ error: 'Période invalide' }, { status: 400 })
  }
  if (dayKeysBetween(from, to).length > MAX_DAYS) {
    return NextResponse.json({ error: `Période limitée à ${MAX_DAYS} jours` }, { status: 400 })
  }

  const rangeStart = brusselsMidnightFromDateString(from)
  const rangeEnd = brusselsDayOffset(brusselsMidnightFromDateString(to), 1)

  const [users, modes] = await Promise.all([
    prisma.user.findMany({
      where: { companyId, deletedAt: null, ...(userId ? { id: userId } : {}) },
      select: { id: true, name: true, email: true, userSchedule: { select: { hoursPerDay: true } } },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    }),
    prisma.workMode.findMany({ where: { companyId }, orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }] }),
  ])
  const userIds = users.map(u => u.id)

  const [records, timeOffs] = await Promise.all([
    prisma.clockRecord.findMany({
      where: { userId: { in: userIds }, arrivalTime: { gte: rangeStart, lt: rangeEnd } },
      select: {
        userId: true, arrivalTime: true, departureTime: true,
        breaks: { select: { startedAt: true, endedAt: true } },
        workMode: { select: { code: true, label: true, boniCapMinutes: true, dailyMaxMinutes: true, latestClockTime: true, payrollFlag: true } },
      },
    }),
    prisma.timeOffRequest.findMany({
      where: { userId: { in: userIds }, status: 'APPROVED', startDate: { lt: rangeEnd }, endDate: { gte: rangeStart } },
      select: { userId: true, startDate: true, endDate: true, leaveType: true },
    }),
  ])

  const defaultMode = toRules(modes.find(m => m.active && m.isDefault) ?? null)
  const periodKeys = new Set(dayKeysBetween(from, to))

  const employees: EmployeeSheet[] = users.map(u => {
    const leaves = new Map<string, string>()
    for (const tor of timeOffs.filter(x => x.userId === u.id)) {
      const label = LEAVE_TYPE_LABEL_FR[tor.leaveType as keyof typeof LEAVE_TYPE_LABEL_FR] ?? tor.leaveType
      for (const key of dayKeysBetween(brusselsDateKey(tor.startDate), brusselsDateKey(tor.endDate))) {
        if (periodKeys.has(key)) leaves.set(key, label)
      }
    }
    const { days, totals } = buildEmployeeReport({
      from,
      to,
      records: records.filter(r => r.userId === u.id).map(r => ({ ...r, workMode: toRules(r.workMode) })),
      baseMinutes: baseMinutesFromHours(u.userSchedule?.hoursPerDay ?? DEFAULT_HOURS_PER_DAY),
      leaves,
      defaultMode,
    })
    return { name: u.name ?? '', email: u.email, days, totals }
  })

  const buffer = await buildBoniMaliWorkbook({ employees, from, to, codes: modes.map(m => m.code) })

  await logAudit({
    userId: auth.admin.id, action: 'export_boni_mali', resource: 'report', resourceId: companyId,
    changes: { from, to, userId: userId ?? null, employees: employees.length },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="boni-mali_${from}_${to}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
