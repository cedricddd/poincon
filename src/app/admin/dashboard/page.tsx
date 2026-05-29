'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePlan } from '@/hooks/usePlan'
import { UpgradeBanner } from '@/components/UpgradeBanner'

/* ── Types ──────────────────────────────────────────────────────────────── */

type Counts = {
  overtimes: number
  timeoffs: number
  rtts: number
  users: number
  presentNow: number
  noSchedule: number
  weekMinutes: number
}

type PresentPerson = {
  user: { id: string; name: string | null; email: string }
  site: { id: string; name: string } | null
  arrivalTime: string
}

type RecentRecord = {
  id: string
  user: { name: string | null; email: string }
  site: { name: string } | null
  arrivalTime: string
  departureTime: string | null
  duration: number | null
  location: string
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
}

function fmtHours(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

function weekRange() {
  const now = new Date()
  const day = now.getDay() === 0 ? 7 : now.getDay()
  const mon = new Date(now); mon.setDate(now.getDate() - (day - 1)); mon.setHours(0,0,0,0)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999)
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  return { from: fmt(mon), to: fmt(sun) }
}

/* ── Stat card ──────────────────────────────────────────────────────────── */

function StatCard({
  href, label, value, unit, color, urgent, icon,
}: {
  href: string; label: string; value: string | number; unit: string
  color: string; urgent?: boolean; icon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border p-5 transition-all hover:shadow-md hover:-translate-y-0.5 bg-[var(--pp-bg)]"
      style={{ borderColor: urgent ? `${color}60` : 'var(--pp-line)', background: urgent ? `${color}08` : '' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, color }}>
          {icon}
        </div>
        {urgent && Number(value) > 0 && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: color }}>
            {value}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-[var(--pp-ink)] mb-0.5 tabular-nums">{value}</div>
      <div className="text-xs text-[var(--pp-muted)] mb-2">{unit}</div>
      <div className="text-sm font-semibold transition-colors" style={{ color: 'var(--pp-muted)' }}
        onMouseEnter={e => (e.currentTarget.style.color = color)}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--pp-muted)')}>
        {label} →
      </div>
    </Link>
  )
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function AdminDashboard() {
  const { planInfo, upgradeTo } = usePlan()
  const [counts, setCounts] = useState<Counts>({ overtimes: 0, timeoffs: 0, rtts: 0, users: 0, presentNow: 0, noSchedule: 0, weekMinutes: 0 })
  const [present, setPresent] = useState<PresentPerson[]>([])
  const [recent, setRecent] = useState<RecentRecord[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
    const { from, to } = weekRange()
    const [req, sched, users, presence, reports] = await Promise.all([
      fetch('/api/admin/requests').then(r => r.json()),
      fetch('/api/admin/schedule').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/presence').then(r => r.json()),
      fetch(`/api/admin/reports?from=${from}&to=${to}&page=1`).then(r => r.json()),
    ])

    const schedules: any[] = sched.schedules ?? []
    const allUsers: any[] = users.users ?? []
    const groups: any[] = presence.groups ?? []

    // People present right now
    const presentPeople: PresentPerson[] = groups.flatMap((g: any) =>
      g.people.map((p: any) => ({ user: p.user, site: g.site, arrivalTime: p.arrivalTime }))
    )

    // Employees without schedule
    const noSchedule = allUsers.filter(u => u.role === 'EMPLOYEE' && !schedules.find((s: any) => s.userId === u.id && s.scheduleId)).length

    // Week minutes
    const weekMinutes: number = reports.stats?.totalMinutes ?? 0

    // Recent records (departures today + yesterday)
    const recentRecs: RecentRecord[] = (reports.records ?? []).slice(0, 8)

    setCounts({
      overtimes: req.overtimes?.filter((o: any) => o.status === 'PENDING').length ?? 0,
      timeoffs: req.timeOffs?.filter((t: any) => t.status === 'PENDING').length ?? 0,
      rtts: req.rtts?.filter((r: any) => r.status === 'PENDING').length ?? 0,
      users: allUsers.filter((u: any) => u.role === 'EMPLOYEE').length,
      presentNow: presence.total ?? 0,
      noSchedule,
      weekMinutes,
    })
    setPresent(presentPeople)
    setRecent(recentRecs)
    } catch (e) {
      console.error('Dashboard load error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const totalPending = counts.overtimes + counts.timeoffs + counts.rtts

  const statCards = [
    {
      href: '/admin/dashboard/overtimes', label: 'Heures supplémentaires',
      value: counts.overtimes, unit: 'en attente',
      color: '#fb923c', urgent: counts.overtimes > 0,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/></svg>,
    },
    {
      href: '/admin/dashboard/timeoffs', label: 'Congés',
      value: counts.timeoffs, unit: 'en attente',
      color: '#0ea5e9', urgent: counts.timeoffs > 0,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    },
    {
      href: '/admin/dashboard/rtts', label: 'Récupération',
      value: counts.rtts, unit: 'en attente',
      color: '#f59e0b', urgent: counts.rtts > 0,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    },
    {
      href: '/admin/dashboard/presence', label: 'Présences',
      value: counts.presentNow, unit: 'pointés maintenant',
      color: '#10b981', urgent: false,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    },
    {
      href: '/admin/dashboard/users', label: 'Utilisateurs',
      value: counts.users, unit: 'employés actifs',
      color: '#6366f1', urgent: false,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    },
    {
      href: '/admin/dashboard/schedules', label: 'Sans horaire',
      value: counts.noSchedule, unit: 'à configurer',
      color: '#8b5cf6', urgent: counts.noSchedule > 0,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    },
  ]

  return (
    <div className="p-6 md:p-8 max-w-6xl">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--pp-ink)] mb-1">Tableau de bord</h1>
          <p className="text-sm text-[var(--pp-muted)]">
            {loading ? 'Chargement…' : totalPending > 0
              ? `${totalPending} demande${totalPending > 1 ? 's' : ''} en attente`
              : 'Tout est à jour ✓'}
          </p>
        </div>
        {!loading && counts.weekMinutes > 0 && (
          <div className="text-right">
            <p className="text-xs text-[var(--pp-muted)]">Heures pointées cette semaine</p>
            <p className="text-2xl font-bold text-[var(--pp-pos)]">{fmtHours(counts.weekMinutes)}</p>
          </div>
        )}
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {[...Array(6)].map((_, i) => <div key={i} className="pp-skel h-36 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {statCards.map(c => <StatCard key={c.href} {...c} />)}
        </div>
      )}

      {/* Upgrade banner */}
      {planInfo && planInfo.plan !== 'ENTERPRISE' && upgradeTo && (
        <div className="mb-6">
          {planInfo.plan === 'FREE' && (
            <UpgradeBanner
              currentPlan={planInfo.plan}
              upgradeTo="SOLO"
              feature="Vous utilisez le plan gratuit"
              description={`Limité à ${planInfo.maxEmployees} employés. Passez au plan SOLO pour plus d'employés, ou TEAM pour les équipes et managers.`}
            />
          )}
          {planInfo.plan === 'SOLO' && !planInfo.canTeams && (
            <UpgradeBanner
              currentPlan={planInfo.plan}
              upgradeTo={upgradeTo}
              feature="Plan SOLO actif"
              description="Les équipes, managers et exports illimités sont disponibles à partir du plan TEAM."
            />
          )}
        </div>
      )}

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Présences live */}
        <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--pp-pos)] animate-pulse" />
              <h2 className="text-sm font-semibold text-[var(--pp-ink)]">Présences en direct</h2>
            </div>
            <Link href="/admin/dashboard/presence" className="text-xs text-[var(--pp-muted)] hover:text-[var(--pp-pos)] transition">
              Voir tout →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="pp-skel h-10" />)}</div>
          ) : present.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[var(--pp-muted)]">Personne de pointé en ce moment</p>
            </div>
          ) : (
            <div className="space-y-2">
              {present.slice(0, 8).map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--pp-line)] last:border-b-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[var(--pp-pos)]/15 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-[var(--pp-pos)]">
                        {(p.user.name ?? p.user.email)[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--pp-ink)] leading-tight">
                        {p.user.name ?? p.user.email.split('@')[0]}
                      </p>
                      {p.site && <p className="text-xs text-[var(--pp-muted)]">{p.site.name}</p>}
                    </div>
                  </div>
                  <span className="text-xs font-mono text-[var(--pp-pos)] bg-[var(--pp-pos)]/10 px-2 py-0.5 rounded-full">
                    depuis {fmtTime(p.arrivalTime)}
                  </span>
                </div>
              ))}
              {present.length > 8 && (
                <p className="text-xs text-center text-[var(--pp-muted)] pt-1">+{present.length - 8} autres</p>
              )}
            </div>
          )}
        </div>

        {/* Activité récente */}
        <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--pp-ink)]">Activité récente</h2>
            <Link href="/admin/dashboard/reports" className="text-xs text-[var(--pp-muted)] hover:text-[var(--pp-info)] transition">
              Voir tout →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="pp-skel h-10" />)}</div>
          ) : recent.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[var(--pp-muted)]">Aucun pointage cette semaine</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--pp-line)] last:border-b-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[var(--pp-info)]/15 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-[var(--pp-info)]">
                        {(r.user.name ?? r.user.email)[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--pp-ink)] leading-tight">
                        {r.user.name ?? r.user.email.split('@')[0]}
                      </p>
                      <p className="text-xs text-[var(--pp-muted)]">
                        {fmtTime(r.arrivalTime)} → {r.departureTime ? fmtTime(r.departureTime) : <span className="text-[var(--pp-pos)]">en cours</span>}
                        {r.site ? ` · ${r.site.name}` : ''}
                      </p>
                    </div>
                  </div>
                  {r.duration != null && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--pp-info)]/10 text-[var(--pp-info)]">
                      {fmtHours(r.duration)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
