'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { ThemeToggle } from '@/components/ThemeToggle'

/* ── SVG Icons ──────────────────────────────────────────────────────────── */

function IconClock() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}
function IconCalendar() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}
function IconZap() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )
}
function IconBarChart() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  )
}
function IconSettings() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}
function IconUsers() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}
function IconBuilding() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="1"/>
      <path d="M9 22V12h6v10"/><path d="M9 7h1"/><path d="M14 7h1"/>
      <path d="M9 11h1"/><path d="M14 11h1"/>
    </svg>
  )
}
function IconTimer() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/>
      <path d="M5 3 2 6"/><path d="m22 6-3-3"/>
    </svg>
  )
}
function IconActivity() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}
function IconUserCheck() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <polyline points="17 11 19 13 23 9"/>
    </svg>
  )
}
function IconLog() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="13" x2="8" y2="13"/><line x1="12" y1="17" x2="8" y2="17"/>
    </svg>
  )
}

/* ── Nav config — chaque lien a sa couleur propre ───────────────────────── */

const links = [
  { href: '/app/clock',    label: 'Pointage', Icon: IconClock,    color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  { href: '/app/time-off', label: 'Congés',   Icon: IconCalendar, color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)'  },
  { href: '/app/rtt',      label: 'RTT',      Icon: IconZap,      color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  { href: '/app/reports',  label: 'Rapports', Icon: IconBarChart, color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
]

const adminSubLinks = [
  { href: '/admin/dashboard/overtimes', label: 'Heures Sup.',  Icon: IconTimer,     color: '#fb923c' },
  { href: '/admin/dashboard/timeoffs',  label: 'Congés',       Icon: IconCalendar,  color: '#0ea5e9' },
  { href: '/admin/dashboard/rtts',      label: 'RTT',          Icon: IconZap,       color: '#fb923c' },
  { href: '/admin/dashboard/schedules', label: 'Horaires',     Icon: IconActivity,  color: '#10b981' },
  { href: '/admin/dashboard/presence',  label: 'Présences',    Icon: IconUserCheck, color: '#10b981' },
  { href: '/admin/dashboard/users',     label: 'Utilisateurs', Icon: IconUsers,     color: '#6366f1' },
  { href: '/admin/dashboard/sites',     label: 'Sites',        Icon: IconBuilding,  color: '#8b5cf6' },
  { href: '/admin/dashboard/teams',     label: 'Équipes',      Icon: IconUsers,     color: '#ec4899' },
  { href: '/admin/dashboard/audit',     label: 'Audit Trail',  Icon: IconLog,       color: '#a855f7' },
  { href: '/admin/dashboard/reports',   label: 'Rapports',     Icon: IconBarChart,  color: '#6366f1' },
]

/* ── Component ──────────────────────────────────────────────────────────── */

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const isActive = (path: string) => pathname === path
  const role = session?.user?.role
  const isAdmin = role === 'ADMIN'
  const isManager = role === 'MANAGER' || role === 'ADMIN'
  const isSuperAdmin = role === 'SUPER_ADMIN'

  const userName = session?.user?.name ?? session?.user?.email?.split('@')[0] ?? '?'
  const userEmail = session?.user?.email ?? ''
  const initials = userName.slice(0, 2).toUpperCase()

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 w-64 h-screen border-r border-[var(--pp-line)] bg-[var(--pp-bg)] z-40">

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-[var(--pp-line)] shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[var(--pp-pos)] flex items-center justify-center shrink-0 shadow-sm">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <span className="font-bold text-[var(--pp-ink)] tracking-tight text-lg">PoinçOn</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {links.map(({ href, label, Icon, color, bg }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium group"
              style={active
                ? { background: bg, color }
                : { color: 'var(--pp-muted)' }
              }
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = color }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--pp-muted)' }}
            >
              <span style={active ? { color } : {}}><Icon /></span>
              {label}
            </Link>
          )
        })}

        {isManager && !isAdmin && (
          <>
            <div className="border-t border-[var(--pp-line)] my-3" />
            <Link
              href="/manager/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all text-[var(--pp-muted)] hover:text-[#ec4899] hover:bg-[rgba(236,72,153,0.10)]"
              style={pathname.startsWith('/manager/dashboard') ? { color: '#ec4899', background: 'rgba(236,72,153,0.10)' } : {}}
            >
              <IconUsers />
              Mon Équipe
            </Link>
          </>
        )}

        {isAdmin && (
          <>
            <div className="border-t border-[var(--pp-line)] my-3" />
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-all text-[var(--pp-muted)] hover:text-[var(--pp-ink)] hover:bg-[var(--pp-line)]/40"
              style={pathname === '/admin/dashboard' ? { color: 'var(--pp-ink)', background: 'var(--pp-line)' } : {}}
            >
              <IconSettings />
              Admin
            </Link>
            <div className="space-y-0.5 mt-0.5">
              {adminSubLinks.map(({ href, label, Icon, color }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 pl-8 pr-3 py-2 rounded-lg transition-all text-xs font-medium"
                    style={active
                      ? { background: `${color}18`, color }
                      : { color: 'var(--pp-muted)' }
                    }
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = color }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--pp-muted)' }}
                  >
                    <Icon />
                    {label}
                  </Link>
                )
              })}
            </div>
          </>
        )}

        {isSuperAdmin && (
          <>
            <div className="border-t border-[var(--pp-line)] my-3" />
            <Link
              href="/super-admin/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-all text-[var(--pp-muted)] hover:text-[#a78bfa] hover:bg-[#a78bfa]/10"
              style={pathname.startsWith('/super-admin') ? { color: '#a78bfa', background: '#a78bfa18' } : {}}
            >
              <IconBarChart />
              Super-Admin
            </Link>
            <div className="space-y-0.5 mt-0.5">
              <Link
                href="/super-admin/dashboard"
                className="flex items-center gap-3 pl-8 pr-3 py-2 rounded-lg transition-all text-xs font-medium"
                style={pathname === '/super-admin/dashboard'
                  ? { background: '#a78bfa18', color: '#a78bfa' }
                  : { color: 'var(--pp-muted)' }
                }
                onMouseEnter={e => { if (!pathname.startsWith('/super-admin')) (e.currentTarget as HTMLElement).style.color = '#a78bfa' }}
                onMouseLeave={e => { if (!pathname.startsWith('/super-admin')) (e.currentTarget as HTMLElement).style.color = 'var(--pp-muted)' }}
              >
                <IconBarChart />
                Overview
              </Link>
              <Link
                href="/super-admin/accounts"
                className="flex items-center gap-3 pl-8 pr-3 py-2 rounded-lg transition-all text-xs font-medium"
                style={pathname === '/super-admin/accounts'
                  ? { background: '#a78bfa18', color: '#a78bfa' }
                  : { color: 'var(--pp-muted)' }
                }
                onMouseEnter={e => { if (!pathname.startsWith('/super-admin')) (e.currentTarget as HTMLElement).style.color = '#a78bfa' }}
                onMouseLeave={e => { if (!pathname.startsWith('/super-admin')) (e.currentTarget as HTMLElement).style.color = 'var(--pp-muted)' }}
              >
                <IconUsers />
                Comptes
              </Link>
              <Link
                href="/super-admin/email"
                className="flex items-center gap-3 pl-8 pr-3 py-2 rounded-lg transition-all text-xs font-medium"
                style={pathname === '/super-admin/email'
                  ? { background: '#a78bfa18', color: '#a78bfa' }
                  : { color: 'var(--pp-muted)' }
                }
                onMouseEnter={e => { if (!pathname.startsWith('/super-admin')) (e.currentTarget as HTMLElement).style.color = '#a78bfa' }}
                onMouseLeave={e => { if (!pathname.startsWith('/super-admin')) (e.currentTarget as HTMLElement).style.color = 'var(--pp-muted)' }}
              >
                <IconLog />
                Email
              </Link>
            </div>
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="shrink-0 px-3 py-3 border-t border-[var(--pp-line)] space-y-1">
        <ThemeToggle />
        {session && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--pp-info)] to-[var(--pp-pos)] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold leading-none">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--pp-ink)] truncate leading-tight">{userName}</p>
              <p className="text-xs text-[var(--pp-muted)] truncate leading-tight">{userEmail}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full text-left px-3 py-2 text-xs text-[var(--pp-muted)] hover:text-[var(--pp-neg)] transition rounded-lg hover:bg-[var(--pp-neg)]/8"
        >
          Se déconnecter
        </button>
      </div>
    </aside>
  )
}
