import { prisma } from '@/lib/prisma'

export type PlanFeature =
  | 'teams'
  | 'advanced_reports'
  | 'unlimited_csv_export'
  | 'scheduled_export_monthly'
  | 'scheduled_export_weekly'
  | 'managers'
  | 'presences'
  | 'planning'
  | 'kiosk'

// Add-on flags (purchasable on TEAM, included in ENTERPRISE)
export const ADDON_FLAGS = [
  'addon_api_access',
  'addon_webhooks',
  'addon_kiosk_advanced',
  'addon_rgpd_export',
  'addon_custom_reports',
] as const
export type AddonFlag = typeof ADDON_FLAGS[number]

export const ADDON_INFO: Record<AddonFlag, { name: string; description: string; price: number }> = {
  addon_api_access:      { name: 'Accès API',          description: 'Clés API REST pour intégrations tierces',           price: 29 },
  addon_webhooks:        { name: 'Webhooks sortants',  description: 'Notifications push vers vos systèmes externes',     price: 19 },
  addon_kiosk_advanced:  { name: 'Kiosk avancé',       description: 'Multi-sites, logo custom, QR code rotatif',         price: 19 },
  addon_rgpd_export:     { name: 'Export RGPD',        description: 'Export anonymisé et purge planifiée des données',   price: 15 },
  addon_custom_reports:  { name: 'Rapports custom',    description: 'Builder de rapports par filtres et exports avancés', price: 15 },
}

// Plan limits constants — source of truth
export const PLAN_LIMITS = {
  FREE:       { maxEmployees: 3,   maxManagers: 0,  maxSites: 1,  csvExportsPerMonth: 1,  scheduledExport: null,      hasTeams: false, hasAdvancedReports: false, hasPresences: true, hasPlanning: false, hasKiosk: false },
  SOLO:       { maxEmployees: 15,  maxManagers: 0,  maxSites: 1,  csvExportsPerMonth: -1, scheduledExport: null,      hasTeams: false, hasAdvancedReports: true,  hasPresences: true, hasPlanning: true,  hasKiosk: true  },
  TEAM:       { maxEmployees: 50,  maxManagers: 5,  maxSites: 5,  csvExportsPerMonth: -1, scheduledExport: 'monthly', hasTeams: true,  hasAdvancedReports: true,  hasPresences: true, hasPlanning: true,  hasKiosk: true  },
  ENTERPRISE: { maxEmployees: -1,  maxManagers: -1, maxSites: -1, csvExportsPerMonth: -1, scheduledExport: 'weekly',  hasTeams: true,  hasAdvancedReports: true,  hasPresences: true, hasPlanning: true,  hasKiosk: true  },
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
    case 'planning':                 return limits.hasPlanning
    case 'unlimited_csv_export':     return limits.csvExportsPerMonth === -1
    case 'scheduled_export_monthly': return limits.scheduledExport === 'monthly' || limits.scheduledExport === 'weekly'
    case 'scheduled_export_weekly':  return limits.scheduledExport === 'weekly'
    case 'kiosk':                    return limits.hasKiosk
    default:                         return false
  }
}

/**
 * Check if a company has access to an add-on (via flag or ENTERPRISE plan).
 */
export async function companyHasAddon(companyId: string, addon: AddonFlag): Promise<boolean> {
  const plan = await getCompanyPlan(companyId)
  if (plan === 'ENTERPRISE') return true
  const flag = await prisma.companyFeatureFlag.findFirst({
    where: { companyId, flag: addon, enabled: true },
  })
  return flag !== null
}

/**
 * Get all enabled add-ons for a company.
 */
export async function getCompanyAddons(companyId: string): Promise<AddonFlag[]> {
  const plan = await getCompanyPlan(companyId)
  if (plan === 'ENTERPRISE') return [...ADDON_FLAGS]
  const flags = await prisma.companyFeatureFlag.findMany({
    where: { companyId, flag: { in: [...ADDON_FLAGS] }, enabled: true },
    select: { flag: true },
  })
  return flags.map(f => f.flag as AddonFlag)
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
  const planAllows = true // presences available on all plans
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
