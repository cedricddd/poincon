import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { findApprovedLeaveOn } from "@/lib/leave-today"

// Approved leave covering today (Brussels), so the clock screen can say "on leave" instead
// of asking to clock in. Informational only: clocking in stays allowed.
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const leave = await findApprovedLeaveOn(session.user.id)

  return NextResponse.json({
    leave: leave
      ? { leaveType: leave.leaveType, endDate: leave.endDate.toISOString().slice(0, 10) }
      : null,
  })
}
