import { requireAdminWithCompany, forbiddenError } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { applyClockCorrection } from '@/lib/clock-record'
import { dispatchWebhookSafe } from '@/lib/webhook'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const status = req.nextUrl.searchParams.get('status')

  const requests = await prisma.clockCorrectionRequest.findMany({
    where: {
      user: { companyId: auth.admin.companyId },
      ...(status && { status }),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      reviewer: { select: { name: true } },
      clockRecord: {
        select: { id: true, date: true, arrivalTime: true, departureTime: true, location: true, duration: true },
      },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ requests })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const { id, status, rejectionReason } = await req.json()
  if (!id || !status) {
    return NextResponse.json({ error: 'id et status requis' }, { status: 400 })
  }
  if (status !== 'APPROVED' && status !== 'REJECTED') {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  }

  const request = await prisma.clockCorrectionRequest.findFirst({
    where: { id, user: { companyId: auth.admin.companyId } },
    include: { clockRecord: { select: { id: true, arrivalTime: true, departureTime: true, location: true } } },
  })
  if (!request) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  if (request.status !== 'PENDING') {
    return NextResponse.json({ error: 'Cette demande a déjà été traitée' }, { status: 409 })
  }

  const when = request.date.toLocaleDateString('fr-BE', { timeZone: 'Europe/Brussels' })

  if (status === 'REJECTED') {
    await prisma.clockCorrectionRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: auth.admin.id,
        reviewedAt: new Date(),
        rejectionReason: rejectionReason?.trim() || null,
      },
    })

    await logAudit({
      userId: auth.admin.id,
      action: 'admin_reject_correction',
      resource: 'clockCorrectionRequest',
      resourceId: id,
      changes: { date: when, reason: request.reason, rejectionReason: rejectionReason ?? null },
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
    })

    await prisma.notification.create({
      data: {
        userId: request.userId,
        message: `Votre demande de correction du ${when} a été refusée.${rejectionReason ? ` Motif : ${rejectionReason}` : ''}`,
        type: 'error',
      },
    })

    dispatchWebhookSafe(auth.admin.companyId, 'clockcorrection.rejected', {
      correctionId: id,
      userId: request.userId,
    })

    return NextResponse.json({ ok: true })
  }

  // APPROVED : les heures non demandées gardent leur valeur actuelle
  const arrival = request.requestedArrival ?? request.clockRecord?.arrivalTime
  if (!arrival) {
    return NextResponse.json(
      { error: 'Aucune heure d\'arrivée : la demande ne peut pas être appliquée' },
      { status: 400 }
    )
  }
  const departure = request.requestedDeparture ?? request.clockRecord?.departureTime ?? null

  const result = await applyClockCorrection({
    companyId: auth.admin.companyId,
    recordId: request.clockRecordId,
    userId: request.userId,
    date: request.date,
    arrival,
    departure,
    location: request.clockRecord?.location,
    editedById: auth.admin.id,
    editReason: 'employee_request',
    editNote: request.note,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  await prisma.clockCorrectionRequest.update({
    where: { id },
    data: {
      status: 'APPROVED',
      reviewedBy: auth.admin.id,
      reviewedAt: new Date(),
      clockRecordId: result.recordId,
    },
  })

  await logAudit({
    userId: auth.admin.id,
    action: 'admin_approve_correction',
    resource: 'clockCorrectionRequest',
    resourceId: id,
    changes: {
      clockRecordId: result.recordId,
      reason: request.reason,
      note: request.note,
      before: result.before,
      after: result.after,
    },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  await prisma.notification.create({
    data: {
      userId: request.userId,
      message: `Votre demande de correction du ${when} a été approuvée.`,
      type: 'success',
    },
  })

  dispatchWebhookSafe(auth.admin.companyId, 'clockcorrection.approved', {
    correctionId: id,
    clockRecordId: result.recordId,
    userId: request.userId,
  })

  return NextResponse.json({ ok: true })
}
