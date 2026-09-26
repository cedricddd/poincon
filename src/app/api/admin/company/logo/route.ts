import { NextRequest, NextResponse } from 'next/server'
import { requireAdminWithCompany } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import { validateLogoUpload } from '@/lib/image-upload'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'logos')

export async function POST(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('logo') as File | null
  if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })

  const validation = await validateLogoUpload(file)
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })
  const { buffer, ext } = validation.image

  const filename = `${auth.admin.companyId}-${Date.now()}.${ext}`

  // Delete previous logo file
  const existing = await prisma.company.findUnique({
    where: { id: auth.admin.companyId },
    select: { logoUrl: true },
  })
  if (existing?.logoUrl) {
    const oldName = path.basename(existing.logoUrl)
    await unlink(path.join(UPLOAD_DIR, oldName)).catch(() => {})
  }

  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(path.join(UPLOAD_DIR, filename), buffer)

  const logoUrl = `/api/uploads/logos/${filename}`
  await prisma.company.update({
    where: { id: auth.admin.companyId },
    data: { logoUrl },
  })

  return NextResponse.json({ logoUrl })
}

export async function DELETE() {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const existing = await prisma.company.findUnique({
    where: { id: auth.admin.companyId },
    select: { logoUrl: true },
  })
  if (existing?.logoUrl) {
    const oldName = path.basename(existing.logoUrl)
    await unlink(path.join(UPLOAD_DIR, oldName)).catch(() => {})
  }

  await prisma.company.update({
    where: { id: auth.admin.companyId },
    data: { logoUrl: null },
  })

  return NextResponse.json({ ok: true })
}
