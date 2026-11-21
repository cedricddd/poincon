import { prisma } from '@/lib/prisma'

type BreakLike = { startedAt: Date; endedAt: Date | null }

/**
 * Worked minutes = (departure - arrival) - closed breaks.
 * Returns null while the record is still open (no departure yet).
 */
export function computeDuration(
  arrival: Date,
  departure: Date | null,
  breaks: BreakLike[] = []
): number | null {
  if (!departure) return null
  const totalMinutes = Math.round((departure.getTime() - arrival.getTime()) / 60000)
  const breakMinutes = breaks.reduce((sum, b) => {
    if (!b.endedAt) return sum
    return sum + Math.round((b.endedAt.getTime() - b.startedAt.getTime()) / 60000)
  }, 0)
  return Math.max(0, totalMinutes - breakMinutes)
}

export function fmtBrussels(d: Date | null | undefined): string | null {
  if (!d) return null
  return d.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' })
}

export function fmtDateBrussels(d: Date): string {
  return d.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Brussels' })
}

/** Motifs acceptés pour une correction. `employee_request` n'est posé que par l'approbation d'une demande. */
export const EDIT_REASONS = [
  'forgot_clockin',
  'forgot_clockout',
  'forgot_break',
  'correction',
  'employee_request',
  'manual_create',
  'other',
] as const

export type EditReason = (typeof EDIT_REASONS)[number]

export function isValidEditReason(v: unknown): v is EditReason {
  return typeof v === 'string' && (EDIT_REASONS as readonly string[]).includes(v)
}

type Snapshot = {
  date: string
  arrivalTime: string | null
  departureTime: string | null
  location: string
  duration: number | null
}

function snapshot(r: {
  date: Date
  arrivalTime: Date
  departureTime: Date | null
  location: string
  duration: number | null
}): Snapshot {
  return {
    date: fmtDateBrussels(r.date),
    arrivalTime: fmtBrussels(r.arrivalTime),
    departureTime: fmtBrussels(r.departureTime),
    location: r.location,
    duration: r.duration,
  }
}

type ApplyParams = {
  /** Scope multi-tenant : l'enregistrement (ou l'employé) doit appartenir à cette société. */
  companyId: string
  /** Renseigné pour corriger un pointage existant, absent pour en créer un. */
  recordId?: string | null
  /** Requis à la création uniquement. */
  userId?: string | null
  date: Date
  arrival: Date
  departure: Date | null
  location?: string | null
  editedById: string
  editReason: EditReason
  editNote?: string | null
}

type ApplyResult =
  | { ok: true; recordId: string; before: Snapshot | null; after: Snapshot }
  | { ok: false; error: string; status: number }

/**
 * Crée ou corrige un pointage en y attachant sa traçabilité (qui, quand, pourquoi, remarque).
 * Utilisé par l'édition admin et par l'approbation d'une demande de correction employé :
 * un pointage régularisé porte donc toujours la même trace, quelle que soit l'origine.
 */
export async function applyClockCorrection(params: ApplyParams): Promise<ApplyResult> {
  const { companyId, recordId, date, arrival, departure, editedById, editReason, editNote } = params

  if (departure && departure <= arrival) {
    return { ok: false, error: 'Le départ doit être postérieur à l\'arrivée', status: 400 }
  }

  if (recordId) {
    const existing = await prisma.clockRecord.findFirst({
      where: { id: recordId, user: { companyId } },
      include: { breaks: { where: { endedAt: { not: null } } } },
    })
    if (!existing) return { ok: false, error: 'Pointage introuvable', status: 404 }

    const updated = await prisma.clockRecord.update({
      where: { id: recordId },
      data: {
        date,
        arrivalTime: arrival,
        departureTime: departure,
        location: params.location ?? existing.location,
        duration: computeDuration(arrival, departure, existing.breaks),
        editedById,
        editedAt: new Date(),
        editReason,
        editNote: editNote || null,
      },
    })

    return { ok: true, recordId: updated.id, before: snapshot(existing), after: snapshot(updated) }
  }

  if (!params.userId) return { ok: false, error: 'userId requis', status: 400 }

  const user = await prisma.user.findFirst({ where: { id: params.userId, companyId } })
  if (!user) return { ok: false, error: 'Utilisateur introuvable', status: 404 }

  const created = await prisma.clockRecord.create({
    data: {
      userId: params.userId,
      date,
      arrivalTime: arrival,
      departureTime: departure,
      location: params.location ?? 'Sur site',
      duration: computeDuration(arrival, departure),
      editedById,
      editedAt: new Date(),
      editReason,
      editNote: editNote || null,
    },
  })

  return { ok: true, recordId: created.id, before: null, after: snapshot(created) }
}

/* ------------------------------------------------------------------ breaks */

/** Longest break an admin can add (a meal break, not a half day off). */
export const MAX_BREAK_MINUTES = 4 * 60

type BreakSpan = { id?: string; startedAt: Date; endedAt: Date | null }

/**
 * Checks a break an admin adds to a record. Returns a French error message, or null.
 * The break must fit within the record (up to now while it is still open) and must not
 * overlap another break; an open break is treated as running until now.
 */
export function validateBreak(
  record: { arrivalTime: Date; departureTime: Date | null },
  start: Date,
  end: Date,
  existing: BreakSpan[],
  now: Date = new Date(),
): string | null {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Heures de pause invalides'
  if (end <= start) return 'La fin de la pause doit être après son début'
  if ((end.getTime() - start.getTime()) / 60000 > MAX_BREAK_MINUTES) return 'Une pause ne peut pas dépasser 4 heures'
  const limit = record.departureTime ?? now
  if (start < record.arrivalTime || end > limit) {
    return record.departureTime
      ? 'La pause doit être comprise entre l\'arrivée et le départ'
      : 'La pause doit commencer après l\'arrivée et être terminée'
  }
  const overlaps = existing.some(b => start < (b.endedAt ?? now) && b.startedAt < end)
  if (overlaps) return 'Cette pause chevauche une pause déjà enregistrée'
  return null
}

type BreakSnapshot = { duration: number | null; breaks: string[] }

function breakSnapshot(duration: number | null, breaks: BreakSpan[]): BreakSnapshot {
  return {
    duration,
    breaks: breaks
      .slice()
      .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
      .map(b => `${fmtBrussels(b.startedAt)}–${fmtBrussels(b.endedAt) ?? '…'}`),
  }
}

type BreakEditParams = {
  companyId: string
  recordId: string
  editedById: string
  editReason: EditReason
  editNote?: string | null
}

type BreakEditResult =
  | { ok: true; date: string; before: BreakSnapshot; after: BreakSnapshot }
  | { ok: false; error: string; status: number }

/** Adds a break to a record (forgotten meal break), recomputes its duration and marks it edited. */
export async function addBreakToRecord(params: BreakEditParams & { start: Date; end: Date }): Promise<BreakEditResult> {
  const record = await prisma.clockRecord.findFirst({
    where: { id: params.recordId, user: { companyId: params.companyId } },
    include: { breaks: true },
  })
  if (!record) return { ok: false, error: 'Pointage introuvable', status: 404 }

  const error = validateBreak(record, params.start, params.end, record.breaks)
  if (error) return { ok: false, error, status: 400 }

  const breaks = [...record.breaks, { startedAt: params.start, endedAt: params.end }]
  const duration = computeDuration(record.arrivalTime, record.departureTime, breaks)
  await prisma.$transaction([
    prisma.breakEntry.create({ data: { clockRecordId: record.id, startedAt: params.start, endedAt: params.end } }),
    prisma.clockRecord.update({
      where: { id: record.id },
      data: {
        duration,
        editedById: params.editedById,
        editedAt: new Date(),
        editReason: params.editReason,
        editNote: params.editNote || null,
      },
    }),
  ])

  return {
    ok: true,
    date: fmtDateBrussels(record.date),
    before: breakSnapshot(record.duration, record.breaks),
    after: breakSnapshot(duration, breaks),
  }
}

/** Removes a break wrongly added or clocked, recomputes the duration and marks the record edited. */
export async function removeBreakFromRecord(params: BreakEditParams & { breakId: string }): Promise<BreakEditResult> {
  const record = await prisma.clockRecord.findFirst({
    where: { id: params.recordId, user: { companyId: params.companyId } },
    include: { breaks: true },
  })
  if (!record) return { ok: false, error: 'Pointage introuvable', status: 404 }
  if (!record.breaks.some(b => b.id === params.breakId)) return { ok: false, error: 'Pause introuvable', status: 404 }

  const breaks = record.breaks.filter(b => b.id !== params.breakId)
  const duration = computeDuration(record.arrivalTime, record.departureTime, breaks)
  await prisma.$transaction([
    prisma.breakEntry.delete({ where: { id: params.breakId } }),
    prisma.clockRecord.update({
      where: { id: record.id },
      data: {
        duration,
        editedById: params.editedById,
        editedAt: new Date(),
        editReason: params.editReason,
        editNote: params.editNote || null,
      },
    }),
  ])

  return {
    ok: true,
    date: fmtDateBrussels(record.date),
    before: breakSnapshot(record.duration, record.breaks),
    after: breakSnapshot(duration, breaks),
  }
}
