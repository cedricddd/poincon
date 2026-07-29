'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'

const STORAGE_KEY = 'pp_cookie_consent'
const GOOGLE_ADS_ID = 'AW-18339467634'
const SIGNUP_CONVERSION_LABEL = `${GOOGLE_ADS_ID}/pAMJCMWjwdccEPKi-KhE`

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
    const check = () => setConsented(localStorage.getItem(STORAGE_KEY) === 'accepted')
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
      <Script id="google-ads-init" nonce={nonce} strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GOOGLE_ADS_ID}');
        `}
      </Script>
    </>
  )
}
