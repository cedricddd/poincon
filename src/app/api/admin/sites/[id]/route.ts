import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name, address, active } = await request.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: "Le nom du site est requis" }, { status: 400 })
  }

  const site = await prisma.site.update({
    where: { id: params.id },
    data: {
      name: name.trim(),
      address: address?.trim() || null,
      ...(typeof active === "boolean" && { active }),
    },
  })

  return NextResponse.json(site)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
