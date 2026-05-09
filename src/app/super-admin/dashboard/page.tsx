import { Card } from '@/components/Card'

export default async function SuperAdminDashboard() {
  let stats = {
    totalCompanies: 0,
    activeCompanies: 0,
    ghostCompanies: 0,
    newCompaniesThisMonth: 0,
    companiesWithPlan: 0,
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
  } catch (error) {
    console.error('Failed to fetch stats:', error)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--pp-ink)]">Super-Admin Dashboard</h1>
        <p className="text-[var(--pp-muted)] mt-1">Gestion commerciale de PoinçOn</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-5 hover:shadow-md hover:-translate-y-0.5 transition">
          <div className="text-2xl font-bold tabular-nums text-[var(--pp-ink)]">
            {stats.totalCompanies}
          </div>
          <p className="text-xs text-[var(--pp-muted)] mt-2">Total Sociétés</p>
        </div>

        <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-5 hover:shadow-md hover:-translate-y-0.5 transition">
          <div className="text-2xl font-bold tabular-nums text-[#10b981]">
            {stats.activeCompanies}
          </div>
          <p className="text-xs text-[var(--pp-muted)] mt-2">Actives</p>
        </div>

        <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-5 hover:shadow-md hover:-translate-y-0.5 transition">
          <div className="text-2xl font-bold tabular-nums text-[#ef4444]">
            {stats.ghostCompanies}
          </div>
          <p className="text-xs text-[var(--pp-muted)] mt-2">Fantômes (90j inactives)</p>
        </div>

        <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-5 hover:shadow-md hover:-translate-y-0.5 transition">
          <div className="text-2xl font-bold tabular-nums text-[#0ea5e9]">
            {stats.newCompaniesThisMonth}
          </div>
          <p className="text-xs text-[var(--pp-muted)] mt-2">Nouvelles (30j)</p>
        </div>

        <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-5 hover:shadow-md hover:-translate-y-0.5 transition">
          <div className="text-2xl font-bold tabular-nums text-[#6366f1]">
            {stats.companiesWithPlan}
          </div>
          <p className="text-xs text-[var(--pp-muted)] mt-2">Avec Plan</p>
        </div>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-[var(--pp-ink)]">Actions rapides</h2>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-[var(--pp-muted)]">
            ✓ Consultez les <a href="/super-admin/accounts" className="text-[#6366f1] hover:underline">comptes clients</a>
          </p>
          <p className="text-sm text-[var(--pp-muted)]">
            ✓ Alertes d&apos;usage: <a href="/super-admin/accounts?status=OVER_QUOTA" className="text-[#6366f1] hover:underline">comptes dépassant leur quota</a>
          </p>
          <p className="text-sm text-[var(--pp-muted)]">
            ✓ Gérez les <a href="/super-admin/email" className="text-[#6366f1] hover:underline">emails en masse</a>
          </p>
        </div>
      </Card>
    </div>
  )
}
