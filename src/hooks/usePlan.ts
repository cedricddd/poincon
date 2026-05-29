import { useEffect, useState } from 'react'

export interface PlanInfo {
  plan: 'FREE' | 'SOLO' | 'TEAM' | 'ENTERPRISE'
  maxEmployees: number
  maxManagers: number
  canTeams: boolean
  canManagers: boolean
  canAdvancedReports: boolean
  canUnlimitedCsv: boolean
  csvExportsPerMonth: number
  maxSites: number
}

const UPGRADE_LABELS: Record<string, string> = {
  FREE: 'SOLO',
  SOLO: 'TEAM',
  TEAM: 'ENTERPRISE',
  ENTERPRISE: '',
}

export function usePlan() {
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.planInfo) setPlanInfo(data.planInfo) })
      .finally(() => setLoading(false))
  }, [])

  const upgradeTo = planInfo ? UPGRADE_LABELS[planInfo.plan] : ''

  return { planInfo, loading, upgradeTo }
}
