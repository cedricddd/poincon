import { NextRequest, NextResponse } from 'next/server'
import { requireAdminWithCompany } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { hasWorkRules, parseWorkModeInput } from '@/lib/work-modes'

// Loads the mode only if it belongs to the admin's company (anti cross-tenant IDOR).
async function loadOwnedMode(id: string, companyId: string) {
  return prisma.workMode.findFirst({ where: { id, companyId } })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const companyId = auth.admin.companyId
  if (!await hasWorkRules(companyId)) return NextResponse.json({ error: 'Fonctionnalité non activée' }, { status: 403 })

  const before = await loadOwnedMode(id, companyId)
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = parseWorkModeInput({ ...before, ...body })
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  if (parsed.data.code !== before.code) {
    const duplicate = await prisma.workMode.findUnique({ where: { companyId_code: { companyId, code: parsed.data.code } } })
    if (duplicate) return NextResponse.json({ error: 'Ce code existe déjà' }, { status: 409 })
  }

  const mode = await prisma.$transaction(async tx => {
    if (parsed.data.isDefault && !before.isDefault) {
      await tx.workMode.updateMany({ where: { companyId, id: { not: id } }, data: { isDefault: false } })
    }
    return tx.workMode.update({ where: { id }, data: parsed.data })
  })

  await logAudit({
    userId: auth.admin.id, action: 'work_mode_update', resource: 'workMode', resourceId: id,
    changes: { before, after: parsed.data }, ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })
  return NextResponse.json(mode)
}

// A code already used by clock records is deactivated instead of deleted (history and exports stay intact).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const companyId = auth.admin.companyId
  if (!await hasWorkRules(companyId)) return NextResponse.json({ error: 'Fonctionnalité non activée' }, { status: 403 })

  const mode = await loadOwnedMode(id, companyId)
  if (!mode) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const used = await prisma.clockRecord.count({ where: { workModeId: id } })
  if (used > 0) {
    await prisma.workMode.update({ where: { id }, data: { active: false, isDefault: false } })
  } else {
    await prisma.workMode.delete({ where: { id } })
  }

  await logAudit({
    userId: auth.admin.id, action: used > 0 ? 'work_mode_deactivate' : 'work_mode_delete', resource: 'workMode', resourceId: id,
    changes: { before: mode }, ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })
  return NextResponse.json({ deleted: used === 0, deactivated: used > 0 })
}
