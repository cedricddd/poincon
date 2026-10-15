import { prisma } from '@/lib/prisma'

// Work codes (TT / PR / MIS…) are gated by the `work_rules` feature flag, toggled by the super-admin.
export const WORK_RULES_FLAG = 'work_rules'

export const PAYROLL_FLAGS = ['no_social_transport'] as const
export type PayrollFlag = typeof PAYROLL_FLAGS[number]

export async function hasWorkRules(companyId: string): Promise<boolean> {
  const flag = await prisma.companyFeatureFlag.findUnique({
    where: { companyId_flag: { companyId, flag: WORK_RULES_FLAG } },
    select: { enabled: true },
  })
  return flag?.enabled ?? false
}

/** Active work modes of a company, or [] when the feature is off (callers then keep the legacy modes). */
export async function getActiveWorkModes(companyId: string) {
  if (!await hasWorkRules(companyId)) return []
  return prisma.workMode.findMany({
    where: { companyId, active: true },
    orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
  })
}

/**
 * Resolves the mode a clock-in should carry: the requested one if it is an active mode of the
 * company (anti cross-tenant IDOR), otherwise the company default. Returns null when the feature is off.
 */
export async function resolveWorkMode(companyId: string, workModeId?: string | null) {
  const modes = await getActiveWorkModes(companyId)
  if (modes.length === 0) return null
  if (workModeId) {
    const requested = modes.find(m => m.id === workModeId)
    if (!requested) return { error: 'Invalid work mode' as const }
    return { mode: requested }
  }
  return { mode: modes.find(m => m.isDefault) ?? modes[0] }
}

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/** Validates an admin-submitted work mode payload. Returns the clean data or an error message. */
export function parseWorkModeInput(body: any): { data: {
  code: string
  label: string
  boniCapMinutes: number | null
  dailyMaxMinutes: number | null
  latestClockTime: string | null
  payrollFlag: string | null
  isDefault: boolean
  sortOrder: number
  active: boolean
} } | { error: string } {
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : ''
  const label = typeof body?.label === 'string' ? body.label.trim() : ''
  if (!/^[A-Z0-9_-]{1,10}$/.test(code)) return { error: 'Code invalide (1 à 10 caractères, lettres/chiffres)' }
  if (!label || label.length > 60) return { error: 'Libellé requis (60 caractères max)' }

  const optMinutes = (v: unknown, name: string): number | null | string => {
    if (v === null || v === undefined || v === '') return null
    const n = Number(v)
    if (!Number.isInteger(n) || n < 0 || n > 24 * 60) return `${name} invalide`
    return n
  }
  const boniCapMinutes = optMinutes(body.boniCapMinutes, 'Boni maximum')
  if (typeof boniCapMinutes === 'string') return { error: boniCapMinutes }
  const dailyMaxMinutes = optMinutes(body.dailyMaxMinutes, 'Maximum par jour')
  if (typeof dailyMaxMinutes === 'string') return { error: dailyMaxMinutes }

  const latest = body.latestClockTime
  const latestClockTime = latest === null || latest === undefined || latest === '' ? null : String(latest)
  if (latestClockTime && !HHMM_RE.test(latestClockTime)) return { error: 'Heure limite invalide (HH:MM)' }

  const payrollFlag = body.payrollFlag ? String(body.payrollFlag) : null
  if (payrollFlag && !(PAYROLL_FLAGS as readonly string[]).includes(payrollFlag)) return { error: 'Indicateur paie invalide' }

  return {
    data: {
      code,
      label,
      boniCapMinutes,
      dailyMaxMinutes,
      latestClockTime,
      payrollFlag,
      isDefault: body.isDefault === true,
      sortOrder: Number.isInteger(body.sortOrder) ? body.sortOrder : 0,
      active: body.active !== false,
    },
  }
}
