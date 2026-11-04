export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { Card } from '@/components/Card'
import { prisma } from '@/lib/prisma'
import { computeRevenue, revenueCompanyQuery, toRevenueCompany } from '@/lib/revenue'

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
    revenueCompanies,
  ] = await Promise.all([
    prisma.company.count({ where: baseWhere }),
    prisma.company.count({ where: { ...baseWhere, lastActivityAt: { gte: ninetyDaysAgo } } }),
    prisma.company.count({ where: { ...baseWhere, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.company.count({ where: { ...baseWhere, planId: { not: null }, stripeSubscriptionId: { not: null } } }),
    prisma.company.count({ where: { ...baseWhere, stripeSubscriptionId: { not: null }, stripeCancelAtPeriodEnd: true } }),
    prisma.user.count({ where: userWhere }),
    prisma.user.count({ where: { ...userWhere, clockRecords: { some: { arrivalTime: { gte: sevenDaysAgo } } } } }),
    prisma.user.count({ where: { ...userWhere, clockRecords: { some: { arrivalTime: { gte: thirtyDaysAgo } } } } }),
    prisma.company.findMany(revenueCompanyQuery),
  ])

  const ghostCompanies = totalCompanies - activeCompanies
  const churnRate = companiesWithPlan > 0 ? Math.round((churningCompanies / companiesWithPlan) * 100) : 0

  const stats = { totalCompanies, activeCompanies, ghostCompanies, newCompaniesThisMonth, companiesWithPlan, totalUsers, activeUsers7d, activeUsers30d, churningCompanies, churnRate }

  const revenue = computeRevenue(revenueCompanies.map(toRevenueCompany), now)

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
            {revenue.yearlyBillingCount + revenue.contractCount}
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
        <div className="h-64 flex items-end gap-1">
          {revenue.monthlyData.map((data, idx) => {
            const maxMrr = Math.max(...revenue.monthlyData.map(d => d.mrr)) || 1
            const heightPercent = (data.mrr / maxMrr) * 100
            return (
              <div key={idx} className="flex-1 h-full flex flex-col items-center gap-1">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full bg-gradient-to-t from-[#10b981] to-[#6ee7b7] rounded-t transition-all hover:opacity-80"
                    style={{ height: `${heightPercent}%`, minHeight: '4px' }}
                    title={`${data.month}: €${data.mrr.toFixed(2)} (Mensuel: €${data.mrrMonthly.toFixed(2)}, Annuel: €${data.mrrYearly.toFixed(2)}, Contrats: €${data.mrrContracts.toFixed(2)})`}
                  />
                </div>
                <span className="text-xs text-[var(--pp-muted)]">{data.month}</span>
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-[var(--pp-muted)]">Historique basé sur les dates des contrats Enterprise hors Stripe ; les abonnements Stripe n&apos;apparaissent qu&apos;à partir du mois en cours.</p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[var(--pp-muted)] text-xs">MRR Plans Mensuels</p>
            <p className="text-lg font-bold text-[#6366f1]">€{revenue.mrrMonthly.toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-[var(--pp-muted)] text-xs">MRR Plans Annuels (÷12)</p>
            <p className="text-lg font-bold text-[#ec4899]">€{revenue.mrrYearly.toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-[var(--pp-muted)] text-xs">Contrats hors Stripe (÷12)</p>
            <p className="text-lg font-bold text-[#f59e0b]">€{revenue.mrrContracts.toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-[var(--pp-muted)] text-xs">Ratio Mensuel/Annuel</p>
            <p className="text-lg font-bold text-[var(--pp-info)]">
              {revenue.mrrMonthly > 0 && revenue.mrrYearly + revenue.mrrContracts > 0
                ? `${((revenue.mrrMonthly / revenue.mrrTotal) * 100).toFixed(0)}% / ${(((revenue.mrrYearly + revenue.mrrContracts) / revenue.mrrTotal) * 100).toFixed(0)}%`
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
