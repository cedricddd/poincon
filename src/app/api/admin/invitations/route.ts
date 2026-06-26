import { NextRequest, NextResponse } from 'next/server'
import { requireAdminWithCompany } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { sendInvitationEmail } from '@/lib/mail'
import { logAudit } from '@/lib/audit'
import { getCompanyPlan, getActiveMemberCount, PLAN_LIMITS } from '@/lib/plan'

export async function GET() {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const invitations = await prisma.userInvitation.findMany({
    where: { companyId: auth.admin.companyId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, name: true, role: true, token: true, expiresAt: true, usedAt: true, createdAt: true },
  })

  return NextResponse.json(invitations)
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, name, role } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

  // Plan gate: only FREE has a hard cap. On paid plans, members beyond the
  // included seats are billed per-seat (soft model — see syncSeatQuantity).
  const plan = await getCompanyPlan(auth.admin.companyId)
  if (plan === 'FREE') {
    const currentCount = await getActiveMemberCount(auth.admin.companyId)
    if (currentCount >= PLAN_LIMITS.FREE.maxEmployees) {
      return NextResponse.json(
        { error: `Limite du plan gratuit atteinte (${PLAN_LIMITS.FREE.maxEmployees} utilisateurs). Passez à un plan payant pour ajouter des membres.` },
        { status: 403 }
      )
    }
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (existing) return NextResponse.json({ error: 'Un compte existe déjà avec cet email' }, { status: 409 })

  const pendingInvitation = await prisma.userInvitation.findFirst({
    where: { email: email.toLowerCase().trim(), companyId: auth.admin.companyId, usedAt: null, expiresAt: { gt: new Date() } },
  })
  if (pendingInvitation) return NextResponse.json({ error: 'Une invitation est déjà en attente pour cet email' }, { status: 409 })

  const company = await prisma.company.findUnique({
    where: { id: auth.admin.companyId },
    select: { name: true },
  })

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

  const invitation = await prisma.userInvitation.create({
    data: {
      email: email.toLowerCase().trim(),
      name: name?.trim() || null,
      role: role ?? 'EMPLOYEE',
      companyId: auth.admin.companyId,
      expiresAt,
    },
  })

  await sendInvitationEmail({
    to: invitation.email,
    name: invitation.name,
    companyName: company?.name ?? 'votre entreprise',
    token: invitation.token,
  })

  await logAudit({
    userId: auth.admin.id,
    action: 'admin_invite_user',
    resource: 'UserInvitation',
    resourceId: invitation.id,
    changes: { email: invitation.email, role: invitation.role },
  })

  return NextResponse.json({ ok: true, id: invitation.id })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  const old = await prisma.userInvitation.findFirst({
    where: { id, companyId: auth.admin.companyId },
  })
  if (!old) return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 })
  if (old.usedAt) return NextResponse.json({ error: 'Invitation déjà utilisée' }, { status: 409 })

  const company = await prisma.company.findUnique({
    where: { id: auth.admin.companyId },
    select: { name: true },
  })

  await prisma.userInvitation.delete({ where: { id } })

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
  const invitation = await prisma.userInvitation.create({
    data: {
      email: old.email,
      name: old.name,
      role: old.role,
      companyId: auth.admin.companyId,
      expiresAt,
    },
  })

  await sendInvitationEmail({
    to: invitation.email,
    name: invitation.name,
    companyName: company?.name ?? 'votre entreprise',
    token: invitation.token,
  })

  await logAudit({
    userId: auth.admin.id,
    action: 'admin_invite_user',
    resource: 'UserInvitation',
    resourceId: invitation.id,
    changes: { email: invitation.email, role: invitation.role, resent: true },
  })

  return NextResponse.json({ ok: true, id: invitation.id })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  await prisma.userInvitation.deleteMany({
    where: { id, companyId: auth.admin.companyId },
  })

  await logAudit({
    userId: auth.admin.id,
    action: 'admin_cancel_invitation',
    resource: 'UserInvitation',
    resourceId: id,
  })

  return NextResponse.json({ ok: true })
}
