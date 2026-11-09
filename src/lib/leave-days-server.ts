import { prisma } from '@/lib/prisma'
import { workDaysFromSchedule, type WorkDays } from '@/lib/leave-days'

/** Working days of each user, from their assigned schedule template (none → Monday to Friday). */
export async function loadWorkDays(userIds: string[]): Promise<Map<string, WorkDays>> {
  const unique = [...new Set(userIds)]
  const schedules = await prisma.userSchedule.findMany({
    where: { userId: { in: unique } },
    select: { userId: true, workSchedule: { select: { daysOfWeek: true, dayConfig: true } } },
  })
  const byUser = new Map(schedules.map(s => [s.userId, s.workSchedule]))
  return new Map(unique.map(id => [id, workDaysFromSchedule(byUser.get(id))]))
}
