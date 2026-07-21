'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'pp_cookie_consent'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) setVisible(true)
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
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: 'min(92vw, 640px)',
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
        Pointon utilise des cookies essentiels au fonctionnement du service.{' '}
        <Link
          href="/legal/privacy"
          style={{ color: 'var(--pp-ink)', textDecoration: 'underline', textUnderlineOffset: '2px' }}
        >
          Politique de confidentialité
        </Link>
      </p>

      <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
        <button
          onClick={() => handleChoice('refused')}
          style={{
            padding: '0.4rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--pp-muted)',
            background: 'transparent',
            border: '1px solid var(--pp-line)',
            borderRadius: '0.5rem',
            cursor: 'pointer',
          }}
        >
          Refuser
        </button>
        <button
          onClick={() => handleChoice('accepted')}
          style={{
            padding: '0.4rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#ffffff',
            background: '#7c3aed',
            border: '1px solid transparent',
            borderRadius: '0.5rem',
            cursor: 'pointer',
          }}
        >
          Accepter
        </button>
      </div>
    </div>
  )
}
