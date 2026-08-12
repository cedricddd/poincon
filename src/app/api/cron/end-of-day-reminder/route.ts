import { prisma } from '@/lib/prisma'
import { sendEndOfDayReminderEmail } from '@/lib/mail'
import { brusselsDayRange } from '@/lib/clock'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const { start: startOfDay, end: endOfDay } = brusselsDayRange(now)

  // Find clock records from today with no departure
  const openRecords = await prisma.clockRecord.findMany({
    where: {
      arrivalTime: { gte: startOfDay, lt: endOfDay },
      departureTime: null,
    },
    include: {
      user: {
        select: {
          email: true,
          name: true,
          locale: true,
          userSchedule: { select: { hoursPerDay: true } },
        },
      },
    },
    distinct: ['userId'],
  })

  // Remind only if presence exceeds their standard shift by 1h, but cap at 15h (anomaly = forgotten clock-out)
  // e.g. standard 8h → remind after 9h; standard 12h → remind after 13h
  const ANOMALY_THRESHOLD = 15
  const BUFFER_HOURS = 1
  const toRemind = openRecords.filter(record => {
    const hoursPresent = (now.getTime() - record.arrivalTime.getTime()) / (1000 * 60 * 60)
    const standardHours = record.user.userSchedule?.hoursPerDay ?? 8
    const reminderThreshold = standardHours + BUFFER_HOURS
    return hoursPresent >= reminderThreshold && hoursPresent <= ANOMALY_THRESHOLD
  })

  const results = await Promise.allSettled(
    toRemind.map(record =>
      sendEndOfDayReminderEmail({ to: record.user.email, name: record.user.name, locale: record.user.locale ?? 'fr' })
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  console.log(`End-of-day reminder: ${sent} sent, ${failed} failed (${openRecords.length - toRemind.length} skipped)`)

  return NextResponse.json({ sent, failed, total: openRecords.length, skipped: openRecords.length - toRemind.length })
}
