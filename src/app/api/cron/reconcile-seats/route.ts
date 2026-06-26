import { prisma } from '@/lib/prisma'
import { syncSeatQuantity } from '@/lib/billing'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Nightly reconciliation: push each company's extra-seat quantity to Stripe so
 * it matches the current active member count. Safety net against drift if a
 * real-time trigger was missed.
 *
 * Optional ?companyId=xxx targets a single company (used for ops/debug).
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const targetId = req.nextUrl.searchParams.get('companyId')

  const companies = await prisma.company.findMany({
    where: {
      deletedAt: null,
      stripeSubscriptionId: { not: null },
      ...(targetId ? { id: targetId } : {}),
    },
    select: { id: true, name: true },
  })

  const results: { company: string; ok: boolean; error?: string }[] = []
  for (const company of companies) {
    try {
      await syncSeatQuantity(company.id)
      results.push({ company: company.name, ok: true })
    } catch (err) {
      results.push({ company: company.name, ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return NextResponse.json({ reconciled: results.length, results })
}
