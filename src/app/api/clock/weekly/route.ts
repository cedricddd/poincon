import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()
    const dayOfWeek = now.getDay() // 0=Sun, 1=Mon...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(now)
    monday.setDate(now.getDate() + diffToMonday)
    monday.setHours(0, 0, 0, 0)

    const friday = new Date(monday)
    friday.setDate(monday.getDate() + 4)
    friday.setHours(23, 59, 59, 999)

    const records = await prisma.clockRecord.findMany({
      where: {
        userId: session.user.id,
        date: { gte: monday, lte: friday },
      },
    })

    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']
    const dateKeys = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

    const result = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return { date: dateKeys[i], day: dayNames[i], hours: 0, isoDate: d.toISOString().split('T')[0] }
    })

    records.forEach(record => {
      if (!record.duration) return
      const isoDate = new Date(record.date).toISOString().split('T')[0]
      const found = result.find(r => r.isoDate === isoDate)
      if (found) found.hours += record.duration / 60
    })

    return NextResponse.json(result.map(({ isoDate: _isoDate, ...r }) => r))
  } catch (error) {
    console.error('Weekly stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch weekly stats' }, { status: 500 })
  }
}
