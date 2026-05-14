import { NextResponse } from "next/server"
import { requireAdminWithCompany, forbiddenError } from "@/lib/admin-security"
import { prisma } from "@/lib/prisma"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminWithCompany()
  if (!auth) {
    return forbiddenError()
  }

  // TODO: Site model doesn't have companyId yet — add to schema and filter here
  const { name, address, active } = await request.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: "Le nom du site est requis" }, { status: 400 })
  }

  const updated = await prisma.site.update({
    where: { id: params.id },
    data: {
      name: name.trim(),
      address: address?.trim() || null,
      ...(typeof active === "boolean" && { active }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminWithCompany()
  if (!auth) {
    return forbiddenError()
  }

  // TODO: Site model doesn't have companyId yet — add to schema and filter here
  const usersCount = await prisma.user.count({ where: { defaultSiteId: params.id } })
  if (usersCount > 0) {
    return NextResponse.json(
      { error: `Impossible de supprimer : ${usersCount} employé(s) ont ce site comme site par défaut` },
      { status: 409 }
    )
  }

  await prisma.site.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
