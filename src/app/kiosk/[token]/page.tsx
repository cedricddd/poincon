'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'

type Screen = 'home' | 'employee' | 'visitor' | 'result'
type ResultData = { success: boolean; title: string; subtitle: string }
type KioskInfo = {
  companyName: string
  logoUrl: string | null
  siteId: string | null
  siteName: string | null
  label: string | null
}
type Employee = { id: string; name: string | null }

const WELCOME = ['Bienvenue', 'Welkom', 'Willkommen', 'Welcome']
const IDLE_MS = 60_000

const STYLES = `
  .kiosk-root {
    background: #090c14;
    font-family: var(--font-jost, 'Jost', sans-serif);
    color-scheme: dark;
  }
  .kiosk-root * { box-sizing: border-box; }
  .kiosk-display { font-family: var(--font-cormorant, 'Cormorant Garamond', serif); font-style: italic; }
  .kiosk-mono { font-family: var(--font-jetbrains, 'JetBrains Mono', monospace); }

  .kiosk-back {
    color: rgba(255,255,255,0.28); background: none; border: none; cursor: pointer;
    font-family: inherit; font-size: 0.85rem; letter-spacing: 0.06em;
    display: flex; align-items: center; gap: 8px; transition: color 0.18s ease; padding: 0;
  }
  .kiosk-back:hover { color: rgba(255,255,255,0.65); }

  @keyframes kiosk-fade-up {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes kiosk-shake {
    0%, 100% { transform: translateX(0); }
    15%  { transform: translateX(-10px); }
    30%  { transform: translateX(9px); }
    45%  { transform: translateX(-7px); }
    60%  { transform: translateX(6px); }
    75%  { transform: translateX(-3px); }
    90%  { transform: translateX(3px); }
  }
  @keyframes kiosk-result-in {
    from { opacity: 0; transform: scale(0.9) translateY(24px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes kiosk-progress {
    from { width: 100%; }
    to   { width: 0%; }
  }
  @keyframes kiosk-logo-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.14), 0 0 0 0 rgba(99,102,241,0.06); }
    50%       { box-shadow: 0 0 0 8px rgba(99,102,241,0.07), 0 0 0 22px rgba(99,102,241,0.02); }
  }

  .kiosk-welcome-word { animation: kiosk-fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both; }
  .kiosk-shake        { animation: kiosk-shake 0.45s ease; }
  .kiosk-result-in    { animation: kiosk-result-in 0.55s cubic-bezier(0.34,1.56,0.64,1) both; }
  .kiosk-progress     { animation: kiosk-progress 3.5s linear forwards; }
  .kiosk-logo         { animation: kiosk-logo-pulse 4s ease-in-out infinite; }

  .kiosk-btn-emp {
    padding: 30px 52px; border-radius: 16px; color: #fff; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; gap: 10px; min-width: 220px;
    background: linear-gradient(145deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.04) 100%);
    border: 1px solid rgba(16,185,129,0.2);
    transition: all 0.22s ease;
  }
  .kiosk-btn-emp:hover {
    background: linear-gradient(145deg, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.09) 100%);
    border-color: rgba(16,185,129,0.38);
    box-shadow: 0 10px 40px rgba(16,185,129,0.1);
    transform: translateY(-3px);
  }
  .kiosk-btn-emp:active { transform: translateY(0) scale(0.98); }

  .kiosk-btn-vis {
    padding: 30px 52px; border-radius: 16px; color: #fff; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; gap: 10px; min-width: 220px;
    background: linear-gradient(145deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.04) 100%);
    border: 1px solid rgba(59,130,246,0.2);
    transition: all 0.22s ease;
  }
  .kiosk-btn-vis:hover {
    background: linear-gradient(145deg, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0.09) 100%);
    border-color: rgba(59,130,246,0.38);
    box-shadow: 0 10px 40px rgba(59,130,246,0.1);
    transform: translateY(-3px);
  }
  .kiosk-btn-vis:active { transform: translateY(0) scale(0.98); }

  .kiosk-numkey {
    height: 82px; border-radius: 14px;
    font-size: 1.75rem; font-weight: 500;
    font-family: var(--font-jetbrains, 'JetBrains Mono', monospace);
    color: rgba(255,255,255,0.82); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
    transition: all 0.12s ease;
  }
  .kiosk-numkey:hover  { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.14); }
  .kiosk-numkey:active { background: rgba(255,255,255,0.14); transform: scale(0.95); }
  .kiosk-numkey:disabled { opacity: 0.28; cursor: default; pointer-events: none; }
  .kiosk-numkey.is-del  { font-size: 0.9rem; color: rgba(255,255,255,0.4); }

  .kiosk-field {
    width: 100%; padding: 16px 20px; font-size: 1.05rem; border-radius: 12px;
    color: #fff; font-family: inherit;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
    transition: border-color 0.2s ease, background 0.2s ease;
  }
  .kiosk-field:focus { outline: none; background: rgba(255,255,255,0.07); border-color: rgba(59,130,246,0.45); }
  .kiosk-field::placeholder { color: rgba(255,255,255,0.18); }
  .kiosk-field option { background: #12182e; }

  .kiosk-submit {
    width: 100%; padding: 18px; border-radius: 12px; font-size: 1.05rem; font-weight: 600;
    font-family: inherit; letter-spacing: 0.04em; cursor: pointer;
    background: linear-gradient(145deg, rgba(59,130,246,0.22) 0%, rgba(59,130,246,0.12) 100%);
    border: 1px solid rgba(59,130,246,0.38); color: #fff;
    transition: all 0.2s ease; margin-top: 8px;
  }
  .kiosk-submit:hover:not(:disabled) {
    background: linear-gradient(145deg, rgba(59,130,246,0.32) 0%, rgba(59,130,246,0.2) 100%);
    box-shadow: 0 8px 28px rgba(59,130,246,0.15);
    transform: translateY(-1px);
  }
  .kiosk-submit:disabled { opacity: 0.32; cursor: not-allowed; }
`

function BgGlows() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 75% 55% at 50% -5%, rgba(99,102,241,0.09) 0%, transparent 65%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 45% at 95% 95%, rgba(59,130,246,0.04) 0%, transparent 60%)' }} />
    </div>
  )
}

function IconPerson() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconBadge() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
    </svg>
  )
}

function IconDel() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 4H8l-7 7 7 7h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
      <line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconXMark() {
  return (
    <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function KioskPage() {
  const { token } = useParams<{ token: string }>()

  const [info, setInfo] = useState<KioskInfo | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [screen, setScreen] = useState<Screen>('home')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [pinError, setPinError] = useState('')
  const [pinErrorKey, setPinErrorKey] = useState(0)
  const [result, setResult] = useState<ResultData | null>(null)
  const [welcomeIdx, setWelcomeIdx] = useState(0)
  const [notFound, setNotFound] = useState(false)
  const [upgradeRequired, setUpgradeRequired] = useState(false)
  const [clockTime, setClockTime] = useState('')
  const [clockDate, setClockDate] = useState('')

  const [visitorName, setVisitorName] = useState('')
  const [visitorEmail, setVisitorEmail] = useState('')
  const [hostId, setHostId] = useState('')
  const [visitError, setVisitError] = useState('')

  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const submitPending = useRef(false)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClockTime(now.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' }))
      setClockDate(now.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    fetch(`/api/kiosk/${token}/info`)
      .then(async r => {
        if (r.status === 404) { setNotFound(true); return }
        if (r.status === 403) { setUpgradeRequired(true); return }
        const d = await r.json()
        setInfo(d)
      })
      .catch(() => setNotFound(true))

    fetch(`/api/kiosk/${token}/employees`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setEmployees(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [token])

  useEffect(() => {
    const id = setInterval(() => setWelcomeIdx(i => (i + 1) % WELCOME.length), 2500)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const acquire = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
        }
      } catch {}
    }
    acquire()
    const onVisible = () => { if (document.visibilityState === 'visible') acquire() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      wakeLockRef.current?.release().catch(() => {})
    }
  }, [])

  const goHome = useCallback(() => {
    setScreen('home')
    setPin('')
    setPinError('')
    setLoading(false)
    setVisitorName('')
    setVisitorEmail('')
    setHostId('')
    setVisitError('')
    setResult(null)
    submitPending.current = false
  }, [])

  const resetIdle = useCallback(() => {
    if (idleRef.current) clearTimeout(idleRef.current)
    idleRef.current = setTimeout(goHome, IDLE_MS)
  }, [goHome])

  useEffect(() => {
    const events = ['touchstart', 'mousedown', 'keydown', 'pointermove'] as const
    events.forEach(e => window.addEventListener(e, resetIdle, { passive: true }))
    resetIdle()
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdle))
      if (idleRef.current) clearTimeout(idleRef.current)
    }
  }, [resetIdle])

  const showResult = (data: ResultData) => {
    setResult(data)
    setScreen('result')
    setLoading(false)
    setTimeout(goHome, 3500)
  }

  const submitPin = useCallback(async (currentPin: string) => {
    if (submitPending.current) return
    submitPending.current = true
    setLoading(true)
    setPinError('')
    try {
      const res = await fetch(`/api/kiosk/${token}/clock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: currentPin }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPin('')
        setPinError(data.error ?? 'PIN incorrect')
        setPinErrorKey(k => k + 1)
        setLoading(false)
        submitPending.current = false
        return
      }
      const time = new Date(data.time).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
      showResult({
        success: true,
        title: data.action === 'clock_in' ? 'Arrivée enregistrée' : 'Départ enregistré',
        subtitle: `${data.userName} · ${time}`,
      })
    } catch {
      setPin('')
      setPinError('Erreur de connexion')
      setPinErrorKey(k => k + 1)
      setLoading(false)
      submitPending.current = false
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pin.length === 4 && screen === 'employee') submitPin(pin)
  }, [pin, screen, submitPin])

  const onNumpad = (d: string) => {
    if (loading) return
    if (d === '⌫') {
      setPin(p => p.slice(0, -1))
      setPinError('')
    } else if (pin.length < 4) {
      setPin(p => p + d)
    }
  }

  const handleVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setVisitError('')
    try {
      const res = await fetch(`/api/kiosk/${token}/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorName: visitorName.trim(), visitorEmail: visitorEmail.trim(), hostUserId: hostId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setVisitError(data.error ?? 'Erreur')
        setLoading(false)
        return
      }
      showResult({ success: true, title: 'Visite enregistrée', subtitle: 'Un email a été envoyé à votre hôte.' })
    } catch {
      setVisitError('Erreur de connexion')
      setLoading(false)
    }
  }

  // ── Error states ──────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div className="kiosk-root" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center', padding: 32, position: 'relative', overflow: 'hidden' }}>
        <style>{STYLES}</style>
        <BgGlows />
        <div className="kiosk-result-in" style={{ position: 'relative' }}>
          <div style={{ width: 88, height: 88, borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', fontSize: '2rem' }}>🖥️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 10 }}>Terminal introuvable</h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.95rem' }}>Ce lien de kiosque n&apos;existe plus ou a été supprimé.</p>
        </div>
      </div>
    )
  }

  if (upgradeRequired) {
    return (
      <div className="kiosk-root" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center', padding: 32, position: 'relative', overflow: 'hidden' }}>
        <style>{STYLES}</style>
        <BgGlows />
        <div className="kiosk-result-in" style={{ position: 'relative' }}>
          <div style={{ width: 88, height: 88, borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', fontSize: '2rem' }}>🔒</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 10 }}>Kiosque non disponible</h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.95rem' }}>Le mode kiosque requiert un plan SOLO, TEAM ou ENTERPRISE.</p>
        </div>
      </div>
    )
  }

  // ── Result screen ─────────────────────────────────────────────────────────
  if (screen === 'result' && result) {
    const ok = result.success
    return (
      <div className="kiosk-root" style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: '#fff', userSelect: 'none', position: 'relative', overflow: 'hidden',
        background: ok ? 'linear-gradient(145deg, #052e16 0%, #064e3b 100%)' : 'linear-gradient(145deg, #1c0505 0%, #450a0a 100%)',
      }}>
        <style>{STYLES}</style>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: ok ? 'radial-gradient(ellipse 55% 55% at 50% 50%, rgba(16,185,129,0.14) 0%, transparent 70%)' : 'radial-gradient(ellipse 55% 55% at 50% 50%, rgba(239,68,68,0.14) 0%, transparent 70%)' }} />

        <div className="kiosk-result-in" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: 124, height: 124, borderRadius: '50%',
            border: `1.5px solid ${ok ? 'rgba(52,211,153,0.32)' : 'rgba(252,165,165,0.32)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 32, color: ok ? '#34d399' : '#fca5a5',
            background: ok ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
            boxShadow: ok ? '0 0 50px rgba(16,185,129,0.12)' : '0 0 50px rgba(239,68,68,0.12)',
          }}>
            {ok ? <IconCheck /> : <IconXMark />}
          </div>

          <h1 style={{ fontSize: '2.25rem', fontWeight: 600, marginBottom: 10, letterSpacing: '0.01em' }}>{result.title}</h1>
          <p style={{ fontSize: '1.15rem', color: 'rgba(255,255,255,0.5)', marginBottom: 52 }}>{result.subtitle}</p>

          <div style={{ width: 160, height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1, overflow: 'hidden' }}>
            <div className="kiosk-progress" style={{ height: '100%', borderRadius: 1, background: ok ? '#34d399' : '#fca5a5' }} />
          </div>
        </div>
      </div>
    )
  }

  // ── Home screen ───────────────────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <div className="kiosk-root" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', userSelect: 'none', position: 'relative', overflow: 'hidden', padding: 32 }}>
        <style>{STYLES}</style>
        <BgGlows />

        {/* Clock — top right */}
        <div style={{ position: 'absolute', top: 36, right: 44, textAlign: 'right' }}>
          <div className="kiosk-mono" style={{ fontSize: '2rem', color: 'rgba(255,255,255,0.48)', letterSpacing: '0.06em', lineHeight: 1 }}>
            {clockTime}
          </div>
          <div style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.13em', textTransform: 'uppercase', marginTop: 7 }}>
            {clockDate}
          </div>
        </div>

        {/* Logo */}
        <div style={{ marginBottom: 44 }}>
          {info?.logoUrl ? (
            <div className="kiosk-logo" style={{ width: 148, height: 148, borderRadius: 28, overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Image src={info.logoUrl} alt="Logo" width={148} height={148} style={{ objectFit: 'contain', width: '100%', height: '100%', padding: 16 }} />
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div className="kiosk-logo" style={{ width: 148, height: 148, borderRadius: 28, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem', marginBottom: 16 }}>
                🏢
              </div>
              <h1 style={{ fontSize: '1.375rem', fontWeight: 600, color: 'rgba(255,255,255,0.88)', letterSpacing: '0.01em' }}>
                {info?.companyName ?? '…'}
              </h1>
            </div>
          )}
        </div>

        {/* Welcome word */}
        <div style={{ marginBottom: 52, textAlign: 'center', minHeight: '5.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p key={welcomeIdx} className="kiosk-display kiosk-welcome-word" style={{ fontSize: 'clamp(3.5rem, 8vw, 5.5rem)', color: 'rgba(255,255,255,0.84)', letterSpacing: '-0.01em', lineHeight: 1 }}>
            {WELCOME[welcomeIdx]}
          </p>
        </div>

        {/* Divider */}
        <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.09)', marginBottom: 44 }} />

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="kiosk-btn-emp" onClick={() => setScreen('employee')}>
            <div style={{ color: '#34d399' }}><IconPerson /></div>
            <span style={{ fontSize: '1.05rem', fontWeight: 600, letterSpacing: '0.01em' }}>Je suis employé</span>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.32)', letterSpacing: '0.05em', fontWeight: 400 }}>Pointer mon arrivée · départ</span>
          </button>
          <button className="kiosk-btn-vis" onClick={() => setScreen('visitor')}>
            <div style={{ color: '#93c5fd' }}><IconBadge /></div>
            <span style={{ fontSize: '1.05rem', fontWeight: 600, letterSpacing: '0.01em' }}>Je suis visiteur</span>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.32)', letterSpacing: '0.05em', fontWeight: 400 }}>Enregistrer ma visite</span>
          </button>
        </div>

        {/* Watermark */}
        <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', whiteSpace: 'nowrap' }}>
          {info?.siteName && (
            <p style={{ fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)', marginBottom: 4 }}>
              {info.siteName}
            </p>
          )}
          <p style={{ fontSize: '0.62rem', letterSpacing: '0.32em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.1)' }}>
            Pointon
          </p>
        </div>
      </div>
    )
  }

  // ── Employee / PIN screen ─────────────────────────────────────────────────
  if (screen === 'employee') {
    const numpad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']
    return (
      <div className="kiosk-root" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', userSelect: 'none', position: 'relative', overflow: 'hidden', padding: 32 }}>
        <style>{STYLES}</style>
        <BgGlows />

        <button className="kiosk-back" onClick={goHome} style={{ position: 'absolute', top: 28, left: 32 }}>
          <IconArrow /> Retour
        </button>

        <h2 className="kiosk-display" style={{ fontSize: '2.25rem', fontWeight: 300, color: 'rgba(255,255,255,0.88)', marginBottom: 6 }}>
          Votre code PIN
        </h2>
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.26)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 44 }}>
          Code à 4 chiffres
        </p>

        {/* PIN dots */}
        <div key={pinErrorKey} className={pinError ? 'kiosk-shake' : ''} style={{ display: 'flex', gap: 22, marginBottom: 14 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              width: 18, height: 18, borderRadius: '50%',
              border: `2px solid ${pin.length > i ? '#34d399' : 'rgba(255,255,255,0.2)'}`,
              background: pin.length > i ? '#34d399' : 'transparent',
              boxShadow: pin.length > i ? '0 0 12px rgba(52,211,153,0.55)' : 'none',
              transform: pin.length === i + 1 ? 'scale(1.22)' : 'scale(1)',
              transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
            }} />
          ))}
        </div>

        {/* Error */}
        <div style={{ height: 28, display: 'flex', alignItems: 'center', marginBottom: 28 }}>
          {pinError && <p style={{ fontSize: '0.85rem', color: '#f87171', letterSpacing: '0.02em' }}>{pinError}</p>}
        </div>

        {/* Numpad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: 276 }}>
          {numpad.map((d, i) => (
            d === '' ? (
              <div key={i} />
            ) : (
              <button
                key={i}
                onClick={() => onNumpad(d)}
                disabled={loading || (d !== '⌫' && pin.length >= 4)}
                className={`kiosk-numkey${d === '⌫' ? ' is-del' : ''}`}
              >
                {d === '⌫' ? <IconDel /> : d}
              </button>
            )
          ))}
        </div>

        {loading && (
          <p style={{ marginTop: 26, color: 'rgba(255,255,255,0.28)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Vérification…
          </p>
        )}
      </div>
    )
  }

  // ── Visitor screen ────────────────────────────────────────────────────────
  return (
    <div className="kiosk-root" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', userSelect: 'none', position: 'relative', overflow: 'hidden', padding: 32 }}>
      <style>{STYLES}</style>
      <BgGlows />

      <button className="kiosk-back" onClick={goHome} style={{ position: 'absolute', top: 28, left: 32 }}>
        <IconArrow /> Retour
      </button>

      <h2 className="kiosk-display" style={{ fontSize: '2.25rem', fontWeight: 300, color: 'rgba(255,255,255,0.88)', marginBottom: 6 }}>
        Enregistrer ma visite
      </h2>
      <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.26)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 34 }}>
        Quelques informations pour nos équipes
      </p>

      <form onSubmit={handleVisitSubmit} style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.67rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.13em', textTransform: 'uppercase', marginBottom: 9 }}>Prénom et Nom</label>
          <input type="text" value={visitorName} onChange={e => setVisitorName(e.target.value)} required autoComplete="off" placeholder="Marie Dupont" className="kiosk-field" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.67rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.13em', textTransform: 'uppercase', marginBottom: 9 }}>Adresse email</label>
          <input type="email" value={visitorEmail} onChange={e => setVisitorEmail(e.target.value)} required autoComplete="off" placeholder="marie@exemple.be" className="kiosk-field" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.67rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.13em', textTransform: 'uppercase', marginBottom: 9 }}>Je viens rendre visite à</label>
          <select value={hostId} onChange={e => setHostId(e.target.value)} required className="kiosk-field" style={{ cursor: 'pointer' }}>
            <option value="">— Sélectionner —</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name ?? emp.id}</option>
            ))}
          </select>
        </div>

        {visitError && <p style={{ color: '#f87171', fontSize: '0.85rem' }}>{visitError}</p>}

        <button type="submit" disabled={loading || !visitorName.trim() || !visitorEmail.trim() || !hostId} className="kiosk-submit">
          {loading ? 'Enregistrement…' : 'Confirmer ma visite'}
        </button>
      </form>
    </div>
  )
}
