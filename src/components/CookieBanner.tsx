'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

// v2: consent now explicitly covers Google Ads measurement — earlier answers were
// given on an "essential cookies only" notice and must be asked again.
const STORAGE_KEY = 'pp_cookie_consent_v2'

const MOBILE_QUERY = '(max-width: 639px)'

const choiceButtonStyle: React.CSSProperties = {
  padding: '0.4rem 1rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: 'var(--pp-ink)',
  background: 'transparent',
  border: '1px solid var(--pp-line)',
  borderRadius: '0.5rem',
  cursor: 'pointer',
}

export function CookieBanner() {
  const t = useTranslations('cookieBanner')
  const [visible, setVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) setVisible(true)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    setIsMobile(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  function handleChoice(value: 'accepted' | 'refused') {
    localStorage.setItem(STORAGE_KEY, value)
    window.dispatchEvent(new Event('pp-cookie-consent-changed'))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        // Bottom-center on desktop; on mobile a bottom banner lands in the
        // same band as hero CTAs on short viewports and can cover them
        // almost entirely, so it anchors below the header instead.
        ...(isMobile
          ? { top: '5rem', left: '1rem', right: '1rem' }
          : { bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', width: 'min(92vw, 640px)' }),
        zIndex: 9999,
        background: 'var(--pp-bg2)',
        border: '1px solid var(--pp-line)',
        borderRadius: '0.75rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.875rem',
      }}
    >
      <p style={{ fontSize: '0.875rem', color: 'var(--pp-muted)', lineHeight: '1.5' }}>
        {t('essential')} {t('ads')}{' '}
        <Link
          href="/legal/privacy"
          style={{ color: 'var(--pp-ink)', textDecoration: 'underline', textUnderlineOffset: '2px' }}
        >
          {t('privacy')}
        </Link>
      </p>

      {/* Both choices share one style: the Belgian DPA / EDPB require refusing
          to be as easy and as visible as accepting. */}
      <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
        <button onClick={() => handleChoice('refused')} style={choiceButtonStyle}>
          {t('refuse')}
        </button>
        <button onClick={() => handleChoice('accepted')} style={choiceButtonStyle}>
          {t('accept')}
        </button>
      </div>
    </div>
  )
}
