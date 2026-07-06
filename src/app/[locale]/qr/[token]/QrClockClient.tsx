'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'

type Screen = 'pin' | 'loading' | 'choice' | 'result'
type ClockAction = 'clock_in' | 'clock_out' | 'break_start' | 'break_end'
type ClockResult = {
  action: ClockAction | 'choice'
  firstName: string
  userName: string
  time?: string
  hasOpenBreak?: boolean
  breakStartedAt?: string
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

const RESULT_STYLE: Record<ClockAction, { color: string; glow: string }> = {
  clock_in: { color: '#34d399', glow: 'rgba(16,185,129' },
  clock_out: { color: '#a78bfa', glow: 'rgba(99,102,241' },
  break_start: { color: '#f59e0b', glow: 'rgba(245,158,11' },
  break_end: { color: '#34d399', glow: 'rgba(16,185,129' },
}

function ResultIcon({ action }: { action: ClockAction }) {
  if (action === 'clock_in') {
    return (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={RESULT_STYLE[action].color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  }
  if (action === 'clock_out') {
    return (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={RESULT_STYLE[action].color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    )
  }
  if (action === 'break_start') {
    return (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={RESULT_STYLE[action].color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    )
  }
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={RESULT_STYLE[action].color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
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
      <div className="flex items-center justify-center mb-1">
        <div className="bg-white rounded-xl px-5 py-2.5 inline-flex items-center justify-center">
          <Image
            src={logoUrl}
            alt={companyName}
            width={160}
            height={44}
            className="max-h-11 max-w-[160px] w-auto h-auto object-contain"
            unoptimized
          />
        </div>
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => clearTimer, [clearTimer])

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

  async function submit(pinValue: string, action?: 'clock_out' | 'break_start' | 'break_end') {
    clearTimer()
    setScreen('loading')
    setError('')
    try {
      const res = await fetch(`/api/qr/${token}/clock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action ? { pin: pinValue, action } : { pin: pinValue }),
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
      if (data.action === 'choice') {
        setScreen('choice')
        // Départ automatique après 10s si l'employé ne choisit rien (évite les pointages ouverts la nuit)
        timerRef.current = setTimeout(() => {
          submit(pinValue, 'clock_out')
        }, 10000)
        return
      }
      setScreen('result')
      // Auto-reset after 5 seconds
      timerRef.current = setTimeout(() => {
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

        {/* ── Choice screen (pause pointée) ── */}
        {screen === 'choice' && result && result.action === 'choice' && (
          <div className="text-center">
            <div className="mb-6 opacity-50">
              <CompanyLogo logoUrl={logoUrl} companyName={companyName} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-8">
              Bonjour, {result.firstName}
            </h2>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => submit(pin, result.hasOpenBreak ? 'break_end' : 'break_start')}
                className="h-16 rounded-2xl text-lg font-semibold transition-all active:scale-95"
                style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b' }}
              >
                {result.hasOpenBreak ? 'Terminer la pause' : 'Commencer la pause'}
              </button>
              <button
                onClick={() => submit(pin, 'clock_out')}
                className="h-16 rounded-2xl text-lg font-semibold transition-all active:scale-95"
                style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.4)', color: '#a78bfa' }}
              >
                Départ
              </button>
            </div>
            <p className="text-white/30 text-xs mt-6">Départ automatique dans 10 secondes</p>
            <div className="mt-4 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-full rounded-full"
                style={{ background: '#a78bfa', animation: 'shrink 10s linear forwards' }}
              />
            </div>
          </div>
        )}

        {/* ── Result screen ── */}
        {screen === 'result' && result && result.action !== 'choice' && (
          <div className="text-center">
            {/* Icon */}
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8"
              style={{
                background: `linear-gradient(135deg, ${RESULT_STYLE[result.action].glow},0.2), ${RESULT_STYLE[result.action].glow},0.08))`,
                border: `1px solid ${RESULT_STYLE[result.action].glow},0.35)`,
                boxShadow: `0 0 40px ${RESULT_STYLE[result.action].glow},0.15)`,
              }}
            >
              <ResultIcon action={result.action} />
            </div>

            {/* Company logo small */}
            <div className="mb-6 opacity-50">
              <CompanyLogo logoUrl={logoUrl} companyName={companyName} />
            </div>

            {result.action === 'clock_in' && (
              <>
                <h2 className="text-3xl font-bold text-white mb-2">Bienvenue au travail,</h2>
                <h3 className="text-4xl font-bold" style={{ color: RESULT_STYLE.clock_in.color }}>{result.firstName} !</h3>
                <p className="text-white/40 text-lg mt-4">Pointé à {formatTime(result.time!)}</p>
              </>
            )}
            {result.action === 'clock_out' && (
              <>
                <h2 className="text-3xl font-bold text-white mb-2">Au revoir,</h2>
                <h3 className="text-4xl font-bold" style={{ color: RESULT_STYLE.clock_out.color }}>{result.firstName} !</h3>
                <p className="text-white/50 text-xl mt-3">Bonne fin de journée 👋</p>
                <p className="text-white/40 text-base mt-2">Pointé à {formatTime(result.time!)}</p>
              </>
            )}
            {result.action === 'break_start' && (
              <>
                <h2 className="text-3xl font-bold text-white mb-2">Bonne pause,</h2>
                <h3 className="text-4xl font-bold" style={{ color: RESULT_STYLE.break_start.color }}>{result.firstName} !</h3>
                <p className="text-white/40 text-lg mt-4">Pause démarrée à {formatTime(result.time!)}</p>
              </>
            )}
            {result.action === 'break_end' && (
              <>
                <h2 className="text-3xl font-bold text-white mb-2">Bon retour,</h2>
                <h3 className="text-4xl font-bold" style={{ color: RESULT_STYLE.break_end.color }}>{result.firstName} !</h3>
                <p className="text-white/40 text-lg mt-4">Pause terminée à {formatTime(result.time!)}</p>
              </>
            )}

            {/* Countdown bar */}
            <div className="mt-10 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  background: RESULT_STYLE[result.action].color,
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
