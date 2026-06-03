'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { usePlan } from '@/hooks/usePlan'
import { Logo } from '@/components/Logo'

/* ── SVG Icons ──────────────────────────────────────────────────────────── */

function IconClock() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function IconCalendar() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}
function IconZap() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
}
function IconBarChart() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
}
function IconSettings() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
}
function IconUsers() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function IconBuilding() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 22V12h6v10"/><path d="M9 7h1"/><path d="M14 7h1"/><path d="M9 11h1"/><path d="M14 11h1"/></svg>
}
function IconTimer() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/></svg>
}
function IconActivity() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
}
function IconUserCheck() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
}
function IconLog() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="13" x2="8" y2="13"/><line x1="12" y1="17" x2="8" y2="17"/></svg>
}
function IconChevronLeft() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
}
function IconChevronRight() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
}
function IconLogOut() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}
function IconMenu() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
}
function IconX() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
function IconHome() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function IconMail() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
}

/* ── Nav config ──────────────────────────────────────────────────────────── */

const links = [
  { href: '/app/clock',    label: 'Pointage', Icon: IconClock,    color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  { href: '/app/time-off', label: 'Congés',   Icon: IconCalendar, color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)'  },
  { href: '/app/rtt',      label: 'Récupération', Icon: IconZap,  color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  { href: '/app/reports',  label: 'Rapports', Icon: IconBarChart, color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
  { href: '/app/presence', label: 'Présences', Icon: IconUserCheck, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
]

const adminSubLinks = [
  { href: '/admin/dashboard',           label: 'Tableau de bord', Icon: IconHome,   color: '#8b5cf6' },
  { href: '/admin/dashboard/overtimes', label: 'Heures Sup.',  Icon: IconTimer,     color: '#fb923c' },
  { href: '/admin/dashboard/timeoffs',  label: 'Congés',       Icon: IconCalendar,  color: '#0ea5e9' },
  { href: '/admin/dashboard/rtts',      label: 'Récupération', Icon: IconZap,       color: '#fb923c' },
  { href: '/admin/dashboard/schedules', label: 'Horaires',     Icon: IconActivity,  color: '#10b981' },
  { href: '/admin/dashboard/presence',  label: 'Présences',    Icon: IconUserCheck, color: '#10b981' },
  { href: '/admin/dashboard/users',        label: 'Utilisateurs', Icon: IconUsers,    color: '#6366f1' },
  { href: '/admin/dashboard/invitations', label: 'Invitations',  Icon: IconMail,     color: '#6366f1' },
  { href: '/admin/dashboard/sites',       label: 'Sites',        Icon: IconBuilding, color: '#8b5cf6' },
  { href: '/admin/dashboard/teams',     label: 'Équipes',      Icon: IconUsers,     color: '#ec4899' },
  { href: '/admin/dashboard/audit',     label: 'Audit Trail',  Icon: IconLog,       color: '#a855f7' },
  { href: '/admin/dashboard/reports',   label: 'Rapports',     Icon: IconBarChart,  color: '#6366f1' },
  { href: '/admin/dashboard/settings',  label: 'Paramètres',   Icon: IconSettings,  color: '#64748b' },
]

const superAdminSubLinks = [
  { href: '/super-admin/dashboard',  label: 'Overview',    Icon: IconBarChart, color: '#a78bfa' },
  { href: '/super-admin/workspace',  label: 'Mon espace',  Icon: IconCalendar, color: '#a78bfa' },
  { href: '/super-admin/accounts',   label: 'Comptes',     Icon: IconUsers,    color: '#a78bfa' },
  { href: '/super-admin/email',      label: 'Email',       Icon: IconLog,      color: '#a78bfa' },
  { href: '/super-admin/profile',    label: 'Mon profil',  Icon: IconSettings, color: '#a78bfa' },
]

/* ── Component ──────────────────────────────────────────────────────────── */

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { planInfo } = usePlan()
  const [collapsed, setCollapsed] = useState(false)
  const [presenceAccess, setPresenceAccess] = useState<{ presenceForEmployees: boolean; presenceForManagers: boolean } | null>(null)

  const role = session?.user?.role
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'
  const isManager = role === 'MANAGER' || role === 'ADMIN' || role === 'SUPER_ADMIN'
  const isSuperAdmin = role === 'SUPER_ADMIN'

  const userName = session?.user?.name ?? session?.user?.email?.split('@')[0] ?? '?'
  const userEmail = session?.user?.email ?? ''
  const initials = userName.slice(0, 2).toUpperCase()

  const [openSections, setOpenSections] = useState({ employee: true, admin: true, superadmin: true })
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    if (!session?.user) return
    fetch('/api/app/presence/access')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPresenceAccess(data) })
      .catch(() => {})
  }, [session?.user])

  // Load saved state + set CSS variable
  useEffect(() => {
    const saved = localStorage.getItem('sb-collapsed')
    if (saved === 'true') setCollapsed(true)
    const sections = localStorage.getItem('sb-sections')
    if (sections) {
      try { setOpenSections(JSON.parse(sections)) } catch {}
    }
  }, [])

  useEffect(() => {
    const w = collapsed ? '56px' : '256px'
    document.documentElement.style.setProperty('--sidebar-w', w)
    localStorage.setItem('sb-collapsed', String(collapsed))
  }, [collapsed])

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem('sb-sections', JSON.stringify(next))
      return next
    })
  }

  const isActive = (path: string) => pathname === path

  // When the mobile drawer is open, always show the expanded layout regardless
  // of the desktop collapsed preference.
  const c = collapsed && !mobileOpen

  return (
    <>
      {/* Mobile hamburger trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-30 p-2 rounded-lg bg-[var(--pp-bg2)] border border-[var(--pp-line)] text-[var(--pp-ink)] shadow-sm"
        aria-label="Ouvrir le menu"
      >
        <IconMenu />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

    <aside className={`flex flex-col fixed left-0 top-0 w-64 h-screen border-r border-[var(--pp-line)] bg-[var(--pp-bg)] z-50 transition-transform md:transition-all duration-200 overflow-hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${c ? 'md:w-14' : 'md:w-64'}`}>
      {/* Mobile close button */}
      <button
        onClick={() => setMobileOpen(false)}
        className="md:hidden absolute top-3 right-3 z-10 p-2 rounded-lg text-[var(--pp-muted)] hover:text-[var(--pp-ink)] hover:bg-[var(--pp-line)]/40"
        aria-label="Fermer le menu"
      >
        <IconX />
      </button>

      {/* Logo + toggle */}
      <div className="flex items-center h-16 border-b border-[var(--pp-line)] shrink-0 px-3 justify-between">
        {!c && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--pp-pos)] flex items-center justify-center shrink-0 shadow-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <Logo size="sm" useThemeVar />
          </div>
        )}
        {c && (
          <div className="w-8 h-8 rounded-lg bg-[var(--pp-pos)] flex items-center justify-center mx-auto shadow-sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
        )}
        {!c && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg text-[var(--pp-muted)] hover:text-[var(--pp-ink)] hover:bg-[var(--pp-line)]/40 transition shrink-0"
            title="Réduire le menu"
          >
            <IconChevronLeft />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto overflow-x-hidden">

        {/* Section Pointage */}
        {!c && (
          <button
            onClick={() => toggleSection('employee')}
            className="w-full flex items-center justify-between px-2.5 py-1.5 mb-1 rounded-lg text-xs font-semibold uppercase tracking-wider text-[var(--pp-muted)] hover:text-[var(--pp-ink)] hover:bg-[var(--pp-line)]/30 transition-all"
          >
            <span>Pointage</span>
            <span className={`transition-transform duration-200 ${openSections.employee ? 'rotate-0' : '-rotate-90'}`}>
              <IconChevronLeft />
            </span>
          </button>
        )}
        {(c || openSections.employee) && (
          <div className="space-y-0.5 mb-2">
            {links.filter(({ href }) => {
              if (href === '/app/presence' && presenceAccess !== null && !presenceAccess.presenceForEmployees) return false
              return true
            }).map(({ href, label, Icon, color, bg }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  title={c ? label : undefined}
                  className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all text-sm font-medium ${c ? 'justify-center' : ''}`}
                  style={active ? { background: bg, color } : { color: 'var(--pp-muted)' }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = color }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--pp-muted)' }}
                >
                  <span style={active ? { color } : {}} className="shrink-0"><Icon /></span>
                  {!c && label}
                </Link>
              )
            })}
          </div>
        )}

        {/* Manager only */}
        {isManager && !isAdmin && (
          <>
            <div className="border-t border-[var(--pp-line)] my-2" />
            <div className="space-y-0.5">
              {[
                { href: '/manager/dashboard', label: 'Mon Équipe', Icon: IconUsers },
                { href: '/manager/dashboard/presence', label: 'Présences', Icon: IconUserCheck },
              ].filter(({ href }) => {
                if (href === '/manager/dashboard/presence' && presenceAccess !== null && !presenceAccess.presenceForManagers) return false
                return true
              }).map(({ href, label, Icon }) => {
                const active = pathname === href || (href !== '/manager/dashboard' && pathname.startsWith(href))
                return (
                  <Link
                    key={href}
                    href={href}
                    title={c ? label : undefined}
                    className={`flex items-center gap-3 px-2.5 py-2.5 text-sm font-medium rounded-lg transition-all ${c ? 'justify-center' : ''}`}
                    style={active
                      ? { color: '#ec4899', background: 'rgba(236,72,153,0.10)' }
                      : { color: 'var(--pp-muted)' }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = '#ec4899' }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--pp-muted)' }}
                  >
                    <span className="shrink-0"><Icon /></span>
                    {!c && label}
                  </Link>
                )
              })}
            </div>
          </>
        )}

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className="border-t border-[var(--pp-line)] my-2" />
            {!c ? (
              <button
                onClick={() => toggleSection('admin')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 mb-1 rounded-lg text-xs font-semibold uppercase tracking-wider text-[var(--pp-muted)] hover:text-[var(--pp-ink)] hover:bg-[var(--pp-line)]/30 transition-all"
              >
                <div className="flex items-center gap-2">
                  <IconSettings />
                  <span>Admin</span>
                </div>
                <span className={`transition-transform duration-200 ${openSections.admin ? 'rotate-0' : '-rotate-90'}`}>
                  <IconChevronLeft />
                </span>
              </button>
            ) : (
              <Link
                href="/admin/dashboard"
                title="Admin"
                className="flex items-center justify-center px-2.5 py-2.5 rounded-lg transition-all text-[var(--pp-muted)] hover:text-[var(--pp-ink)] hover:bg-[var(--pp-line)]/40"
                style={pathname.startsWith('/admin') ? { color: 'var(--pp-ink)', background: 'var(--pp-line)' } : {}}
              >
                <IconSettings />
              </Link>
            )}
            {!c && openSections.admin && (
              <div className="space-y-0.5">
                {adminSubLinks.map(({ href, label, Icon, color }) => {
                  const active = isActive(href)
                  const locked =
                    (href === '/admin/dashboard/teams' && planInfo !== null && !planInfo.canTeams) ||
                    (href === '/admin/dashboard/presence' && planInfo !== null && !planInfo.canPresences)
                  return (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-3 pl-8 pr-3 py-2 rounded-lg transition-all text-xs font-medium"
                      style={active ? { background: `${color}18`, color } : { color: 'var(--pp-muted)' }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = color }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--pp-muted)' }}
                    >
                      <Icon />
                      <span className="flex-1">{label}</span>
                      {locked && <span className="text-[10px] opacity-50">🔒</span>}
                    </Link>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Super Admin section */}
        {isSuperAdmin && (
          <>
            <div className="border-t border-[var(--pp-line)] my-2" />
            {!c ? (
              <button
                onClick={() => toggleSection('superadmin')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 mb-1 rounded-lg text-xs font-semibold uppercase tracking-wider text-[var(--pp-muted)] hover:text-[#a78bfa] hover:bg-[#a78bfa]/10 transition-all"
              >
                <div className="flex items-center gap-2">
                  <IconBarChart />
                  <span>Super-Admin</span>
                </div>
                <span className={`transition-transform duration-200 ${openSections.superadmin ? 'rotate-0' : '-rotate-90'}`}>
                  <IconChevronLeft />
                </span>
              </button>
            ) : (
              <Link
                href="/super-admin/dashboard"
                title="Super-Admin"
                className="flex items-center justify-center px-2.5 py-2.5 rounded-lg transition-all"
                style={pathname.startsWith('/super-admin') ? { color: '#a78bfa', background: '#a78bfa18' } : { color: 'var(--pp-muted)' }}
              >
                <IconBarChart />
              </Link>
            )}
            {!c && openSections.superadmin && (
              <div className="space-y-0.5">
                {superAdminSubLinks.map(({ href, label, Icon, color }) => {
                  const active = isActive(href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-3 pl-8 pr-3 py-2 rounded-lg transition-all text-xs font-medium"
                      style={active ? { background: `${color}18`, color } : { color: 'var(--pp-muted)' }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = color }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--pp-muted)' }}
                    >
                      <Icon />
                      {label}
                    </Link>
                  )
                })}
              </div>
            )}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="shrink-0 px-2 py-3 pb-20 md:pb-3 border-t border-[var(--pp-line)] space-y-1">
        {/* Expand button when collapsed */}
        {c && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-[var(--pp-muted)] hover:text-[var(--pp-ink)] hover:bg-[var(--pp-line)]/40 transition"
            title="Ouvrir le menu"
          >
            <IconChevronRight />
          </button>
        )}

        {!c && <ThemeToggle />}

        {session && (
          <div className={`flex items-center gap-3 px-2 py-2 rounded-lg ${c ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--pp-info)] to-[var(--pp-pos)] flex items-center justify-center shrink-0" title={c ? userName : undefined}>
              <span className="text-white text-xs font-bold leading-none">{initials}</span>
            </div>
            {!c && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--pp-ink)] truncate leading-tight">{userName}</p>
                <p className="text-xs text-[var(--pp-muted)] truncate leading-tight">{userEmail}</p>
              </div>
            )}
          </div>
        )}

        {!isSuperAdmin && !isAdmin && (
          <Link
            href="/app/profile"
            title={c ? 'Mon profil' : undefined}
            className={`w-full flex items-center gap-2 px-2 py-2 text-xs text-[var(--pp-muted)] hover:text-[var(--pp-ink)] transition rounded-lg hover:bg-[var(--pp-line)]/40 ${c ? 'justify-center' : ''}`}
            style={pathname === '/app/profile' ? { color: 'var(--pp-ink)', background: 'var(--pp-line)' } : {}}
          >
            <IconSettings />
            {!c && 'Mon profil'}
          </Link>
        )}

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title={c ? 'Se déconnecter' : undefined}
          className={`w-full flex items-center gap-2 px-2 py-2 text-xs text-[var(--pp-muted)] hover:text-[var(--pp-neg)] transition rounded-lg hover:bg-[var(--pp-neg)]/8 ${c ? 'justify-center' : ''}`}
        >
          <IconLogOut />
          {!c && 'Se déconnecter'}
        </button>
      </div>
    </aside>
    </>
  )
}
