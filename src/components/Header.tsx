'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from './Button'
import { Logo } from './Logo'

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })

    const stored = localStorage.getItem('pp-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setDark(stored === 'dark' || (!stored && prefersDark))

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    document.documentElement.classList.toggle('light', !next)
    localStorage.setItem('pp-theme', next ? 'dark' : 'light')
  }

  const navLinks = [
    { href: '#features', label: 'Fonctionnalités' },
    { href: '#how', label: 'Comment ça marche' },
    { href: '#pricing', label: 'Tarifs' },
    { href: '#faq', label: 'FAQ' },
  ]

  return (
    <header
      className={[
        'fixed top-0 left-0 right-0 z-50 transition-all duration-200',
        scrolled
          ? 'bg-[var(--pp-bg)]/90 backdrop-blur-md border-b border-[var(--pp-line)] shadow-sm'
          : 'bg-transparent',
      ].join(' ')}
    >
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" aria-label="Pointon — accueil" className="flex items-center min-h-[44px]">
          <Logo size="md" dark={!scrolled || dark} />
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} className="text-sm text-[var(--pp-muted)] hover:text-[var(--pp-ink)] transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>

        {/* CTAs desktop */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-[var(--pp-muted)] hover:text-[var(--pp-ink)] hover:bg-[var(--pp-line)] transition-colors"
            aria-label={dark ? 'Mode clair' : 'Mode sombre'}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
          <Link href="/login" className="text-sm text-[var(--pp-muted)] hover:text-[var(--pp-ink)] transition-colors font-medium">
            Connexion
          </Link>
          <Link href="/login">
            <Button size="sm">Commencer</Button>
          </Link>
        </div>

        {/* Mobile: theme toggle + hamburger */}
        <div className="md:hidden flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-[var(--pp-muted)] hover:text-[var(--pp-ink)] hover:bg-[var(--pp-line)] transition-colors"
            aria-label={dark ? 'Mode clair' : 'Mode sombre'}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="p-2 rounded-lg text-[var(--pp-muted)] hover:text-[var(--pp-ink)] hover:bg-[var(--pp-line)] transition-colors"
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M3 5h14M3 10h14M3 15h14" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-[var(--pp-bg)] border-b border-[var(--pp-line)] px-4 pb-4">
          <nav className="flex flex-col gap-1 mb-4">
            {navLinks.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="py-3 text-sm font-medium text-[var(--pp-muted)] hover:text-[var(--pp-ink)] border-b border-[var(--pp-line)] last:border-0 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-2">
            <Link href="/login" onClick={() => setMenuOpen(false)}>
              <Button variant="outline" size="md" className="w-full">Connexion</Button>
            </Link>
            <Link href="/login" onClick={() => setMenuOpen(false)}>
              <Button size="md" className="w-full">Commencer gratuitement</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
