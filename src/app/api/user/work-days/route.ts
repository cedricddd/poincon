import { auth } from '@/auth'
import { loadWorkDays } from '@/lib/leave-days-server'
import { NextResponse } from 'next/server'

/** Working days of the signed-in user, for the leave request preview. */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const workDays = (await loadWorkDays([session.user.id])).get(session.user.id)!
  return NextResponse.json({ workDays })
}
