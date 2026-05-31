import { prisma } from '@/lib/prisma'

export type PlanFeature =
  | 'teams'
  | 'advanced_reports'
  | 'unlimited_csv_export'
  | 'scheduled_export_monthly'
  | 'scheduled_export_weekly'
  | 'managers'
  | 'presences'

// Plan limits constants — source of truth
export const PLAN_LIMITS = {
  FREE:       { maxEmployees: 3,   maxManagers: 0,  maxSites: 1,  csvExportsPerMonth: 1,  scheduledExport: null,      hasTeams: false, hasAdvancedReports: false, hasPresences: false },
  SOLO:       { maxEmployees: 10,  maxManagers: 0,  maxSites: 1,  csvExportsPerMonth: -1, scheduledExport: null,      hasTeams: false, hasAdvancedReports: true,  hasPresences: false },
  TEAM:       { maxEmployees: 50,  maxManagers: 5,  maxSites: 5,  csvExportsPerMonth: -1, scheduledExport: 'monthly', hasTeams: true,  hasAdvancedReports: true,  hasPresences: true  },
  ENTERPRISE: { maxEmployees: -1,  maxManagers: -1, maxSites: -1, csvExportsPerMonth: -1, scheduledExport: 'weekly',  hasTeams: true,  hasAdvancedReports: true,  hasPresences: true  },
} as const

export type PlanName = keyof typeof PLAN_LIMITS

/**
 * Get the plan name for a company. Falls back to FREE if no plan assigned.
 */
export async function getCompanyPlan(companyId: string): Promise<PlanName> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { plan: true },
  })
  const name = company?.plan?.name?.toUpperCase()
  if (name && name in PLAN_LIMITS) return name as PlanName
  return 'FREE'
}

/**
 * Get the plan name for a user (via their companyId).
 */
export async function getUserPlan(userId: string): Promise<PlanName> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  })
  if (!user?.companyId) return 'FREE'
  return getCompanyPlan(user.companyId)
}

/**
 * Check if a plan has access to a feature.
 */
export function planCanAccess(plan: PlanName, feature: PlanFeature): boolean {
  const limits = PLAN_LIMITS[plan]
  switch (feature) {
    case 'teams':                    return limits.hasTeams
    case 'advanced_reports':         return limits.hasAdvancedReports
    case 'managers':                 return limits.maxManagers !== 0
    case 'presences':                return limits.hasPresences
    case 'unlimited_csv_export':     return limits.csvExportsPerMonth === -1
    case 'scheduled_export_monthly': return limits.scheduledExport === 'monthly' || limits.scheduledExport === 'weekly'
    case 'scheduled_export_weekly':  return limits.scheduledExport === 'weekly'
    default:                         return false
  }
}

/**
 * Get full presence access info for a company (plan + flag override + admin toggles).
 */
export async function getPresenceAccess(companyId: string): Promise<{
  hasAccess: boolean
  planAllows: boolean
  flagOverride: boolean
  presenceForManagers: boolean
  presenceForEmployees: boolean
  mealBreakEnabled: boolean
}> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      presenceForManagers: true,
      presenceForEmployees: true,
      mealBreakEnabled: true,
      featureFlags: { where: { flag: 'presences', enabled: true }, select: { id: true } },
      plan: { select: { name: true } },
    },
  })

  const planName = (company?.plan?.name?.toUpperCase() ?? 'FREE') as PlanName
  const planAllows = planCanAccess(planName, 'presences')
  const flagOverride = (company?.featureFlags?.length ?? 0) > 0

  return {
    hasAccess: planAllows || flagOverride,
    planAllows,
    flagOverride,
    presenceForManagers: company?.presenceForManagers ?? true,
    presenceForEmployees: company?.presenceForEmployees ?? true,
    mealBreakEnabled: company?.mealBreakEnabled ?? false,
  }
}

/**
 * Get meal break setting for a company.
 */
export async function getMealBreakEnabled(companyId: string): Promise<boolean> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { mealBreakEnabled: true },
  })
  return company?.mealBreakEnabled ?? false
}

/**
 * Check if a company can add more employees.
 */
export async function canAddEmployee(companyId: string, currentCount: number): Promise<boolean> {
  const plan = await getCompanyPlan(companyId)
  const max = PLAN_LIMITS[plan].maxEmployees
  return max === -1 || currentCount < max
}
