'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'

// v2: consent now explicitly covers Google Ads measurement — earlier answers were
// given on an "essential cookies only" notice and must be asked again.
const STORAGE_KEY = 'pp_cookie_consent_v2'
const GOOGLE_ADS_ID = 'AW-18339467634'
const SIGNUP_CONVERSION_LABEL = `${GOOGLE_ADS_ID}/pAMJCMWjwdccEPKi-KhE`
const GCLID_COOKIE_MAX_AGE = 90 * 24 * 60 * 60 // Google's own _gcl_aw lifetime

// Ad click captured on the landing URL, kept in memory only (no storage before
// consent). The locale layout never remounts on client-side navigation, so it
// survives the landing → /signup journey even if consent comes later.
let landingClick: { gclid: string; at: number } | null = null

function captureLandingClick() {
  if (landingClick) return
  const gclid = new URLSearchParams(window.location.search).get('gclid')
  if (gclid) landingClick = { gclid, at: Math.floor(Date.now() / 1000) }
}

// gtag reads the click id from the current URL only. When consent is given
// after navigating away from the landing page, hand it the click id through the
// conversion linker cookie it reads (format: GCL.<unix seconds>.<gclid>).
function persistLandingClick() {
  if (!landingClick || window.location.search.includes('gclid=')) return
  if (document.cookie.split('; ').some((c) => c.startsWith('_gcl_aw='))) return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie =
    `_gcl_aw=GCL.${landingClick.at}.${encodeURIComponent(landingClick.gclid)}` +
    `; Max-Age=${GCLID_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

// Resolves once gtag confirms the hit was sent (event_callback), or after a
// short timeout — callers that navigate right after must await this, otherwise
// the beacon can be aborted mid-flight by the page unload before it reaches Google.
export function fireSignupConversion(transactionId: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
      resolve()
      return
    }

    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }

    window.gtag('event', 'conversion', {
      send_to: SIGNUP_CONVERSION_LABEL,
      transaction_id: transactionId,
      event_callback: finish,
    })
    setTimeout(finish, 500)
  })
}

export function GoogleAdsTag({ nonce }: { nonce?: string }) {
  const [consented, setConsented] = useState(false)

  useEffect(() => {
    captureLandingClick()
    const check = () => {
      const accepted = localStorage.getItem(STORAGE_KEY) === 'accepted'
      if (accepted) persistLandingClick()
      setConsented(accepted)
    }
    check()
    window.addEventListener('pp-cookie-consent-changed', check)
    return () => window.removeEventListener('pp-cookie-consent-changed', check)
  }, [])

  if (!consented) return null

  return (
    <>
      <Script
        id="google-ads-tag"
        nonce={nonce}
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
        strategy="afterInteractive"
      />
      {/* Consent Mode v2, basic implementation: the tag only loads after the
          banner is accepted, so ad signals are granted; personalization stays
          denied because the banner does not cover remarketing. */}
      <Script id="google-ads-init" nonce={nonce} strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            ad_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'denied',
            analytics_storage: 'denied'
          });
          gtag('js', new Date());
          gtag('config', '${GOOGLE_ADS_ID}');
        `}
      </Script>
    </>
  )
}
