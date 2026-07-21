'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'

const STORAGE_KEY = 'pp_cookie_consent'
const GOOGLE_ADS_ID = 'AW-18339467634'

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
