import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { defaultSiteId: true, companyId: true },
  })

  const sites = user?.companyId
    ? await prisma.site.findMany({
        where: { active: true, companyId: user.companyId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : []

  return NextResponse.json({ sites, defaultSiteId: user?.defaultSiteId ?? null })
}
