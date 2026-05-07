'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { NotificationBell } from './NotificationBell'

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const isActive = (path: string) => pathname === path

  const links = [
    { href: '/app/clock', label: '⏰ Pointage', icon: '🕐' },
    { href: '/app/time-off', label: '🏖️ Congés', icon: '📅' },
    { href: '/app/rtt', label: '🚀 RTT', icon: '⏩' },
    { href: '/app/reports', label: '📊 Rapports', icon: '📈' },
  ]

  const isAdminSection = (session?.user as any)?.role === 'ADMIN'
  const adminSubLinks = [
    { href: '/admin/dashboard/overtimes', label: '⏱️ Heures Sup.' },
    { href: '/admin/dashboard/timeoffs', label: '🏖️ Congés' },
    { href: '/admin/dashboard/rtts', label: '🚀 RTT' },
    { href: '/admin/dashboard/schedules', label: '📅 Horaires' },
  ]

  return (
    <aside className="hidden md:block fixed left-0 top-0 w-64 h-screen border-r border-[var(--pp-line)] bg-[var(--pp-bg)] pt-20 overflow-y-auto">
      {/* Top Bar with Notifications */}
      {session && (
        <div className="px-4 py-4 border-b border-[var(--pp-line)] flex items-center justify-end">
          <NotificationBell />
        </div>
      )}

      <nav className="px-4 py-6 space-y-2">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition font-medium text-sm ${
              isActive(link.href)
                ? 'bg-[var(--pp-info)] text-white'
                : 'text-[var(--pp-muted)] hover:bg-[var(--pp-line)]/30 hover:text-[var(--pp-ink)]'
            }`}
          >
            <span className="text-lg">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
        {isAdminSection && (
          <>
            <div className="border-t border-[var(--pp-line)] my-4" />
            <div className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-[var(--pp-muted)]">
              <span className="text-lg">⚙️</span>
              <span>Admin Dashboard</span>
            </div>
            {adminSubLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 pl-10 pr-4 py-2 rounded-lg transition text-xs font-medium ${
                  isActive(link.href)
                    ? 'bg-[var(--pp-info)] text-white'
                    : 'text-[var(--pp-muted)] hover:bg-[var(--pp-line)]/30 hover:text-[var(--pp-ink)]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-4 py-6 border-t border-[var(--pp-line)] mt-auto">
        <p className="text-xs text-[var(--pp-muted)]">
          PoinçOn v0.1.0
        </p>
      </div>
    </aside>
  )
}
