import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { brusselsWeekRange, brusselsDayOffset, brusselsDateKey } from '@/lib/clock'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { start: monday } = brusselsWeekRange()
    const saturday = brusselsDayOffset(monday, 5) // borne exclusive : fin du vendredi (Bruxelles)

    const records = await prisma.clockRecord.findMany({
      where: {
        userId: session.user.id,
        date: { gte: monday, lt: saturday },
      },
    })

    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']
    const dateKeys = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

    const result = Array.from({ length: 5 }, (_, i) => {
      const d = brusselsDayOffset(monday, i)
      return { date: dateKeys[i], day: dayNames[i], hours: 0, isoDate: brusselsDateKey(d) }
    })

    records.forEach(record => {
      if (!record.duration) return
      const isoDate = brusselsDateKey(new Date(record.date))
      const found = result.find(r => r.isoDate === isoDate)
      if (found) found.hours = Math.round((found.hours + record.duration / 60) * 100) / 100
    })

    return NextResponse.json(result.map(({ isoDate: _isoDate, ...r }) => r))
  } catch (error) {
    console.error('Weekly stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch weekly stats' }, { status: 500 })
  }
}
