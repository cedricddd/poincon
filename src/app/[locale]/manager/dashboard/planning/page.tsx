'use client'

export const dynamic = 'force-dynamic'

import { PlanningView } from '@/components/planning/PlanningView'

export default function ManagerPlanningPage() {
  return <PlanningView apiBase="/api/manager" />
}
