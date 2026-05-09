'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/app/clock', label: 'Pointage', icon: '⏰' },
  { href: '/app/time-off', label: 'Congés', icon: '🏖️' },
  { href: '/app/rtt', label: 'RTT', icon: '🚀' },
  { href: '/app/reports', label: 'Rapports', icon: '📊' },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--pp-bg)] border-t border-[var(--pp-line)] safe-area-pb">
      <div className="grid grid-cols-4">
        {links.map(link => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center py-3 gap-0.5 transition ${
                active ? 'text-[var(--pp-info)]' : 'text-[var(--pp-muted)]'
              }`}
            >
              <span className="text-xl leading-none">{link.icon}</span>
              <span className="text-[10px] font-medium leading-none">{link.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
