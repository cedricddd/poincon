import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const records = await prisma.clockRecord.findMany({
    where: {
      departureTime: null,
      date: { gte: today, lt: tomorrow },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      site: { select: { id: true, name: true } },
    },
    orderBy: { arrivalTime: "asc" },
  })

  // Group by site
  const bySite = new Map<string, { site: { id: string; name: string } | null; people: typeof records }>()

  for (const r of records) {
    const key = r.siteId ?? "__none__"
    if (!bySite.has(key)) {
      bySite.set(key, { site: r.site, people: [] })
    }
    bySite.get(key)!.people.push(r)
  }

  const groups = Array.from(bySite.values()).sort((a, b) => {
    if (!a.site) return 1
    if (!b.site) return -1
    return a.site.name.localeCompare(b.site.name, "fr")
  })

  return NextResponse.json({ groups, total: records.length, asOf: new Date().toISOString() })
}
