import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

/** Motifs qu'un employé peut invoquer (employee_request et manual_create sont réservés au système). */
const REQUEST_REASONS = ['forgot_clockin', 'forgot_clockout', 'correction', 'other']

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clockRecordId, date, requestedArrival, requestedDeparture, reason, note } = await req.json()

    if (!date || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!REQUEST_REASONS.includes(reason)) {
      return NextResponse.json({ error: 'Motif invalide' }, { status: 400 })
    }
    if (reason === 'other' && !note?.trim()) {
      return NextResponse.json({ error: 'Une remarque est requise pour le motif « autre »' }, { status: 400 })
    }
    if (!requestedArrival && !requestedDeparture) {
      return NextResponse.json({ error: 'Indiquez au moins une heure à corriger' }, { status: 400 })
    }

    const arrival = requestedArrival ? new Date(requestedArrival) : null
    const departure = requestedDeparture ? new Date(requestedDeparture) : null
    if (arrival && departure && departure <= arrival) {
      return NextResponse.json({ error: 'Le départ doit être postérieur à l\'arrivée' }, { status: 400 })
    }

    // Un pointage ciblé doit appartenir au demandeur
    if (clockRecordId) {
      const owned = await prisma.clockRecord.findFirst({
        where: { id: clockRecordId, userId: session.user.id },
        select: { id: true },
      })
      if (!owned) return NextResponse.json({ error: 'Pointage introuvable' }, { status: 404 })
    }

    const requestDate = new Date(date)

    const pending = await prisma.clockCorrectionRequest.findFirst({
      where: { userId: session.user.id, status: 'PENDING', date: requestDate },
    })
    if (pending) {
      return NextResponse.json(
        { error: 'Une demande est déjà en attente pour cette date' },
        { status: 409 }
      )
    }

    const request = await prisma.clockCorrectionRequest.create({
      data: {
        userId: session.user.id,
        clockRecordId: clockRecordId || null,
        date: requestDate,
        requestedArrival: arrival,
        requestedDeparture: departure,
        reason,
        note: note?.trim() || null,
      },
    })

    // Prévenir les admins de la société
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, companyId: true },
    })
    if (me?.companyId) {
      const admins = await prisma.user.findMany({
        where: { companyId: me.companyId, role: { in: ['ADMIN', 'SUPER_ADMIN'] }, active: true },
        select: { id: true },
      })
      const who = me.name ?? me.email
      const when = requestDate.toLocaleDateString('fr-BE', { timeZone: 'Europe/Brussels' })
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map(a => ({
            userId: a.id,
            message: `${who} signale un oubli de pointage pour le ${when}.`,
            type: 'info',
          })),
        })
      }
    }

    return NextResponse.json(request, { status: 201 })
  } catch (error) {
    console.error('Clock correction request error:', error)
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const status = new URL(req.url).searchParams.get('status')

    const requests = await prisma.clockCorrectionRequest.findMany({
      where: {
        userId: session.user.id,
        ...(status && { status }),
      },
      include: { reviewer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ requests })
  } catch (error) {
    console.error('Clock correction fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}
