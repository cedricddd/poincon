import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const VALID_LOCALES = ['fr', 'nl', 'en', 'de']

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { locale: true },
  })

  return NextResponse.json({ locale: user?.locale ?? null })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { locale } = await req.json()
  if (!VALID_LOCALES.includes(locale)) {
    return NextResponse.json({ error: 'Locale invalide' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { locale },
  })

  return NextResponse.json({ ok: true })
}
