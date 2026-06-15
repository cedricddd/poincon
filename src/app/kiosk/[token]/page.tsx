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

export default function KioskPage() {
  const { token } = useParams<{ token: string }>()

  const [info, setInfo] = useState<KioskInfo | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [screen, setScreen] = useState<Screen>('home')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [pinError, setPinError] = useState('')
  const [result, setResult] = useState<ResultData | null>(null)
  const [welcomeIdx, setWelcomeIdx] = useState(0)
  const [notFound, setNotFound] = useState(false)
  const [upgradeRequired, setUpgradeRequired] = useState(false)

  const [visitorName, setVisitorName] = useState('')
  const [visitorEmail, setVisitorEmail] = useState('')
  const [hostId, setHostId] = useState('')
  const [visitError, setVisitError] = useState('')

  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const submitPending = useRef(false)

  // Load kiosk info and employee list
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

  // Rotating welcome text
  useEffect(() => {
    const id = setInterval(() => setWelcomeIdx(i => (i + 1) % WELCOME.length), 2500)
    return () => clearInterval(id)
  }, [])

  // Screen Wake Lock
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

  // Idle timer — reset on any interaction
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

  // Submit PIN — triggered automatically when 4 digits entered
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
      setLoading(false)
      submitPending.current = false
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4 && screen === 'employee') {
      submitPin(pin)
    }
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

  // ── Error states ─────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white text-center p-8">
        <div>
          <p className="text-5xl mb-6">🖥️</p>
          <h1 className="text-2xl font-semibold mb-2">Terminal introuvable</h1>
          <p className="text-white/50">Ce lien de kiosque n&apos;existe plus ou a été supprimé.</p>
        </div>
      </div>
    )
  }

  if (upgradeRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white text-center p-8">
        <div>
          <p className="text-5xl mb-6">🔒</p>
          <h1 className="text-2xl font-semibold mb-2">Kiosque non disponible</h1>
          <p className="text-white/50">Le mode kiosque requiert un plan SOLO, TEAM ou ENTERPRISE.</p>
        </div>
      </div>
    )
  }

  // ── Result screen ─────────────────────────────────────────────────────────
  if (screen === 'result' && result) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center text-white select-none ${
        result.success ? 'bg-emerald-700' : 'bg-red-700'
      }`}>
        <div className="text-9xl mb-6 animate-bounce-once">{result.success ? '✅' : '❌'}</div>
        <h1 className="text-4xl font-bold mb-3">{result.title}</h1>
        <p className="text-2xl text-white/80">{result.subtitle}</p>
      </div>
    )
  }

  const base = 'min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white select-none flex flex-col items-center justify-center p-8'

  // ── Home screen ───────────────────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <div className={base}>
        <div className="flex flex-col items-center gap-6 mb-12">
          {info?.logoUrl ? (
            <div className="w-28 h-28 rounded-2xl overflow-hidden bg-white/10 flex items-center justify-center">
              <Image src={info.logoUrl} alt="Logo" width={112} height={112} className="object-contain w-full h-full p-2" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-white/10 flex items-center justify-center text-4xl">🏢</div>
          )}
          <div className="text-center">
            <h1 className="text-3xl font-bold">{info?.companyName ?? 'Chargement…'}</h1>
            {info?.siteName && <p className="text-white/50 mt-1">{info.siteName}</p>}
          </div>
        </div>

        <p className="text-6xl font-light mb-14 tracking-wide transition-all duration-500">
          {WELCOME[welcomeIdx]}
        </p>

        <div className="flex flex-col sm:flex-row gap-5">
          <button
            onClick={() => setScreen('employee')}
            className="px-10 py-7 bg-emerald-500 hover:bg-emerald-600 active:scale-95 rounded-2xl text-xl font-semibold transition-all shadow-xl"
          >
            👤 Je suis employé
          </button>
          <button
            onClick={() => setScreen('visitor')}
            className="px-10 py-7 bg-blue-500 hover:bg-blue-600 active:scale-95 rounded-2xl text-xl font-semibold transition-all shadow-xl"
          >
            🏷️ Je suis visiteur
          </button>
        </div>
      </div>
    )
  }

  // ── Employee / PIN screen ─────────────────────────────────────────────────
  if (screen === 'employee') {
    const numpad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']
    return (
      <div className={`${base} relative`}>
        <button
          onClick={goHome}
          className="absolute top-6 left-6 text-white/50 hover:text-white text-sm flex items-center gap-1 transition-colors"
        >
          ← Retour
        </button>

        <h2 className="text-3xl font-semibold mb-2">Entrez votre PIN</h2>
        <p className="text-white/50 mb-10">Code à 4 chiffres</p>

        {/* PIN dots */}
        <div className="flex gap-5 mb-10">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-6 h-6 rounded-full border-2 transition-all duration-150 ${
                pin.length > i ? 'bg-emerald-400 border-emerald-400 scale-110' : 'border-white/30'
              }`}
            />
          ))}
        </div>

        {pinError && (
          <p className="text-red-400 text-base mb-6 font-medium">{pinError}</p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 w-72">
          {numpad.map((d, i) => (
            <button
              key={i}
              onClick={() => onNumpad(d)}
              disabled={loading || d === '' || (d !== '⌫' && pin.length >= 4)}
              className={`h-20 rounded-2xl text-2xl font-medium transition-all active:scale-95 ${
                d === ''
                  ? 'pointer-events-none opacity-0'
                  : d === '⌫'
                  ? 'bg-white/10 hover:bg-white/20 text-white/70 disabled:opacity-40'
                  : 'bg-white/10 hover:bg-white/20 disabled:opacity-40'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {loading && (
          <p className="mt-8 text-white/50 text-base">Vérification…</p>
        )}
      </div>
    )
  }

  // ── Visitor screen ────────────────────────────────────────────────────────
  return (
    <div className={`${base} relative`}>
      <button
        onClick={goHome}
        className="absolute top-6 left-6 text-white/50 hover:text-white text-sm flex items-center gap-1 transition-colors"
      >
        ← Retour
      </button>

      <h2 className="text-3xl font-semibold mb-10">Enregistrer ma visite</h2>

      <form onSubmit={handleVisitSubmit} className="w-full max-w-md space-y-5">
        <div>
          <label className="block text-sm text-white/60 mb-2">Prénom et Nom</label>
          <input
            type="text"
            value={visitorName}
            onChange={e => setVisitorName(e.target.value)}
            required
            autoComplete="off"
            placeholder="Marie Dupont"
            className="w-full px-5 py-4 text-lg rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/25 focus:outline-none focus:border-blue-400 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-2">Adresse email</label>
          <input
            type="email"
            value={visitorEmail}
            onChange={e => setVisitorEmail(e.target.value)}
            required
            autoComplete="off"
            placeholder="marie@exemple.be"
            className="w-full px-5 py-4 text-lg rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/25 focus:outline-none focus:border-blue-400 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-2">Je viens rendre visite à</label>
          <select
            value={hostId}
            onChange={e => setHostId(e.target.value)}
            required
            className="w-full px-5 py-4 text-lg rounded-xl bg-[#1e293b] border border-white/20 text-white focus:outline-none focus:border-blue-400 transition-colors"
          >
            <option value="">— Sélectionner —</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name ?? emp.id}</option>
            ))}
          </select>
        </div>

        {visitError && (
          <p className="text-red-400 text-sm">{visitError}</p>
        )}

        <button
          type="submit"
          disabled={loading || !visitorName.trim() || !visitorEmail.trim() || !hostId}
          className="w-full py-5 bg-blue-500 hover:bg-blue-600 active:scale-95 rounded-xl text-xl font-semibold transition-all disabled:opacity-40 mt-2"
        >
          {loading ? 'Enregistrement…' : 'Enregistrer ma visite'}
        </button>
      </form>
    </div>
  )
}
