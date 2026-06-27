'use client'

export const dynamic = 'force-dynamic'

import { PlanningView } from '@/components/planning/PlanningView'

export default function AdminPlanningPage() {
  return <PlanningView apiBase="/api/admin" />
}
