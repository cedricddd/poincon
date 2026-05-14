'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

function IconClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}
function IconCalendar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}
function IconZap() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )
}
function IconBarChart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  )
}
function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}
function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

type NavLink = { href: string; label: string; Icon: () => React.JSX.Element; color: string }

const employeeLinks: NavLink[] = [
  { href: '/app/clock',    label: 'Pointage', Icon: IconClock,    color: '#10b981' },
  { href: '/app/time-off', label: 'Congés',   Icon: IconCalendar, color: '#0ea5e9' },
  { href: '/app/rtt',      label: 'RTT',      Icon: IconZap,      color: '#fb923c' },
  { href: '/app/reports',  label: 'Rapports', Icon: IconBarChart, color: '#6366f1' },
]

const adminLink: NavLink = { href: '/admin/dashboard', label: 'Admin', Icon: IconShield, color: '#8b5cf6' }
const managerLink: NavLink = { href: '/manager/dashboard', label: 'Manager', Icon: IconUsers, color: '#ec4899' }
const superAdminLink: NavLink = { href: '/super-admin/dashboard', label: 'Super', Icon: IconShield, color: '#f43f5e' }

export function MobileNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role

  const links: NavLink[] = [...employeeLinks]
  if (role === 'MANAGER') links.push(managerLink)
  if (role === 'ADMIN') links.push(adminLink)
  if (role === 'SUPER_ADMIN') {
    links.push(adminLink)
    links.push(superAdminLink)
  }

  const cols = links.length

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--pp-bg)] border-t border-[var(--pp-line)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {links.map(({ href, label, Icon, color }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center justify-center py-2.5 gap-1 touch-manipulation"
              style={{ color: active ? color : 'var(--pp-muted)', transition: 'color 0.15s ease' }}
            >
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"
                style={{
                  height: 3,
                  width: active ? 24 : 0,
                  background: color,
                  transition: 'width 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                }}
              />
              <span
                className="flex items-center justify-center w-10 h-7 rounded-xl"
                style={{
                  background: active ? `${color}1a` : 'transparent',
                  transition: 'background 0.15s ease',
                }}
              >
                <Icon />
              </span>
              <span className="text-[10px] font-semibold leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
