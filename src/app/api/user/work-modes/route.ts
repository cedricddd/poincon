import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getActiveWorkModes } from "@/lib/work-modes"

// Work codes the employee can pick at clock-in. Empty when the company has no work_rules flag.
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true },
  })

  const modes = user?.companyId ? await getActiveWorkModes(user.companyId) : []

  return NextResponse.json({
    modes: modes.map(m => ({
      id: m.id, code: m.code, label: m.label, isDefault: m.isDefault,
      requireOnSiteArrival: m.requireOnSiteArrival,
      arrivalLimit: m.blockArrivalAfterLatest ? m.latestClockTime : null,
    })),
  })
}
