import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sites = await prisma.site.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true } } },
  })

  return NextResponse.json(sites)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name, address } = await request.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: "Le nom du site est requis" }, { status: 400 })
  }

  const site = await prisma.site.create({
    data: { name: name.trim(), address: address?.trim() || null },
  })

  return NextResponse.json(site, { status: 201 })
}
