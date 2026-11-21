import { requireAdminWithCompany, forbiddenError } from '@/lib/admin-security'
import { logAudit } from '@/lib/audit'
import { addBreakToRecord, removeBreakFromRecord, isValidEditReason, type EditReason } from '@/lib/clock-record'
import { clientIp } from '@/lib/client-ip'
import { NextRequest, NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

/** Reason and note of the edit; a note is required with "other", as for a time correction. */
function readReason(body: { reason?: unknown; note?: unknown }):
  | { ok: true; reason: EditReason; note: string | null }
  | { ok: false; error: string } {
  const reason = isValidEditReason(body.reason) ? body.reason : 'forgot_break'
  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null
  if (reason === 'other' && !note) return { ok: false, error: 'Une remarque est requise pour le motif « autre »' }
  return { ok: true, reason, note }
}

// Add a forgotten break to a clock record
export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()
  const { id } = await params

  const body = await req.json().catch(() => ({}))
  const why = readReason(body)
  if (!why.ok) return NextResponse.json({ error: why.error }, { status: 400 })
  if (!body.startedAt || !body.endedAt) {
    return NextResponse.json({ error: 'Début et fin de la pause requis' }, { status: 400 })
  }

  const result = await addBreakToRecord({
    companyId: auth.admin.companyId,
    recordId: id,
    start: new Date(body.startedAt),
    end: new Date(body.endedAt),
    editedById: auth.admin.id,
    editReason: why.reason,
    editNote: why.note,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  await logAudit({
    userId: auth.admin.id,
    action: 'admin_add_break',
    resource: 'clockRecord',
    resourceId: id,
    changes: { date: result.date, reason: why.reason, note: why.note, before: result.before, after: result.after },
    ipAddress: clientIp(req.headers),
  })

  return NextResponse.json({ ok: true, duration: result.after.duration }, { status: 201 })
}

// Remove a break (wrongly added or clocked)
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()
  const { id } = await params

  const breakId = req.nextUrl.searchParams.get('breakId')
  if (!breakId) return NextResponse.json({ error: 'breakId requis' }, { status: 400 })
  const why = readReason({ reason: req.nextUrl.searchParams.get('reason') ?? 'correction', note: req.nextUrl.searchParams.get('note') })
  if (!why.ok) return NextResponse.json({ error: why.error }, { status: 400 })

  const result = await removeBreakFromRecord({
    companyId: auth.admin.companyId,
    recordId: id,
    breakId,
    editedById: auth.admin.id,
    editReason: why.reason,
    editNote: why.note,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  await logAudit({
    userId: auth.admin.id,
    action: 'admin_remove_break',
    resource: 'clockRecord',
    resourceId: id,
    changes: { date: result.date, reason: why.reason, note: why.note, before: result.before, after: result.after },
    ipAddress: clientIp(req.headers),
  })

  return NextResponse.json({ ok: true, duration: result.after.duration })
}
