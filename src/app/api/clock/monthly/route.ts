import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
    const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Paramètres year/month invalides' }, { status: 400 })
    }

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const records = await prisma.clockRecord.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Group by date and sum hours
    const dailyHours: Record<string, number> = {}
    records.forEach(record => {
      const dateKey = new Date(record.date).toISOString().split('T')[0]
      if (!dailyHours[dateKey]) {
        dailyHours[dateKey] = 0
      }
      if (record.duration) {
        dailyHours[dateKey] += record.duration / 60 // Convert minutes to hours
      }
    })

    return NextResponse.json({
      year,
      month,
      dailyHours,
      totalDays: endDate.getDate(),
      totalHours: Object.values(dailyHours).reduce((sum, h) => sum + h, 0),
    })
  } catch (error) {
    console.error('Monthly stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch monthly stats' }, { status: 500 })
  }
}
