'use client'

import { useEffect, useRef, useState } from 'react'

// Rotating QR of a kiosk terminal. Fetches the current code from the server and refreshes it when
// it expires. On a network error the QR is hidden: a stale code on screen would only produce
// "expired" errors on the employees' phones.

type QrState = { dataUrl: string; durationMs: number; key: number }

type Colors = { c1: string; c2: string; c3: string; b1: string; s1: string }

const RETRY_MS = 10_000
const REFRESH_MARGIN_MS = 300

export function KioskQrPanel({ token, colors }: { token: string; colors: Colors }) {
  const [qr, setQr] = useState<QrState | null>(null)
  const [offline, setOffline] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    const schedule = (ms: number) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(load, ms)
    }

    async function load() {
      try {
        const res = await fetch(`/api/kiosk/${token}/qr`, { cache: 'no-store' })
        if (!res.ok) throw new Error(String(res.status))
        const data: { dataUrl: string; expiresAt: string; serverTime: string } = await res.json()
        if (cancelled) return
        // Use the server's clock: the tablet's own clock may drift.
        const remaining = Math.max(1000, new Date(data.expiresAt).getTime() - new Date(data.serverTime).getTime())
        setQr(prev => ({ dataUrl: data.dataUrl, durationMs: remaining, key: (prev?.key ?? 0) + 1 }))
        setOffline(false)
        // Safety net: never leave a code on screen long after it expired.
        if (hideRef.current) clearTimeout(hideRef.current)
        hideRef.current = setTimeout(() => { setQr(null); setOffline(true) }, remaining + RETRY_MS)
        schedule(remaining + REFRESH_MARGIN_MS)
      } catch {
        if (cancelled) return
        setQr(null)
        setOffline(true)
        schedule(RETRY_MS)
      }
    }

    load()
    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
      if (hideRef.current) clearTimeout(hideRef.current)
    }
  }, [token])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <style>{`@keyframes kiosk-qr-countdown { from { transform: scaleX(1) } to { transform: scaleX(0) } }`}</style>
      <div
        style={{
          width: 'min(380px, 62vw, 42vh)', aspectRatio: '1 / 1', borderRadius: 24, background: '#fff',
          border: `1px solid ${colors.b1}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr.dataUrl} alt="QR code de pointage" style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }} />
        ) : (
          <p style={{ color: '#475569', fontSize: '0.95rem', textAlign: 'center', padding: 24 }}>
            {offline ? 'Connexion perdue — nouvel essai en cours…' : 'Chargement…'}
          </p>
        )}
      </div>

      {/* Time left before the code changes */}
      <div style={{ width: 'min(380px, 62vw, 42vh)', height: 3, background: colors.s1, borderRadius: 2, overflow: 'hidden' }}>
        {qr && (
          <div
            key={qr.key}
            style={{
              height: '100%', background: colors.c2, transformOrigin: 'left',
              animation: `kiosk-qr-countdown ${qr.durationMs}ms linear forwards`,
            }}
          />
        )}
      </div>

      <p style={{ fontSize: '1.15rem', fontWeight: 600, color: colors.c1, textAlign: 'center' }}>
        Scannez avec votre téléphone pour pointer
      </p>
      <p style={{ fontSize: '0.75rem', color: colors.c3, letterSpacing: '0.05em', textAlign: 'center' }}>
        Le code change régulièrement · une photo ne fonctionne pas
      </p>
    </div>
  )
}
