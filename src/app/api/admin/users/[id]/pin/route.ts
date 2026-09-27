import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { findUsersByPin, PIN_REGEX } from '@/lib/kiosk-pin'

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

    if (typeof pin !== 'string' || !PIN_REGEX.test(pin)) {
      return NextResponse.json({ error: 'Le PIN doit contenir exactement 4 chiffres' }, { status: 400 })
    }

    const taken = await findUsersByPin(admin.companyId, pin, { excludeUserId: id })
    if (taken.length > 0) {
      return NextResponse.json({ error: 'Ce PIN est déjà utilisé par un autre employé. Choisissez-en un autre.' }, { status: 409 })
    }

    // Use 4 rounds for PIN — fast enough for kiosk (~2ms) while still blocking offline attacks
    const hashed = await bcrypt.hash(pin, 4)
    await prisma.user.update({ where: { id }, data: { kioskPin: hashed } })

    return NextResponse.json({ ok: true, pinSet: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
