import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { date, hoursToRecover, reason } = await req.json()
    if (!date || !hoursToRecover) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const hours = parseFloat(hoursToRecover)
    if (hours <= 0 || hours > 8) {
      return NextResponse.json(
        { error: 'Hours must be between 0.5 and 8' },
        { status: 400 }
      )
    }

    const request = await prisma.rTTRequest.create({
      data: {
        userId: session.user.id,
        date: new Date(date),
        hoursToRecover: hours,
        reason: reason || '',
      },
    })

    return NextResponse.json(request, { status: 201 })
  } catch (error) {
    console.error('RTT request error:', error)
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const requests = await prisma.rTTRequest.findMany({
      where: {
        userId: session.user.id,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('RTT fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}
