'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'

type AppScreen = 'checking' | 'setup' | 'home' | 'scanning' | 'pin' | 'clocking' | 'result'
type CamPerm = 'granted' | 'prompt' | 'denied'

interface SiteInfo {
  token: string
  siteName: string
  companyName: string
  logoUrl: string | null
}

interface ClockResult {
  action: 'clock_in' | 'clock_out'
  firstName: string
  time: string
  logoUrl: string | null
  companyName: string
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
            background: i < count ? '#34d399' : 'rgba(255,255,255,0.18)',
            boxShadow: i < count ? '0 0 12px rgba(52,211,153,0.55)' : 'none',
          }}
        />
      ))}
    </div>
  )
}

function NumKey({ label, onClick }: { label: string | React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-20 rounded-2xl text-3xl font-medium text-white/85 transition-all duration-100 select-none active:scale-95"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
      onMouseDown={e => e.preventDefault()}
    >
      {label}
    </button>
  )
}

function CompanyLogo({ logoUrl, companyName, small }: { logoUrl: string | null; companyName: string; small?: boolean }) {
  if (logoUrl) {
    return (
      <div className={`flex items-center justify-center ${small ? 'opacity-50' : ''} mb-1`}>
        <div className="bg-white rounded-xl px-5 py-2.5 inline-flex items-center justify-center">
          <Image
            src={logoUrl}
            alt={companyName}
            width={140}
            height={44}
            className="max-h-10 max-w-[140px] w-auto h-auto object-contain"
            unoptimized
          />
        </div>
      </div>
    )
  }
  return (
    <div className={`flex items-center justify-center ${small ? 'opacity-50' : ''} mb-1`}>
      <span className="text-white text-2xl font-bold tracking-tight">{companyName}</span>
    </div>
  )
}

function DelIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 4H8l-7 7 7 7h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
      <line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" />
    </svg>
  )
}

export function QrScannerApp() {
  const [screen, setScreen] = useState<AppScreen>('checking')
  const [camPerm, setCamPerm] = useState<CamPerm>('prompt')
  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinErrorKey, setPinErrorKey] = useState(0)
  const [result, setResult] = useState<ClockResult | null>(null)
  const [scanError, setScanError] = useState('')
  const [fetchingSite, setFetchingSite] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number>(0)
  const processingRef = useRef(false)
  const jsQRRef = useRef<typeof import('jsqr').default | null>(null)

  // Load jsQR once
  useEffect(() => {
    import('jsqr').then(m => { jsQRRef.current = m.default }).catch(() => {})
  }, [])

  // Check camera permission on mount
  useEffect(() => {
    if (!navigator.permissions) {
      setCamPerm('prompt')
      setScreen('setup')
      return
    }
    navigator.permissions.query({ name: 'camera' as PermissionName }).then(status => {
      const state = status.state as CamPerm
      setCamPerm(state)
      setScreen(state === 'granted' ? 'home' : 'setup')
      status.onchange = () => {
        const next = status.state as CamPerm
        setCamPerm(next)
        if (next === 'granted') setScreen('home')
      }
    }).catch(() => {
      setCamPerm('prompt')
      setScreen('setup')
    })
  }, [])

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const goHome = useCallback(() => {
    stopCamera()
    setSiteInfo(null)
    setPin('')
    setPinError('')
    setScanError('')
    setResult(null)
    processingRef.current = false
    setScreen('home')
  }, [stopCamera])

  const requestCameraAndScan = useCallback(async () => {
    await startCamera()
  }, [startCamera])

  const startCamera = useCallback(async () => {
    setScanError('')
    processingRef.current = false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      setCamPerm('granted')
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScreen('scanning')
    } catch {
      setCamPerm('denied')
      setScreen('setup')
    }
  }, [])

  // QR scan loop
  useEffect(() => {
    if (screen !== 'scanning') return
    let running = true

    const tick = () => {
      if (!running || processingRef.current) return
      const video = videoRef.current
      const canvas = canvasRef.current
      const jsQR = jsQRRef.current
      if (!video || !canvas || !jsQR || video.readyState < video.HAVE_ENOUGH_DATA) {
        if (running) animFrameRef.current = requestAnimationFrame(tick)
        return
      }
      canvas.width = video.videoWidth || 320
      canvas.height = video.videoHeight || 240
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) { if (running) animFrameRef.current = requestAnimationFrame(tick); return }
      ctx.drawImage(video, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      })
      if (code?.data) {
        const match = code.data.match(/\/qr\/([a-f0-9]+)/)
        if (match) {
          processingRef.current = true
          running = false
          stopCamera()
          handleTokenFound(match[1])
          return
        }
      }
      if (running) animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)
    return () => {
      running = false
      cancelAnimationFrame(animFrameRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, stopCamera])

  const handleTokenFound = async (token: string) => {
    setFetchingSite(true)
    try {
      const res = await fetch(`/api/qr/${token}/clock`)
      if (!res.ok) {
        const data = await res.json()
        setScanError(data.error ?? 'QR code invalide ou expiré')
        setFetchingSite(false)
        setScreen('home')
        return
      }
      const data = await res.json()
      setSiteInfo({ token, siteName: data.siteName, companyName: data.companyName, logoUrl: data.logoUrl })
      setPin('')
      setPinError('')
    } catch {
      setScanError('Erreur réseau')
      setScreen('home')
    } finally {
      setFetchingSite(false)
      setScreen(s => s === 'scanning' || s === 'home' ? 'pin' : s)
    }
  }

  // Auto-submit at 4 digits
  useEffect(() => {
    if (pin.length === 4 && screen === 'pin') {
      submitPin(pin)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, screen])

  const submitPin = async (pinValue: string) => {
    if (!siteInfo) return
    setScreen('clocking')
    try {
      const res = await fetch(`/api/qr/${siteInfo.token}/clock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinValue }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPinError(data.error ?? 'Erreur')
        setPinErrorKey(k => k + 1)
        setPin('')
        setScreen('pin')
        return
      }
      setResult(data)
      setScreen('result')
      setTimeout(goHome, 5000)
    } catch {
      setPinError('Erreur réseau')
      setPinErrorKey(k => k + 1)
      setPin('')
      setScreen('pin')
    }
  }

  const handleKey = useCallback((digit: string) => {
    setPinError('')
    setPin(p => p.length < 4 ? p + digit : p)
  }, [])

  const handleDel = useCallback(() => {
    setPinError('')
    setPin(p => p.slice(0, -1))
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: '#090c14', colorScheme: 'dark' }}
    >
      {/* Gradient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% -5%, rgba(99,102,241,0.09) 0%, transparent 65%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 40% at 95% 95%, rgba(59,130,246,0.04) 0%, transparent 60%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-xs">

        {/* ── CHECKING ── */}
        {screen === 'checking' && (
          <div className="flex items-center justify-center">
            <svg className="animate-spin w-8 h-8 text-indigo-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        )}

        {/* ── SETUP (permission) ── */}
        {screen === 'setup' && (
          <div className="text-center">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
              style={{
                background: camPerm === 'denied'
                  ? 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.08))'
                  : 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.08))',
                border: `1px solid ${camPerm === 'denied' ? 'rgba(239,68,68,0.35)' : 'rgba(99,102,241,0.35)'}`,
              }}
            >
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none"
                stroke={camPerm === 'denied' ? '#f87171' : '#818cf8'}
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
                {camPerm === 'denied' && <line x1="2" y1="2" x2="22" y2="22" />}
              </svg>
            </div>

            <h1 className="text-xl font-bold text-white mb-2">
              {camPerm === 'denied' ? 'Caméra bloquée' : 'Autoriser la caméra'}
            </h1>

            {camPerm === 'denied' ? (
              <>
                <p className="text-white/50 text-sm mb-8 leading-relaxed">
                  L&apos;accès à la caméra a été refusé. Pour le réactiver&nbsp;:
                </p>
                <div className="text-left space-y-3 mb-8">
                  {[
                    'Maintenez l\'icône de l\'app appuyée',
                    'Appuyez sur « Infos sur l\'application »',
                    'Autorisations → Caméra → Autoriser',
                    'Revenez ici et réessayez',
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-indigo-400 text-xs font-bold">{i + 1}</span>
                      </div>
                      <p className="text-white/60 text-sm leading-snug">{step}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={startCamera}
                  className="w-full py-4 rounded-2xl text-white font-semibold transition-all active:scale-[0.98]"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  Réessayer
                </button>
              </>
            ) : (
              <>
                <p className="text-white/50 text-sm mb-8 leading-relaxed">
                  Pour scanner les QR codes de vos sites, l&apos;application a besoin d&apos;accéder à votre caméra.
                </p>
                <button
                  onClick={startCamera}
                  className="w-full py-4 rounded-2xl text-white font-semibold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    boxShadow: '0 0 30px rgba(99,102,241,0.3)',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  Autoriser la caméra
                </button>
                <p className="text-white/20 text-xs mt-4">
                  Utilisé uniquement pour lire les QR codes
                </p>
              </>
            )}
          </div>
        )}

        {/* ── HOME ── */}
        {screen === 'home' && (
          <div className="text-center">
            <div className="mb-10">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.08))',
                  border: '1px solid rgba(99,102,241,0.35)',
                  boxShadow: '0 0 40px rgba(99,102,241,0.15)',
                }}
              >
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <path d="M14 14h.01M17 14h.01M20 14h.01M14 17h.01M17 17h.01M20 17h.01M14 20h.01M17 20h.01M20 20h.01" strokeWidth="2.5" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">Pointon QR</h1>
              <p className="text-white/40 text-sm mt-1">Pointage sans application</p>
            </div>

            {fetchingSite ? (
              <div className="flex items-center justify-center gap-3 py-4">
                <svg className="animate-spin w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <span className="text-white/50 text-sm">Chargement…</span>
              </div>
            ) : (
              <button
                onClick={startCamera}
                className="w-full py-4 rounded-2xl text-white font-semibold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  boxShadow: '0 0 30px rgba(99,102,241,0.3)',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Scanner un QR code
              </button>
            )}

            <p className="text-white/20 text-xs mt-8">
              Scannez le QR code affiché à votre lieu de travail
            </p>
          </div>
        )}

        {/* ── SCANNING ── */}
        {screen === 'scanning' && (
          <div className="text-center">
            <p className="text-white/50 text-sm mb-4">Pointez vers le QR code du site</p>
            <div
              className="relative rounded-2xl overflow-hidden bg-black/60"
              style={{ aspectRatio: '1 / 1' }}
            >
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />
              {/* Scan overlay corners */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-52 h-52">
                  {[
                    'top-0 left-0 border-t-2 border-l-2 rounded-tl-lg',
                    'top-0 right-0 border-t-2 border-r-2 rounded-tr-lg',
                    'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg',
                    'bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg',
                  ].map((cls, i) => (
                    <div key={i} className={`absolute w-10 h-10 border-white/80 ${cls}`} />
                  ))}
                  {/* Animated scan line */}
                  <div
                    className="absolute left-1 right-1 h-0.5 bg-indigo-400/70 rounded-full"
                    style={{ animation: 'scanLine 2s ease-in-out infinite' }}
                  />
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <button
              onClick={goHome}
              className="mt-5 text-white/40 text-sm hover:text-white/60 transition-colors px-4 py-2"
            >
              Annuler
            </button>
          </div>
        )}

        {/* ── PIN + CLOCKING ── */}
        {(screen === 'pin' || screen === 'clocking') && siteInfo && (
          <>
            <div className="text-center mb-2">
              <CompanyLogo logoUrl={siteInfo.logoUrl} companyName={siteInfo.companyName} />
              <p className="text-white/40 text-sm mt-1">{siteInfo.siteName}</p>
            </div>

            <p className="text-center text-white/60 text-sm mt-8 mb-0">
              Entrez votre code PIN
            </p>

            <PinDots count={pin.length} />

            {pinError && (
              <p
                key={pinErrorKey}
                className="text-center text-red-400 text-sm mb-4 animate-[shake_0.35s_ease]"
              >
                {pinError}
              </p>
            )}

            <div
              className="grid grid-cols-3 gap-3"
              style={{
                opacity: screen === 'clocking' ? 0.4 : 1,
                pointerEvents: screen === 'clocking' ? 'none' : 'auto',
              }}
            >
              {['1','2','3','4','5','6','7','8','9'].map(k => (
                <NumKey key={k} label={k} onClick={() => handleKey(k)} />
              ))}
              <button
                onClick={goHome}
                className="h-20 rounded-2xl text-xs text-white/30 transition-all active:scale-95 leading-tight"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                ← Retour
              </button>
              <NumKey label="0" onClick={() => handleKey('0')} />
              <NumKey label={<DelIcon />} onClick={handleDel} />
            </div>

            {screen === 'clocking' && (
              <p className="text-center text-white/40 text-sm mt-6">Pointage en cours…</p>
            )}
          </>
        )}

        {/* ── RESULT ── */}
        {screen === 'result' && result && (
          <div className="text-center">
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

            <div className="mb-6">
              <CompanyLogo logoUrl={result.logoUrl} companyName={result.companyName} small />
            </div>

            {result.action === 'clock_in' ? (
              <>
                <h2 className="text-3xl font-bold text-white mb-2">Bienvenue au travail,</h2>
                <h3 className="text-4xl font-bold" style={{ color: '#34d399' }}>{result.firstName} !</h3>
                <p className="text-white/40 text-lg mt-4">Pointé à {formatTime(result.time)}</p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-white mb-2">Au revoir,</h2>
                <h3 className="text-4xl font-bold" style={{ color: '#a78bfa' }}>{result.firstName} !</h3>
                <p className="text-white/50 text-xl mt-3">Bonne fin de journée 👋</p>
                <p className="text-white/40 text-base mt-2">Pointé à {formatTime(result.time)}</p>
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
        @keyframes scanLine {
          0%   { top: 10%; opacity: 1; }
          50%  { top: 85%; opacity: 0.6; }
          100% { top: 10%; opacity: 1; }
        }
      `}</style>
    </div>
  )
}
