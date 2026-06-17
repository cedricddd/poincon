'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'

type Screen = 'pin' | 'loading' | 'result'
type ClockResult = {
  action: 'clock_in' | 'clock_out'
  firstName: string
  userName: string
  time: string
}

interface Props {
  token: string
  siteName: string
  companyName: string
  logoUrl: string | null
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
}

function PinDots({ count }: { count: number }) {
  return (
    <div className="flex gap-4 justify-center my-8">
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className="w-4 h-4 rounded-full transition-all duration-150"
          style={{
            background: i < count
              ? '#34d399'
              : 'rgba(255,255,255,0.18)',
            boxShadow: i < count ? '0 0 12px rgba(52,211,153,0.55)' : 'none',
          }}
        />
      ))}
    </div>
  )
}

function NumKey({ label, onClick, disabled }: { label: string | React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-20 rounded-2xl text-3xl font-medium text-white/85 transition-all duration-100 select-none active:scale-95 disabled:opacity-25"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      onMouseDown={e => e.preventDefault()}
    >
      {label}
    </button>
  )
}

function CompanyLogo({ logoUrl, companyName }: { logoUrl: string | null; companyName: string }) {
  if (logoUrl) {
    return (
      <div className="h-14 flex items-center justify-center mb-1">
        <Image
          src={logoUrl}
          alt={companyName}
          width={180}
          height={56}
          className="max-h-14 max-w-[180px] w-auto h-auto object-contain"
          style={{ filter: 'brightness(0) invert(1)' }}
          onError={() => {}}
          unoptimized
        />
      </div>
    )
  }
  return (
    <div className="h-14 flex items-center justify-center mb-1">
      <span className="text-white text-2xl font-bold tracking-tight">{companyName}</span>
    </div>
  )
}

export function QrClockClient({ token, siteName, companyName, logoUrl }: Props) {
  const [screen, setScreen] = useState<Screen>('pin')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [errorKey, setErrorKey] = useState(0)
  const [result, setResult] = useState<ClockResult | null>(null)

  const handleKey = useCallback((digit: string) => {
    setError('')
    setPin(p => p.length < 4 ? p + digit : p)
  }, [])

  const handleDel = useCallback(() => {
    setError('')
    setPin(p => p.slice(0, -1))
  }, [])

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4) {
      submit(pin)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  async function submit(pinValue: string) {
    setScreen('loading')
    setError('')
    try {
      const res = await fetch(`/api/qr/${token}/clock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinValue }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erreur')
        setErrorKey(k => k + 1)
        setPin('')
        setScreen('pin')
        return
      }
      setResult(data)
      setScreen('result')
      // Auto-reset after 5 seconds
      setTimeout(() => {
        setResult(null)
        setPin('')
        setError('')
        setScreen('pin')
      }, 5000)
    } catch {
      setError('Erreur réseau')
      setErrorKey(k => k + 1)
      setPin('')
      setScreen('pin')
    }
  }

  const keys1 = ['1', '2', '3']
  const keys2 = ['4', '5', '6']
  const keys3 = ['7', '8', '9']

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: '#090c14', colorScheme: 'dark' }}
    >
      {/* Subtle gradient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% -5%, rgba(99,102,241,0.09) 0%, transparent 65%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 40% at 95% 95%, rgba(59,130,246,0.04) 0%, transparent 60%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-xs">

        {/* ── PIN screen ── */}
        {(screen === 'pin' || screen === 'loading') && (
          <>
            {/* Logo + site */}
            <div className="text-center mb-2">
              <CompanyLogo logoUrl={logoUrl} companyName={companyName} />
              <p className="text-white/40 text-sm mt-1">{siteName}</p>
            </div>

            {/* Instruction */}
            <p className="text-center text-white/60 text-sm mt-8 mb-0">
              Entrez votre code PIN
            </p>

            {/* PIN dots */}
            <PinDots count={pin.length} />

            {/* Error shake */}
            {error && (
              <p
                key={errorKey}
                className="text-center text-red-400 text-sm mb-4 animate-[shake_0.35s_ease]"
              >
                {error}
              </p>
            )}

            {/* Numpad */}
            <div
              className="grid grid-cols-3 gap-3"
              style={{ opacity: screen === 'loading' ? 0.4 : 1, pointerEvents: screen === 'loading' ? 'none' : 'auto' }}
            >
              {keys1.map(k => <NumKey key={k} label={k} onClick={() => handleKey(k)} />)}
              {keys2.map(k => <NumKey key={k} label={k} onClick={() => handleKey(k)} />)}
              {keys3.map(k => <NumKey key={k} label={k} onClick={() => handleKey(k)} />)}
              {/* Row 4: empty | 0 | del */}
              <div />
              <NumKey label="0" onClick={() => handleKey('0')} />
              <NumKey
                label={
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 4H8l-7 7 7 7h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                    <line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" />
                  </svg>
                }
                onClick={handleDel}
              />
            </div>

            {screen === 'loading' && (
              <p className="text-center text-white/40 text-sm mt-6">Pointage en cours…</p>
            )}
          </>
        )}

        {/* ── Result screen ── */}
        {screen === 'result' && result && (
          <div className="text-center">
            {/* Icon */}
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8"
              style={{
                background: result.action === 'clock_in'
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.08))'
                  : 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.08))',
                border: `1px solid ${result.action === 'clock_in' ? 'rgba(16,185,129,0.35)' : 'rgba(99,102,241,0.35)'}`,
                boxShadow: result.action === 'clock_in'
                  ? '0 0 40px rgba(16,185,129,0.15)'
                  : '0 0 40px rgba(99,102,241,0.15)',
              }}
            >
              {result.action === 'clock_in' ? (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              )}
            </div>

            {/* Company logo small */}
            <div className="mb-6 opacity-50">
              <CompanyLogo logoUrl={logoUrl} companyName={companyName} />
            </div>

            {result.action === 'clock_in' ? (
              <>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Bienvenue au travail,
                </h2>
                <h3 className="text-4xl font-bold" style={{ color: '#34d399' }}>
                  {result.firstName} !
                </h3>
                <p className="text-white/40 text-lg mt-4">
                  Pointé à {formatTime(result.time)}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Au revoir,
                </h2>
                <h3 className="text-4xl font-bold" style={{ color: '#a78bfa' }}>
                  {result.firstName} !
                </h3>
                <p className="text-white/50 text-xl mt-3">Bonne fin de journée 👋</p>
                <p className="text-white/40 text-base mt-2">
                  Pointé à {formatTime(result.time)}
                </p>
              </>
            )}

            {/* Countdown bar */}
            <div className="mt-10 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  background: result.action === 'clock_in' ? '#34d399' : '#a78bfa',
                  animation: 'shrink 5s linear forwards',
                }}
              />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  )
}
