import { NextRequest, NextResponse } from 'next/server'
import { requireAdminWithCompany } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { hasWorkRules, parseWorkModeInput } from '@/lib/work-modes'
import { DEFAULT_WORK_MODES } from '@/lib/boni-mali'

export async function GET() {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const companyId = auth.admin.companyId
  if (!await hasWorkRules(companyId)) return NextResponse.json({ enabled: false, modes: [] })

  const modes = await prisma.workMode.findMany({
    where: { companyId },
    orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
  })
  return NextResponse.json({ enabled: true, modes })
}

// Body = one work mode, or { prefill: true } to add the default TT / PR / MIS codes that are missing.
export async function POST(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const companyId = auth.admin.companyId
  if (!await hasWorkRules(companyId)) return NextResponse.json({ error: 'Fonctionnalité non activée' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const ip = req.headers.get('x-forwarded-for') ?? undefined

  if (body?.prefill === true) {
    const existing = await prisma.workMode.findMany({ where: { companyId }, select: { code: true, isDefault: true } })
    const codes = new Set(existing.map(m => m.code))
    const hasDefault = existing.some(m => m.isDefault)
    const toCreate = DEFAULT_WORK_MODES
      .filter(m => !codes.has(m.code))
      .map(m => ({ ...m, companyId, isDefault: m.isDefault && !hasDefault }))
    if (toCreate.length > 0) await prisma.workMode.createMany({ data: toCreate })
    await logAudit({
      userId: auth.admin.id, action: 'work_modes_prefill', resource: 'workMode', resourceId: companyId,
      changes: { created: toCreate.map(m => m.code) }, ipAddress: ip,
    })
    return NextResponse.json({ created: toCreate.length }, { status: 201 })
  }

  const parsed = parseWorkModeInput(body)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const duplicate = await prisma.workMode.findUnique({ where: { companyId_code: { companyId, code: parsed.data.code } } })
  if (duplicate) return NextResponse.json({ error: 'Ce code existe déjà' }, { status: 409 })

  const mode = await prisma.$transaction(async tx => {
    if (parsed.data.isDefault) await tx.workMode.updateMany({ where: { companyId }, data: { isDefault: false } })
    return tx.workMode.create({ data: { ...parsed.data, companyId } })
  })

  await logAudit({
    userId: auth.admin.id, action: 'work_mode_create', resource: 'workMode', resourceId: mode.id,
    changes: { after: parsed.data }, ipAddress: ip,
  })
  return NextResponse.json(mode, { status: 201 })
}
