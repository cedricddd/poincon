export const LEAVE_TYPES = ['ANNUAL', 'SICK', 'MATERNITY', 'ECONOMIC_UNEMPLOYMENT', 'PUBLIC_HOLIDAY'] as const
export type LeaveType = (typeof LEAVE_TYPES)[number]

export function isValidLeaveType(v: unknown): v is LeaveType {
  return typeof v === 'string' && (LEAVE_TYPES as readonly string[]).includes(v)
}

// Types qui ne déduisent pas du solde de congés (jours "neutres") — un jour férié
// (ou son jour de remplacement) est distinct des congés payés en droit belge.
export const BALANCE_NEUTRAL_LEAVE_TYPES: readonly LeaveType[] = ['PUBLIC_HOLIDAY']

// Clé i18n suffixe pour les namespaces "typeX" (adminRequests, timeoff)
export const LEAVE_TYPE_KEY_TYPE_PREFIX: Record<LeaveType, string> = {
  ANNUAL: 'typeAnnual',
  SICK: 'typeSick',
  MATERNITY: 'typeMaternity',
  ECONOMIC_UNEMPLOYMENT: 'typeEconomicUnemployment',
  PUBLIC_HOLIDAY: 'typePublicHoliday',
}

// Clé i18n suffixe pour les namespaces "leaveX" (planning, audit, manager)
export const LEAVE_TYPE_KEY_LEAVE_PREFIX: Record<LeaveType, string> = {
  ANNUAL: 'leaveAnnual',
  SICK: 'leaveSick',
  MATERNITY: 'leaveMaternity',
  ECONOMIC_UNEMPLOYMENT: 'leaveEconomicUnemployment',
  PUBLIC_HOLIDAY: 'leavePublicHoliday',
}

export const LEAVE_TYPE_COLOR_CLASSES: Record<LeaveType, string> = {
  ANNUAL: 'bg-[var(--pp-pos-btn)]/12 text-[var(--pp-pos)]',
  SICK: 'bg-orange-500/12 text-orange-600 dark:text-orange-400',
  MATERNITY: 'bg-pink-500/12 text-pink-600 dark:text-pink-400',
  ECONOMIC_UNEMPLOYMENT: 'bg-slate-500/12 text-slate-600 dark:text-slate-400',
  PUBLIC_HOLIDAY: 'bg-purple-500/12 text-purple-600 dark:text-purple-400',
}

// Libellés français fixes, pour les consommateurs non-i18n (export CSV, PDF RGPD).
export const LEAVE_TYPE_LABEL_FR: Record<LeaveType, string> = {
  ANNUAL: 'Congé',
  SICK: 'Maladie',
  MATERNITY: 'Maternité',
  ECONOMIC_UNEMPLOYMENT: 'Chômage économique',
  PUBLIC_HOLIDAY: 'Jour férié',
}
