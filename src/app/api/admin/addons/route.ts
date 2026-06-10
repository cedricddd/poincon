import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { getUserPlan, ADDON_FLAGS, ADDON_INFO, type AddonFlag } from '@/lib/plan'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  return isAdminRole(user?.role) ? session : null
}

async function getCompanyId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } })
  if (user?.companyId) return user.companyId
  const company = await prisma.company.findFirst({ where: { adminId: userId }, select: { id: true } })
  return company?.id ?? null
}

// GET — list all addons with enabled status for this company
export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const companyId = await getCompanyId(session.user.id)
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const plan = await getUserPlan(session.user.id)
  const flags = await prisma.companyFeatureFlag.findMany({
    where: { companyId, flag: { in: [...ADDON_FLAGS] } },
    select: { flag: true, enabled: true },
  })
  const flagMap = Object.fromEntries(flags.map(f => [f.flag, f.enabled]))

  const addons = ADDON_FLAGS.map(flag => ({
    flag,
    ...ADDON_INFO[flag],
    enabled: plan === 'ENTERPRISE' || (flagMap[flag] ?? false),
    includedInEnterprise: true,
    availableForPlan: plan === 'TEAM' || plan === 'ENTERPRISE',
  }))

  return NextResponse.json({ addons, plan })
}

// POST — toggle an addon (SUPER_ADMIN only or via Stripe webhook)
export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, companyId: true } })
  if (user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'SUPER_ADMIN requis' }, { status: 403 })
  }

  const { companyId, flag, enabled } = await req.json()
  if (!companyId || !flag) return NextResponse.json({ error: 'companyId et flag requis' }, { status: 400 })
  if (!ADDON_FLAGS.includes(flag as AddonFlag)) return NextResponse.json({ error: 'flag invalide' }, { status: 400 })

  await prisma.companyFeatureFlag.upsert({
    where: { companyId_flag: { companyId, flag } },
    create: { companyId, flag, enabled: enabled ?? true },
    update: { enabled: enabled ?? true },
  })

  return NextResponse.json({ success: true })
}
