export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { Card } from '@/components/Card'
import { prisma } from '@/lib/prisma'
import { STRIPE_PRICES } from '@/lib/stripe'

export default async function SuperAdminDashboard() {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  const baseWhere = { deletedAt: null, isInternal: false }

  const internalIds = (await prisma.company.findMany({
    where: { isInternal: true },
    select: { id: true },
  })).map(c => c.id)

  const userWhere = {
    deletedAt: null,
    ...(internalIds.length > 0 && { companyMember: { isInternal: false } }),
  }

  const [
    totalCompanies,
    activeCompanies,
    newCompaniesThisMonth,
    companiesWithPlan,
    churningCompanies,
    totalUsers,
    activeUsers7d,
    activeUsers30d,
    paidCompanies,
  ] = await Promise.all([
    prisma.company.count({ where: baseWhere }),
    prisma.company.count({ where: { ...baseWhere, lastActivityAt: { gte: ninetyDaysAgo } } }),
    prisma.company.count({ where: { ...baseWhere, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.company.count({ where: { ...baseWhere, planId: { not: null }, stripeSubscriptionId: { not: null } } }),
    prisma.company.count({ where: { ...baseWhere, stripeSubscriptionId: { not: null }, stripeCancelAtPeriodEnd: true } }),
    prisma.user.count({ where: userWhere }),
    prisma.user.count({ where: { ...userWhere, clockRecords: { some: { arrivalTime: { gte: sevenDaysAgo } } } } }),
    prisma.user.count({ where: { ...userWhere, clockRecords: { some: { arrivalTime: { gte: thirtyDaysAgo } } } } }),
    prisma.company.findMany({
      where: { ...baseWhere, stripeSubscriptionId: { not: null }, planId: { not: null } },
      include: { plan: { select: { name: true } } },
    }),
  ])

  const ghostCompanies = totalCompanies - activeCompanies
  const churnRate = companiesWithPlan > 0 ? Math.round((churningCompanies / companiesWithPlan) * 100) : 0

  const stats = { totalCompanies, activeCompanies, ghostCompanies, newCompaniesThisMonth, companiesWithPlan, totalUsers, activeUsers7d, activeUsers30d, churningCompanies, churnRate }

  let mrrMonthly = 0
  let mrrYearly = 0
  const monthlyCount: Record<string, number> = {}
  const yearlyCount: Record<string, number>  = {}

  for (const company of paidCompanies) {
    const planName = company.plan?.name as string
    const billingCycle = company.stripeSubscriptionBillingCycle
    if (!planName || !STRIPE_PRICES[planName]) continue
    const prices = STRIPE_PRICES[planName]
    if (billingCycle === 'monthly') {
      mrrMonthly += prices.monthlyBaseCents / 100
      monthlyCount[planName] = (monthlyCount[planName] ?? 0) + 1
    } else if (billingCycle === 'yearly') {
      mrrYearly += prices.yearlyBaseCents / 100 / 12
      yearlyCount[planName] = (yearlyCount[planName] ?? 0) + 1
    }
  }

  const mrrTotal = mrrMonthly + mrrYearly
  const arrTotal = mrrTotal * 12
  const monthlyBillingCount = Object.values(monthlyCount).reduce((a, b) => a + b, 0)
  const yearlyBillingCount  = Object.values(yearlyCount).reduce((a, b) => a + b, 0)

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(now)
    date.setMonth(date.getMonth() - (11 - i))
    return {
      month: date.toLocaleString('fr-BE', { month: 'short', year: '2-digit' }),
      mrr: mrrTotal,
      mrrMonthly,
      mrrYearly,
    }
  })

  const revenue = { mrrTotal, mrrMonthly, mrrYearly, arrTotal, monthlyBillingCount, yearlyBillingCount, monthlyData }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--pp-ink)]">Super-Admin Dashboard</h1>
        <p className="text-[var(--pp-muted)] mt-1">Gestion commerciale de Pointon</p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 flex gap-3 items-start">
        <span className="text-xl mt-0.5">📬</span>
        <div>
          <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Rappel — Factures Odoo à envoyer manuellement</p>
          <p className="text-amber-700 dark:text-amber-400 text-sm mt-1">
            Les factures sont créées automatiquement dans Odoo après chaque paiement Stripe, mais tu dois les envoyer toi-même.{' '}
            <a href="https://ced-it.odoo.com/odoo/accounting/customer-invoices" target="_blank" rel="noopener noreferrer"
               className="underline font-medium">Ouvrir Odoo → Factures clients</a>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-5 hover:shadow-md hover:-translate-y-0.5 transition">
          <div className="text-2xl font-bold tabular-nums text-[#10b981]">
            €{revenue.mrrTotal.toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-[var(--pp-muted)] mt-2">MRR Total</p>
        </div>

        <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-5 hover:shadow-md hover:-translate-y-0.5 transition">
          <div className="text-2xl font-bold tabular-nums text-[#0ea5e9]">
            €{revenue.arrTotal.toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-[var(--pp-muted)] mt-2">ARR Total</p>
        </div>

        <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-5 hover:shadow-md hover:-translate-y-0.5 transition">
          <div className="text-2xl font-bold tabular-nums text-[var(--pp-ink)]">
            {stats.totalCompanies}
          </div>
          <p className="text-xs text-[var(--pp-muted)] mt-2">Sociétés</p>
        </div>

        <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-5 hover:shadow-md hover:-translate-y-0.5 transition">
          <div className="text-2xl font-bold tabular-nums text-[#6366f1]">
            {revenue.monthlyBillingCount}
          </div>
          <p className="text-xs text-[var(--pp-muted)] mt-2">Plans Mensuels</p>
        </div>

        <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-5 hover:shadow-md hover:-translate-y-0.5 transition">
          <div className="text-2xl font-bold tabular-nums text-[#ec4899]">
            {revenue.yearlyBillingCount}
          </div>
          <p className="text-xs text-[var(--pp-muted)] mt-2">Plans Annuels</p>
        </div>

        <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-5 hover:shadow-md hover:-translate-y-0.5 transition">
          <div className="text-2xl font-bold tabular-nums text-[#fb923c]">
            {stats.ghostCompanies}
          </div>
          <p className="text-xs text-[var(--pp-muted)] mt-2">Inactifs 90j</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-5 hover:shadow-md hover:-translate-y-0.5 transition">
          <div className="text-2xl font-bold tabular-nums text-[#6366f1]">
            +{stats.newCompaniesThisMonth}
          </div>
          <p className="text-xs text-[var(--pp-muted)] mt-2">Nouvelles sociétés (30j)</p>
        </div>

        <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-5 hover:shadow-md hover:-translate-y-0.5 transition">
          <div className="text-2xl font-bold tabular-nums text-[var(--pp-ink)]">
            {stats.totalUsers}
          </div>
          <p className="text-xs text-[var(--pp-muted)] mt-2">Utilisateurs total</p>
        </div>

        <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-5 hover:shadow-md hover:-translate-y-0.5 transition">
          <div className="text-2xl font-bold tabular-nums text-[#10b981]">
            {stats.activeUsers7d}
          </div>
          <p className="text-xs text-[var(--pp-muted)] mt-2">Actifs 7 jours</p>
        </div>

        <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-5 hover:shadow-md hover:-translate-y-0.5 transition">
          <div className="text-2xl font-bold tabular-nums text-[#0ea5e9]">
            {stats.activeUsers30d}
          </div>
          <p className="text-xs text-[var(--pp-muted)] mt-2">Actifs 30 jours</p>
        </div>

        <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-5 hover:shadow-md hover:-translate-y-0.5 transition">
          <div className={`text-2xl font-bold tabular-nums ${stats.churnRate > 10 ? 'text-[#ef4444]' : stats.churnRate > 0 ? 'text-[#fb923c]' : 'text-[#10b981]'}`}>
            {stats.churnRate}%
          </div>
          <p className="text-xs text-[var(--pp-muted)] mt-2">
            Churn ({stats.churningCompanies} en attente annulation)
          </p>
        </div>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-6">Revenu MRR — 12 derniers mois</h2>
        <div className="h-64 flex items-flex-end gap-1">
          {revenue.monthlyData.map((data, idx) => {
            const maxMrr = Math.max(...revenue.monthlyData.map(d => d.mrr)) || 1
            const heightPercent = (data.mrr / maxMrr) * 100
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-gradient-to-t from-[#10b981] to-[#6ee7b7] rounded-t transition-all hover:opacity-80"
                  style={{ height: `${heightPercent}%`, minHeight: '4px' }}
                  title={`${data.month}: €${data.mrr.toFixed(2)} (Mensuel: €${data.mrrMonthly.toFixed(2)}, Annuel: €${data.mrrYearly.toFixed(2)})`}
                />
                <span className="text-xs text-[var(--pp-muted)]">{data.month}</span>
              </div>
            )
          })}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-[var(--pp-muted)] text-xs">MRR Plans Mensuels</p>
            <p className="text-lg font-bold text-[#6366f1]">€{revenue.mrrMonthly.toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-[var(--pp-muted)] text-xs">MRR Plans Annuels (÷12)</p>
            <p className="text-lg font-bold text-[#ec4899]">€{revenue.mrrYearly.toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-[var(--pp-muted)] text-xs">Ratio Mensuel/Annuel</p>
            <p className="text-lg font-bold text-[var(--pp-info)]">
              {revenue.mrrMonthly > 0 && revenue.mrrYearly > 0
                ? `${((revenue.mrrMonthly / (revenue.mrrMonthly + revenue.mrrYearly)) * 100).toFixed(0)}% / ${((revenue.mrrYearly / (revenue.mrrMonthly + revenue.mrrYearly)) * 100).toFixed(0)}%`
                : 'N/A'}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-[var(--pp-ink)]">Actions rapides</h2>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-[var(--pp-muted)]">
            ✓ Consultez les <Link href="/super-admin/accounts" className="text-[#6366f1] hover:underline">comptes clients</Link>
          </p>
          <p className="text-sm text-[var(--pp-muted)]">
            ✓ Alertes d&apos;usage: <Link href="/super-admin/accounts?status=OVER_QUOTA" className="text-[#6366f1] hover:underline">comptes dépassant leur quota</Link>
          </p>
          <p className="text-sm text-[var(--pp-muted)]">
            ✓ Gérez les <a href="/super-admin/email" className="text-[#6366f1] hover:underline">emails en masse</a>
          </p>
        </div>
      </Card>
    </div>
  )
}
