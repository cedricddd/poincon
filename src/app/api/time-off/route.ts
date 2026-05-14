import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { startDate, endDate, reason } = await req.json()
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Missing dates' }, { status: 400 })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (end < start) {
      return NextResponse.json(
        { error: 'La date de fin doit être après la date de début' },
        { status: 400 }
      )
    }

    // Vérifier chevauchement avec demandes existantes (PENDING ou APPROVED)
    const overlap = await prisma.timeOffRequest.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    })
    if (overlap) {
      return NextResponse.json(
        { error: 'Cette période chevauche une demande de congé existante' },
        { status: 409 }
      )
    }

    const request = await prisma.timeOffRequest.create({
      data: {
        userId: session.user.id,
        startDate: start,
        endDate: end,
        reason: reason || '',
      },
    })

    return NextResponse.json(request, { status: 201 })
  } catch (error) {
    console.error('Time off request error:', error)
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const requests = await prisma.timeOffRequest.findMany({
      where: {
        userId: session.user.id,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Time off fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}
