import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    })
    if (!isAdminRole(admin?.role) || !admin?.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { companyId: true },
    })
    if (!target || target.companyId !== admin.companyId) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const { pin } = await req.json()

    if (pin === null || pin === '') {
      await prisma.user.update({ where: { id }, data: { kioskPin: null } })
      return NextResponse.json({ ok: true, pinSet: false })
    }

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'Le PIN doit contenir exactement 4 chiffres' }, { status: 400 })
    }

    // Use 4 rounds for PIN — fast enough for kiosk (~2ms) while still blocking offline attacks
    const hashed = await bcrypt.hash(pin, 4)
    await prisma.user.update({ where: { id }, data: { kioskPin: hashed } })

    return NextResponse.json({ ok: true, pinSet: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
