import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { companyHasAddon } from '@/lib/plan'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import { validateLogoUpload } from '@/lib/image-upload'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'kiosk-logos')

async function requireAdminToken(id: string) {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, companyId: true },
  })
  if (!isAdminRole(user?.role) || !user?.companyId) return null
  const token = await prisma.kioskToken.findUnique({ where: { id } })
  if (!token || token.companyId !== user.companyId) return null
  return token
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = await requireAdminToken(id)
  if (!token) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!await companyHasAddon(token.companyId, 'addon_kiosk_advanced')) {
    return NextResponse.json({ error: 'Add-on Kiosk avancé requis' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('logo') as File | null
  if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })

  const validation = await validateLogoUpload(file)
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })
  const { buffer, ext } = validation.image

  const filename = `${id}-${Date.now()}.${ext}`

  if (token.logoUrl) {
    const oldName = path.basename(token.logoUrl)
    await unlink(path.join(UPLOAD_DIR, oldName)).catch(() => {})
  }

  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(path.join(UPLOAD_DIR, filename), buffer)

  const logoUrl = `/api/uploads/kiosk-logos/${filename}`
  const updated = await prisma.kioskToken.update({
    where: { id },
    data: { logoUrl },
    include: { site: { select: { id: true, name: true } } },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = await requireAdminToken(id)
  if (!token) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (token.logoUrl) {
    const oldName = path.basename(token.logoUrl)
    await unlink(path.join(UPLOAD_DIR, oldName)).catch(() => {})
  }

  const updated = await prisma.kioskToken.update({
    where: { id },
    data: { logoUrl: null },
    include: { site: { select: { id: true, name: true } } },
  })

  return NextResponse.json(updated)
}
