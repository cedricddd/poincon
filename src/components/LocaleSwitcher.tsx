'use client'

import { useLocale } from 'next-intl'
import { useTransition, useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from '@/i18n/navigation'

const LOCALES = [
  { code: 'fr', label: 'Français', flag: '🇧🇪' },
  { code: 'nl', label: 'Nederlands', flag: '🇧🇪' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
] as const

function IconGlobe() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  )
}

export function LocaleSwitcher({ collapsed = false, onDark = false, openUp = false }: { collapsed?: boolean; onDark?: boolean; openUp?: boolean }) {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function switchLocale(next: string) {
    startTransition(() => {
      router.replace(pathname, { locale: next })
    })
    setOpen(false)
  }

  const current = LOCALES.find(l => l.code === locale) ?? LOCALES[0]

  if (collapsed) {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          title="Changer de langue"
          disabled={isPending}
          className="w-full flex items-center justify-center p-2 rounded-lg text-[var(--pp-muted)] hover:text-[var(--pp-ink)] hover:bg-[var(--pp-line)]/40 transition disabled:opacity-50"
        >
          <IconGlobe />
        </button>
        {open && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-[var(--pp-surface)] border border-[var(--pp-line)] rounded-lg shadow-lg overflow-hidden z-50 min-w-[130px]">
            {LOCALES.map(l => (
              <button
                key={l.code}
                onClick={() => switchLocale(l.code)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition hover:bg-[var(--pp-line)]/40 ${l.code === locale ? 'text-[var(--pp-ink)] font-semibold' : 'text-[var(--pp-muted)]'}`}
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={isPending}
        className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg transition text-xs disabled:opacity-50 ${
          onDark
            ? 'text-white/80 hover:text-white hover:bg-white/10'
            : 'text-[var(--pp-muted)] hover:text-[var(--pp-ink)] hover:bg-[var(--pp-line)]/40'
        }`}
      >
        <IconGlobe />
        <span className="flex-1 text-left">{current.flag} {current.label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div style={openUp ? { bottom: '100%', marginBottom: '4px' } : { top: '100%', marginTop: '4px' }} className="absolute left-0 right-0 bg-[var(--pp-surface)] border border-[var(--pp-line)] rounded-lg shadow-lg overflow-hidden z-50">
          {LOCALES.map(l => (
            <button
              key={l.code}
              onClick={() => switchLocale(l.code)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition hover:bg-[var(--pp-line)]/40 ${l.code === locale ? 'text-[var(--pp-ink)] font-semibold bg-[var(--pp-line)]/20' : 'text-[var(--pp-muted)]'}`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

