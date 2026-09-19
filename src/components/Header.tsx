'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import { Link, usePathname } from '@/i18n/navigation'
import { Button } from './Button'
import { Logo } from './Logo'
import { LocaleSwitcher } from './LocaleSwitcher'

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

/** Landing-page section anchor. The sections only exist on the landing page, so from
 *  any other page (blog, legal, comparison) the link has to point back to it. */
function SectionLink({ id, onHome, className, onClick, children }: {
  id: string
  onHome: boolean
  className: string
  onClick?: () => void
  children: React.ReactNode
}) {
  return onHome ? (
    <a href={`#${id}`} className={className} onClick={onClick}>{children}</a>
  ) : (
    <Link href={{ pathname: '/', hash: id }} className={className} onClick={onClick}>{children}</Link>
  )
}

// Landing page of each role once logged in; anything else lands on the clock page.
const SPACE_HREF: Record<string, string> = {
  SUPER_ADMIN: '/super-admin/dashboard',
  ADMIN: '/admin/dashboard',
  MANAGER: '/manager/dashboard',
}

export function Header() {
  const t = useTranslations('header')
  const onHome = usePathname() === '/'
  const { data: session } = useSession()
  const spaceHref = session?.user ? (SPACE_HREF[session.user.role] ?? '/app/clock') : null
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })

    // The theme class is applied server-side from a cookie (default dark);
    // mirror whatever is actually on <html>.
    setDark(document.documentElement.classList.contains('dark'))

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    document.documentElement.classList.toggle('light', !next)
    // Persist via cookie so the server renders the right theme on every navigation.
    document.cookie = `pp-theme=${next ? 'dark' : 'light'}; path=/; max-age=31536000; samesite=lax`
    localStorage.setItem('pp-theme', next ? 'dark' : 'light')
  }

  const navLinks = [
    { id: 'features', label: t('navFeatures') },
    { id: 'how', label: t('navHow') },
    { id: 'pricing', label: t('navPricing') },
    { id: 'faq', label: t('navFaq') },
  ]

  // The header overlays the always-dark hero until scrolled → force light text there,
  // otherwise the muted/ink theme colors are unreadable (esp. in light mode).
  const overHero = !scrolled
  const linkCls = overHero
    ? 'text-white/70 hover:text-white'
    : 'text-[var(--pp-muted)] hover:text-[var(--pp-ink)]'
  const iconBtnCls = overHero
    ? 'text-white/80 hover:text-white hover:bg-white/10'
    : 'text-[var(--pp-muted)] hover:text-[var(--pp-ink)] hover:bg-[var(--pp-line)]'
  // Mobile top-bar icons: light over the hero, but theme colors once the menu panel (solid) is open.
  const mobileIconCls = (overHero && !menuOpen)
    ? 'text-white/80 hover:text-white hover:bg-white/10'
    : 'text-[var(--pp-muted)] hover:text-[var(--pp-ink)] hover:bg-[var(--pp-line)]'

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
            <SectionLink key={l.id} id={l.id} onHome={onHome} className={`text-sm transition-colors ${linkCls}`}>
              {l.label}
            </SectionLink>
          ))}
          <Link href="/blog" className={`text-sm transition-colors ${linkCls}`}>
            Blog
          </Link>
        </nav>

        {/* CTAs desktop */}
        <div className="hidden md:flex items-center gap-3">
          <div className="w-36">
            <LocaleSwitcher onDark={overHero} />
          </div>
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${iconBtnCls}`}
            aria-label={dark ? t('themeLight') : t('themeDark')}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
          {spaceHref ? (
            <Link href={spaceHref}>
              <Button size="sm">{t('mySpace')}</Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className={`text-sm font-medium transition-colors ${linkCls}`}>
                {t('login')}
              </Link>
              <Link href="/signup">
                <Button size="sm">{t('start')}</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile: theme toggle + hamburger */}
        <div className="md:hidden flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${mobileIconCls}`}
            aria-label={dark ? t('themeLight') : t('themeDark')}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className={`p-2 rounded-lg transition-colors ${mobileIconCls}`}
            aria-label={t('menu')}
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
              <SectionLink
                key={item.id}
                id={item.id}
                onHome={onHome}
                onClick={() => setMenuOpen(false)}
                className="py-3 text-sm font-medium text-[var(--pp-muted)] hover:text-[var(--pp-ink)] border-b border-[var(--pp-line)] last:border-0 transition-colors"
              >
                {item.label}
              </SectionLink>
            ))}
            <Link
              href="/blog"
              onClick={() => setMenuOpen(false)}
              className="py-3 text-sm font-medium text-[var(--pp-muted)] hover:text-[var(--pp-ink)] border-b border-[var(--pp-line)] last:border-0 transition-colors"
            >
              Blog
            </Link>
          </nav>
          <div className="mb-3">
            <LocaleSwitcher />
          </div>
          <div className="flex flex-col gap-2">
            {spaceHref ? (
              <Link href={spaceHref} onClick={() => setMenuOpen(false)}>
                <Button size="md" className="w-full">{t('mySpace')}</Button>
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)}>
                  <Button variant="outline" size="md" className="w-full">{t('login')}</Button>
                </Link>
                <Link href="/signup" onClick={() => setMenuOpen(false)}>
                  <Button size="md" className="w-full">{t('startFree')}</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
