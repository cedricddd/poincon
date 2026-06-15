import { NextResponse } from "next/server"
import { requireAdminWithCompany, forbiddenError } from "@/lib/admin-security"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  try {
    const now = new Date()
    // UTC boundaries to avoid timezone drift between Node.js and the DB
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const tomorrowUTC = new Date(todayUTC)
    tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1)

    console.log("[presence] companyId:", auth.admin.companyId, "range:", todayUTC.toISOString(), "→", tomorrowUTC.toISOString())

    const [records, visitors] = await Promise.all([
      // Employees clocked in today with no departure — filter on arrivalTime (always explicitly set)
      prisma.clockRecord.findMany({
        where: {
          departureTime: null,
          arrivalTime: { gte: todayUTC, lt: tomorrowUTC },
          user: { companyId: auth.admin.companyId },
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          site: { select: { id: true, name: true } },
          breaks: { where: { endedAt: null }, select: { id: true }, take: 1 },
        },
        orderBy: { arrivalTime: "asc" },
      }),
      // Visitors arrived today with no departure
      prisma.kioskVisit.findMany({
        where: {
          companyId: auth.admin.companyId,
          arrivedAt: { gte: todayUTC, lt: tomorrowUTC },
          departedAt: null,
        },
        include: {
          host: { select: { id: true, name: true } },
        },
        orderBy: { arrivedAt: "asc" },
      }),
    ])

    type PersonWithBreak = (typeof records)[number] & { onBreak: boolean }

    const bySite = new Map<string, { site: { id: string; name: string } | null; people: PersonWithBreak[] }>()
    for (const r of records) {
      const key = r.siteId ?? "__none__"
      if (!bySite.has(key)) bySite.set(key, { site: r.site, people: [] })
      bySite.get(key)!.people.push({ ...r, onBreak: r.breaks.length > 0 })
    }

    const groups = Array.from(bySite.values()).sort((a, b) => {
      if (!a.site) return 1
      if (!b.site) return -1
      return a.site.name.localeCompare(b.site.name, "fr")
    })

    console.log("[presence] records:", records.length, "visitors:", visitors.length)

    return NextResponse.json({
      groups,
      total: records.length,
      visitors,
      asOf: new Date().toISOString(),
    })
  } catch (err) {
    console.error("[presence] API error:", err)
    return NextResponse.json({ error: "Erreur serveur", detail: String(err) }, { status: 500 })
  }
}
