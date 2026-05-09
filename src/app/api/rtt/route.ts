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
    if (hours <= 0 || hours > 24) {
      return NextResponse.json(
        { error: 'Le nombre d\'heures doit être entre 0.5 et 24' },
        { status: 400 }
      )
    }

    const rttDate = new Date(date)

    // Vérifier doublon sur la même date (PENDING ou APPROVED)
    const overlap = await prisma.rTTRequest.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ['PENDING', 'APPROVED'] },
        date: rttDate,
      },
    })
    if (overlap) {
      return NextResponse.json(
        { error: 'Une demande RTT existe déjà pour cette date' },
        { status: 409 }
      )
    }

    const request = await prisma.rTTRequest.create({
      data: {
        userId: session.user.id,
        date: rttDate,
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
