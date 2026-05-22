import { NextRequest, NextResponse } from 'next/server'
import { requireAdminWithCompany } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { sendInvitationEmail } from '@/lib/mail'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const invitations = await prisma.userInvitation.findMany({
    where: { companyId: auth.admin.companyId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, name: true, role: true, expiresAt: true, usedAt: true, createdAt: true },
  })

  return NextResponse.json(invitations)
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, name, role } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

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
