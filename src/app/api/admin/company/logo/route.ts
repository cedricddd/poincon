import { NextRequest, NextResponse } from 'next/server'
import { requireAdminWithCompany } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'logos')
const MAX_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export async function POST(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('logo') as File | null
  if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Format non supporté (PNG, JPG, WebP, SVG)' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Fichier trop lourd (max 2 Mo)' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
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
  const buffer = Buffer.from(await file.arrayBuffer())
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
