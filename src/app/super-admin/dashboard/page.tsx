export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { Card } from '@/components/Card'

interface RevenueData {
  mrrTotal: number
  mrrMonthly: number
  mrrYearly: number
  arrTotal: number
  subscriptionCount: number
  monthlyBillingCount: number
  yearlyBillingCount: number
  monthlyData: Array<{
    month: string
    mrr: number
    mrrMonthly: number
    mrrYearly: number
  }>
}

export default async function SuperAdminDashboard() {
  let stats = {
    totalCompanies: 0,
    activeCompanies: 0,
    ghostCompanies: 0,
    newCompaniesThisMonth: 0,
    companiesWithPlan: 0,
    totalUsers: 0,
    activeUsers7d: 0,
    activeUsers30d: 0,
    churningCompanies: 0,
    churnRate: 0,
  }

  let revenue: RevenueData = {
    mrrTotal: 0,
    mrrMonthly: 0,
    mrrYearly: 0,
    arrTotal: 0,
    subscriptionCount: 0,
    monthlyBillingCount: 0,
    yearlyBillingCount: 0,
    monthlyData: [],
  }

  try {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL}/api/super-admin/stats`,
      {
        headers: { 'Cache-Control': 'no-store' },
        next: { revalidate: 0 },
      }
    )
    if (res.ok) {
      stats = await res.json()
    }

    const revenueRes = await fetch(
      `${process.env.NEXTAUTH_URL}/api/super-admin/revenue`,
      {
        headers: { 'Cache-Control': 'no-store' },
        next: { revalidate: 0 },
      }
    )
    if (revenueRes.ok) {
      revenue = await revenueRes.json()
    }
  } catch (error) {
    console.error('Failed to fetch stats:', error)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--pp-ink)]">Super-Admin Dashboard</h1>
        <p className="text-[var(--pp-muted)] mt-1">Gestion commerciale de Pointon</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-5 hover:shadow-md hover:-translate-y-0.5 transition">
          <div className="text-2xl font-bold tabular-nums text-[#10b981]">
            €{revenue.mrrTotal.toLocaleString('fr-BE')}
          </div>
          <p className="text-xs text-[var(--pp-muted)] mt-2">MRR Total</p>
        </div>

        <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-5 hover:shadow-md hover:-translate-y-0.5 transition">
          <div className="text-2xl font-bold tabular-nums text-[#0ea5e9]">
            €{revenue.arrTotal.toLocaleString('fr-BE')}
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
            <p className="text-lg font-bold text-[#6366f1]">€{revenue.mrrMonthly.toLocaleString('fr-BE')}</p>
          </div>
          <div>
            <p className="text-[var(--pp-muted)] text-xs">MRR Plans Annuels (÷12)</p>
            <p className="text-lg font-bold text-[#ec4899]">€{revenue.mrrYearly.toLocaleString('fr-BE')}</p>
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
