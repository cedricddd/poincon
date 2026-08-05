'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Header } from '@/components/Header'
import { Button } from '@/components/Button'
import { ThemeVideo } from '@/components/ThemeVideo'
import { Logo } from '@/components/Logo'

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface FeatureItem { n: string; color: string; title: string; description: string }
interface MethodItem { color: string; icon: React.ReactNode; hasSub?: boolean; title: string; description: string }
interface StepItem { n: string; icon: React.ReactNode; title: string; description: string }
interface TestimonialItem { name: string; company: string; location: string; plan: string; initials: string; color: string; quote: string; role: string }
interface TierItem {
  name: string; monthlyPrice: number | null; annualPrice: number | null; annualTotal: number | null; annualSavings: number | null
  buttonHref: string; buttonHrefAnnual: string; highlight: boolean; extraSeat: number | null
  limit: string; buttonText: string; includesLabel: string; features: string[]; includes: string[]
}
interface FaqEntry { q: string; a: string }

/* ─── Locale → BCP47 for date/time formatting ───────────────────────────── */

const BCP47: Record<string, string> = { fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB', de: 'de-DE' }

/* ─── Animated number hook ──────────────────────────────────────────────── */

function useAnimatedNumber(target: number, duration = 480) {
  const [displayed, setDisplayed] = useState(target)
  const prevRef = useRef(target)
  const frameRef = useRef<number>(0)
  const startRef = useRef<number>(0)

  useEffect(() => {
    const from = prevRef.current
    if (from === target) return
    cancelAnimationFrame(frameRef.current)
    startRef.current = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - startRef.current) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setDisplayed(from + (target - from) * ease)
      if (t < 1) { frameRef.current = requestAnimationFrame(tick) }
      else { setDisplayed(target); prevRef.current = target }
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])

  return displayed
}

/* ─── Scroll reveal hook ────────────────────────────────────────────────── */

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('is-visible'); obs.disconnect() } },
      { threshold: 0.12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

/* ─── Visual config (text comes from translations) ──────────────────────── */

const statsConfig = [
  { value: 500, suffix: '+' },
  { value: 2, suffix: ' min' },
  { value: 100, suffix: '%' },
  { value: 0, suffix: '€' },
]

const featuresConfig = [
  { n: '01', color: '#10b981' },
  { n: '02', color: '#f59e0b' },
  { n: '03', color: '#0ea5e9' },
  { n: '04', color: '#fb923c' },
  { n: '05', color: '#6366f1' },
  { n: '06', color: '#8b5cf6' },
]

const testimonialsConfig = [
  { name: 'Marie Renard', company: 'Boulangerie Renard', location: 'Liège', plan: 'Starter', initials: 'MR', color: '#10b981' },
  { name: 'Thomas Henrard', company: 'DataBridge SPRL', location: 'Bruxelles', plan: 'Team', initials: 'TH', color: '#6366f1' },
  { name: 'Sébastien Pirard', company: 'Pirard Installations', location: 'Namur', plan: 'Starter', initials: 'SP', color: '#0ea5e9' },
]

const stepsConfig = [
  {
    n: '01',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
      </svg>
    ),
  },
  {
    n: '02',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    n: '03',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14.5"/>
      </svg>
    ),
  },
]

const pricingConfig = [
  { name: 'Free', monthlyPrice: 0, annualPrice: 0, annualTotal: 0, annualSavings: 0, buttonHref: '/signup', buttonHrefAnnual: '/signup', highlight: false, extraSeat: null as number | null },
  { name: 'Starter', monthlyPrice: 19.90, annualPrice: 16.58, annualTotal: 199, annualSavings: 40, buttonHref: '/api/stripe/checkout?plan=starter&billing=monthly', buttonHrefAnnual: '/api/stripe/checkout?plan=starter&billing=yearly', highlight: false, extraSeat: 2.90 as number | null },
  { name: 'Team', monthlyPrice: 44.90, annualPrice: 37.42, annualTotal: 449, annualSavings: 90, buttonHref: '/api/stripe/checkout?plan=team&billing=monthly', buttonHrefAnnual: '/api/stripe/checkout?plan=team&billing=yearly', highlight: true, extraSeat: 2.60 as number | null },
  { name: 'Business', monthlyPrice: 69.90, annualPrice: 58.25, annualTotal: 699, annualSavings: 140, buttonHref: '/api/stripe/checkout?plan=business&billing=monthly', buttonHrefAnnual: '/api/stripe/checkout?plan=business&billing=yearly', highlight: false, extraSeat: 2.20 as number | null },
  { name: 'Enterprise', monthlyPrice: null, annualPrice: null, annualTotal: null, annualSavings: null, buttonHref: 'mailto:contact@pointon.be', buttonHrefAnnual: 'mailto:contact@pointon.be', highlight: false, extraSeat: null as number | null },
]

const pointingMethodsConfig = [
  {
    color: '#10b981',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="17" r="1"/>
      </svg>
    ),
  },
  {
    color: '#0ea5e9',
    hasSub: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="4" height="4" rx="1"/><rect x="10" y="3" width="4" height="4" rx="1"/>
        <rect x="17" y="3" width="4" height="4" rx="1"/><rect x="3" y="10" width="4" height="4" rx="1"/>
        <rect x="10" y="10" width="4" height="4" rx="1"/><rect x="17" y="10" width="4" height="4" rx="1"/>
        <rect x="3" y="17" width="4" height="4" rx="1"/><rect x="10" y="17" width="4" height="4" rx="1"/>
        <rect x="17" y="17" width="4" height="4" rx="1"/>
      </svg>
    ),
  },
  {
    color: '#f59e0b',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="5" y="5" width="3" height="3" rx="0.5" fill="currentColor" stroke="none"/>
        <rect x="16" y="5" width="3" height="3" rx="0.5" fill="currentColor" stroke="none"/>
        <rect x="5" y="16" width="3" height="3" rx="0.5" fill="currentColor" stroke="none"/>
        <path d="M14 14h3v3M14 20h7M20 14v3"/>
      </svg>
    ),
  },
  {
    color: '#6366f1',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 21h8M12 18v3"/>
      </svg>
    ),
  },
]

/* ─── Kiosk tablet mockup ─────────────────────────────────────────────────── */

function KioskTablet({ dark }: { dark: boolean }) {
  const t = useTranslations('landing.mockup')
  const screen = dark ? '#111827' : '#e8f5f0'
  const ink = dark ? 'rgba(249,250,251,0.9)' : 'rgba(0,0,0,0.8)'
  const muted = dark ? 'rgba(156,163,175,0.7)' : 'rgba(0,0,0,0.35)'
  const bezel = dark ? '#0d1117' : '#1a1a1a'
  return (
    <div style={{ width: 180 }}>
      <div style={{ background: bezel, borderRadius: '1.5rem', padding: 10, boxShadow: dark ? '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)' : '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)' }}>
        <div style={{ background: screen, borderRadius: '1rem', padding: 16 }}>
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', margin: '0 auto 6px' }} />
            <div style={{ fontSize: 9, fontWeight: 700, color: '#10b981', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>{t('kioskTitle')}</div>
          </div>
          <div style={{ fontSize: 10, color: ink, textAlign: 'center' as const, marginBottom: 10, fontWeight: 600 }}>{t('kioskSite')}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginBottom: 12 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: i < 2 ? '#10b981' : 'transparent', border: `1.5px solid ${i < 2 ? '#10b981' : muted}` }} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(k => (
              <div key={k} style={{ height: 22, borderRadius: 6, background: dark ? '#1f2937' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: ink, border: `1px solid ${dark ? '#374151' : '#e5e7eb'}` }}>
                {k}
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center' as const, marginTop: 10, fontSize: 8, color: muted, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>{t('pinRequired')}</div>
        </div>
      </div>
    </div>
  )
}

/* ─── Hero clock widget (phone mockup) ──────────────────────────────────── */

function HeroClockWidget() {
  const t = useTranslations('landing.mockup')
  const locale = useLocale()
  const bcp = BCP47[locale] ?? 'fr-BE'
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  const [dark, setDark] = useState(false)
  const [clockedIn, setClockedIn] = useState(true)
  const [arrivalTime] = useState(() => {
    const d = new Date()
    d.setHours(9, 42, 17, 0)
    return d
  })
  const [departureTime, setDepartureTime] = useState<Date | null>(null)
  const [duration, setDuration] = useState('')
  const [pressing, setPressing] = useState(false)

  useEffect(() => {
    const syncTheme = () => setDark(document.documentElement.classList.contains('dark'))
    syncTheme()
    const obs = new MutationObserver(syncTheme)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString(bcp, { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setDate(now.toLocaleDateString(bcp, { weekday: 'long', day: 'numeric', month: 'long' }))
      const base = departureTime ?? now
      const diff = Math.max(0, Math.floor((base.getTime() - arrivalTime.getTime()) / 1000))
      const dh = Math.floor(diff / 3600).toString().padStart(2, '0')
      const dm = Math.floor((diff % 3600) / 60).toString().padStart(2, '0')
      setDuration(`${dh}h${dm}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [arrivalTime, departureTime, bcp])

  function handleToggle() {
    if (clockedIn) {
      setDepartureTime(new Date())
      setClockedIn(false)
    } else {
      setDepartureTime(null)
      setClockedIn(true)
    }
  }

  const arrStr = arrivalTime.toLocaleTimeString(bcp, { hour: '2-digit', minute: '2-digit' })
  const depStr = departureTime
    ? departureTime.toLocaleTimeString(bcp, { hour: '2-digit', minute: '2-digit' })
    : null

  /* Theme tokens */
  const screen   = dark ? '#111827' : '#f0faf6'
  const ink      = dark ? 'rgba(249,250,251,1)' : 'rgba(0,0,0,0.85)'
  const muted    = dark ? 'rgba(156,163,175,1)' : 'rgba(0,0,0,0.4)'
  const divider  = dark ? 'rgba(55,65,81,1)' : 'rgba(0,0,0,0.08)'
  const bezel    = dark ? '#0d1117' : '#1a1a1a'
  const sideBtn  = dark ? '#060a10' : '#111'

  return (
    <div className="relative mx-auto select-none" style={{ width: 'min(380px, 92vw)' }} aria-hidden="true">
      {/* Tablet kiosk — behind phone */}
      <div
        className="absolute hidden sm:block pointer-events-none"
        style={{ right: 0, top: 20, transform: 'rotate(4deg) scale(0.85)', transformOrigin: 'top right', opacity: 0.38, zIndex: 0 }}
      >
        <KioskTablet dark={dark} />
      </div>
      {/* Phone */}
      <div className="relative" style={{ width: 'min(280px, 80vw)', zIndex: 1, transition: 'all 0.3s ease' }}>
      {/* Outer bezel */}
      <div
        className="relative rounded-[2.8rem] overflow-hidden"
        style={{
          background: bezel,
          padding: '10px',
          boxShadow: dark
            ? '0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.03)'
            : '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.04)',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Screen */}
        <div
          className="relative rounded-[2.2rem] overflow-hidden"
          style={{ background: screen, minHeight: 520, transition: 'background 0.3s ease' }}
        >
          {/* Dynamic island */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-24 h-6 rounded-full bg-black" />
          </div>

          {/* Status bar */}
          <div className="flex justify-between items-center px-5 py-1 text-[10px] font-semibold" style={{ color: muted }}>
            <span className="font-mono">{time.slice(0, 5)}</span>
            <div className="flex items-center gap-1.5">
              <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor">
                <rect x="0" y="4" width="2" height="6" rx="0.5" opacity="0.4"/>
                <rect x="3" y="2.5" width="2" height="7.5" rx="0.5" opacity="0.6"/>
                <rect x="6" y="1" width="2" height="9" rx="0.5" opacity="0.8"/>
                <rect x="9" y="0" width="2" height="10" rx="0.5"/>
              </svg>
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                <rect x="0.5" y="0.5" width="11" height="9" rx="2" stroke="currentColor" strokeOpacity="0.5"/>
                <rect x="2" y="2" width="8" height="6" rx="1" fill="currentColor"/>
                <path d="M12 3.5v3a1.5 1.5 0 0 0 0-3z" fill="currentColor" fillOpacity="0.5"/>
              </svg>
            </div>
          </div>

          {/* Site badge */}
          <div className="px-5 pt-2 pb-1">
            <div className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
              <span className="text-[11px] font-semibold text-[#10b981]">{t('phoneSite')}</span>
            </div>
          </div>

          {/* Clock */}
          <div className="text-center px-5 pt-2 pb-4">
            <div
              className="font-mono font-bold leading-none text-[#10b981]"
              style={{ fontSize: '3rem', letterSpacing: '-0.02em', fontFeatureSettings: '"tnum"' }}
            >
              {time || '──:──:──'}
            </div>
            <div className="text-[11px] mt-1.5 capitalize" style={{ color: muted }}>{date}</div>
          </div>

          {/* Action button */}
          <div className="px-5 pb-5">
            <button
              onMouseDown={() => setPressing(true)}
              onMouseUp={() => { setPressing(false); handleToggle() }}
              onMouseLeave={() => setPressing(false)}
              onTouchStart={() => setPressing(true)}
              onTouchEnd={() => { setPressing(false); handleToggle() }}
              className="w-full py-4 rounded-2xl font-bold tracking-widest text-sm text-white"
              style={{
                background: clockedIn
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: clockedIn
                  ? pressing ? '0 2px 12px rgba(239,68,68,0.4)' : '0 6px 24px rgba(239,68,68,0.35)'
                  : pressing ? '0 2px 12px rgba(16,185,129,0.4)' : '0 6px 24px rgba(16,185,129,0.35)',
                transform: pressing ? 'scale(0.97)' : 'scale(1)',
                transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              {clockedIn ? t('clockOut') : t('clockIn')}
            </button>
          </div>

          {/* Today's session */}
          <div className="mx-5 mb-4">
            <div
              className="text-[9px] font-bold tracking-[0.18em] uppercase mb-3 flex items-center justify-between"
              style={{ color: muted }}
            >
              <span>{t('today')}</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100/20 text-amber-600 font-semibold">{t('pending')}</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                  <span className="text-[12px] font-medium" style={{ color: ink }}>{t('arrival')}</span>
                </div>
                <span className="font-mono text-[12px] font-semibold" style={{ color: ink }}>{arrStr}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: depStr ? '#ef4444' : 'transparent', border: depStr ? 'none' : `1px solid ${muted}` }}
                  />
                  <span className="text-[12px] font-medium" style={{ color: muted }}>{t('departure')}</span>
                </div>
                <span className="font-mono text-[12px]" style={{ color: muted }}>{depStr ?? '—'}</span>
              </div>
              {duration && (
                <div
                  className="flex justify-between items-center pt-2"
                  style={{ borderTop: `1px solid ${divider}` }}
                >
                  <span className="text-[12px] font-medium" style={{ color: muted }}>{t('duration')}</span>
                  <span className="font-mono text-[12px] font-semibold text-[#10b981]">{duration}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Side buttons */}
      <div className="absolute top-28 w-1 h-12 rounded-l-sm" style={{ background: sideBtn, right: '-9px' }} />
      <div className="absolute top-20 w-1 h-8 rounded-r-sm" style={{ background: sideBtn, left: '-9px' }} />
      <div className="absolute top-32 w-1 h-8 rounded-r-sm" style={{ background: sideBtn, left: '-9px' }} />
      </div>
    </div>
  )
}

/* ─── Count-up hook ─────────────────────────────────────────────────────── */

function useCountUp(target: number, started: boolean, duration = 1500) {
  const [count, setCount] = useState(0)
  const rafRef = useRef<number>(0)

  const run = useCallback(() => {
    let startTs: number | null = null
    const tick = (ts: number) => {
      if (!startTs) startTs = ts
      const elapsed = ts - startTs
      const progress = Math.min(elapsed / duration, 1)
      /* ease-out expo: fast start, slow finish */
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setCount(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  useEffect(() => {
    if (!started) return
    return run()
  }, [started, run])

  return count
}

/* ─── Stat counter ──────────────────────────────────────────────────────── */

function StatCounter({ value, suffix, label, delay = 0 }: { value: number; suffix: string; label: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)
  const [done, setDone] = useState(false)
  const count = useCountUp(value, started, 1500)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible')
          setStarted(true)
          obs.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  /* glow fires when counter lands on final value */
  useEffect(() => {
    if (!started) return
    const t = setTimeout(() => setDone(true), 1600)
    return () => clearTimeout(t)
  }, [started])

  return (
    <div
      ref={ref}
      className="pp-reveal pp-stat text-center"
      style={{ transitionDelay: `${delay}ms` } as React.CSSProperties}
    >
      <div className="flex items-end justify-center gap-0.5 leading-none mb-3">
        <span
          className="font-display font-bold text-[var(--pp-ink)] tabular-nums"
          style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', minWidth: '1ch' }}
        >
          {count}
        </span>
        <span
          className="font-display font-bold text-[var(--pp-pos)]"
          style={{
            fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
            paddingBottom: '0.1em',
            transition: 'text-shadow 0.5s ease',
            textShadow: done ? '0 0 20px rgba(16,185,129,0.75)' : 'none',
          }}
        >
          {suffix}
        </span>
      </div>

      {/* underline draws in after reveal */}
      <div className="relative mx-auto mb-2.5" style={{ width: 'clamp(2rem,5vw,3rem)', height: '2px' }}>
        <div
          className="absolute inset-0 rounded-full bg-[var(--pp-pos-btn)]"
          style={{
            transform: started ? 'scaleX(1)' : 'scaleX(0)',
            transformOrigin: 'left',
            transition: `transform 0.55s cubic-bezier(0.16,1,0.3,1) ${delay + 250}ms`,
          }}
        />
      </div>

      <div className="text-sm text-[var(--pp-muted)] tracking-wide uppercase font-semibold" style={{ letterSpacing: '0.1em', fontSize: '0.7rem' }}>
        {label}
      </div>
    </div>
  )
}

/* ─── Feature card ──────────────────────────────────────────────────────── */

function FeatureCard({ f, delay }: { f: FeatureItem; delay: number }) {
  const ref = useReveal()
  const [hovered, setHovered] = useState(false)
  return (
    <div
      ref={ref}
      className="pp-reveal p-7 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        transitionDelay: `${delay}ms`,
        background: 'var(--pp-bg2)',
        boxShadow: hovered ? `inset 0 0 0 1px ${f.color}55` : `inset 0 2px 0 ${f.color}55`,
        transition: 'box-shadow 0.2s ease, background 0.2s ease',
      } as React.CSSProperties}
    >
      <div className="flex items-start justify-between mb-5">
        <span className="text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: f.color }}>{f.n}</span>
        <span
          className="w-2 h-2 rounded-full transition-opacity"
          style={{ background: f.color, opacity: hovered ? 1 : 0.5 }}
        />
      </div>
      <h3 className="font-display font-bold text-[var(--pp-ink)] text-lg mb-2.5">{f.title}</h3>
      <p className="text-sm text-[var(--pp-muted)] leading-relaxed">{f.description}</p>
    </div>
  )
}

/* ─── Step row ───────────────────────────────────────────────────────────── */

function StepCard({ s, delay, isLast }: { s: StepItem; delay: number; isLast: boolean }) {
  const t = useTranslations('landing.how')
  const ref = useReveal()
  const [hovered, setHovered] = useState(false)
  return (
    <div
      ref={ref}
      className="pp-reveal relative"
      style={{ transitionDelay: `${delay}ms` } as React.CSSProperties}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex gap-6 md:gap-10 items-start rounded-2xl p-6 md:p-8"
        style={{
          background: hovered ? 'var(--pp-bg)' : 'transparent',
          border: `1px solid ${hovered ? 'rgba(16,185,129,0.25)' : 'transparent'}`,
          transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
          boxShadow: hovered ? '0 8px 32px rgba(16,185,129,0.08)' : 'none',
        }}
      >
        {/* Left: big number + vertical line */}
        <div className="flex flex-col items-center shrink-0" style={{ width: 56 }}>
          <div
            className="font-display font-bold leading-none select-none"
            style={{
              fontSize: 'clamp(3rem, 7vw, 4.5rem)',
              color: hovered ? '#10b981' : 'var(--pp-line)',
              transition: 'color 0.3s ease',
              lineHeight: 1,
            }}
          >
            {s.n}
          </div>
          {!isLast && (
            <div
              className="mt-3 w-px flex-1"
              style={{
                minHeight: 48,
                background: hovered
                  ? 'linear-gradient(to bottom, rgba(16,185,129,0.5), rgba(16,185,129,0.05))'
                  : 'linear-gradient(to bottom, var(--pp-line), transparent)',
                transition: 'background 0.3s ease',
              }}
            />
          )}
        </div>

        {/* Right: icon + content */}
        <div className="flex-1 pt-1">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{
              background: hovered ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.06)',
              border: `1px solid ${hovered ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.1)'}`,
              color: '#10b981',
              transform: hovered ? 'scale(1.08) rotate(-3deg)' : 'scale(1) rotate(0)',
              transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            {s.icon}
          </div>
          <h3
            className="font-display font-bold text-[var(--pp-ink)] mb-2"
            style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)' }}
          >
            {s.title}
          </h3>
          <p className="text-sm text-[var(--pp-muted)] leading-relaxed">{s.description}</p>
          {hovered && (
            <div
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#10b981]"
              style={{ animation: 'fadeIn 0.2s ease' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8M9 5l2 2-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t('stepCta')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Pricing card ───────────────────────────────────────────────────────── */

function AnimatedPriceBlock({ price, annual, annualTotal, annualSavings }: {
  price: number; annual: boolean; annualTotal?: number | null; annualSavings?: number | null
}) {
  const t = useTranslations('landing.pricing')
  const locale = useLocale()
  const displayed = useAnimatedNumber(price)
  return (
    <div className="mb-1">
      <div className="flex items-end gap-1">
        <span className="font-display font-bold text-[var(--pp-ink)] tabular-nums" style={{ fontSize: '2rem', lineHeight: 1 }}>
          {displayed.toLocaleString(BCP47[locale] ?? 'fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
        </span>
        <span className="text-xs text-[var(--pp-muted)] mb-1">{t('perMonth')}</span>
      </div>
      {annual && annualTotal && (
        <p className="text-xs text-[var(--pp-muted)] mt-0.5">
          {t('billed', { total: annualTotal, savings: annualSavings ?? 0 })}
        </p>
      )}
    </div>
  )
}

function PricingCard({ tier, annual, delay }: { tier: TierItem; annual: boolean; delay: number }) {
  const t = useTranslations('landing.pricing')
  const ref = useReveal()
  const [hovered, setHovered] = useState(false)
  const price = annual ? tier.annualPrice : tier.monthlyPrice
  const href = annual ? tier.buttonHrefAnnual : tier.buttonHref
  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={[
        'pp-reveal rounded-2xl border flex flex-col relative overflow-hidden bg-[var(--pp-bg)]',
        tier.highlight ? 'border-[var(--pp-pos)]' : 'border-[var(--pp-line)]',
      ].join(' ')}
      style={{
        transitionDelay: `${delay}ms`,
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease, border-color 0.3s ease',
        boxShadow: hovered
          ? tier.highlight
            ? '0 20px 50px rgba(16,185,129,0.25), 0 0 0 1px rgba(16,185,129,0.6)'
            : '0 20px 50px rgba(0,0,0,0.12), 0 0 0 1px rgba(16,185,129,0.4)'
          : tier.highlight
            ? '0 0 0 1px rgba(16,185,129,0.5)'
            : 'none',
        borderColor: hovered ? 'rgba(16,185,129,0.6)' : undefined,
      } as React.CSSProperties}
    >
      {tier.highlight && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--pp-pos)] to-transparent" />
      )}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-5">
          <h3 className="font-display font-bold text-[var(--pp-ink)] text-xl">{tier.name}</h3>
          {tier.highlight && (
            <span className="text-[9px] bg-[var(--pp-pos-btn)] text-white font-bold px-2 py-1 rounded-full tracking-widest">{t('popular')}</span>
          )}
        </div>
        {price === null ? (
          <div className="mb-1">
            <span className="font-display font-bold text-[var(--pp-pos)]" style={{ fontSize: '2rem' }}>{t('quote')}</span>
          </div>
        ) : price === 0 ? (
          <div className="mb-1">
            <span className="font-display font-bold text-[var(--pp-pos)]" style={{ fontSize: '2rem' }}>{t('free')}</span>
          </div>
        ) : (
          <AnimatedPriceBlock price={price} annual={annual} annualTotal={tier.annualTotal} annualSavings={tier.annualSavings} />
        )}
        <p className="text-xs text-[var(--pp-muted)] mt-1">{tier.limit}</p>
        {tier.extraSeat && (
          <p className="text-xs text-[var(--pp-muted)]">{t('seatExtra', { price: tier.extraSeat })}</p>
        )}
      </div>
      <div className="px-6 pb-4">
        <a href={href} className="block w-full">
          <button
            className="w-full py-3 rounded-xl text-sm font-bold tracking-wide"
            style={{
              transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
              transform: hovered ? 'scale(1.03)' : 'scale(1)',
              ...(tier.highlight
                ? {
                    background: '#10b981',
                    color: '#fff',
                    boxShadow: hovered ? '0 6px 20px rgba(16,185,129,0.45)' : '0 2px 8px rgba(16,185,129,0.2)',
                  }
                : {
                    border: `1px solid ${hovered ? 'rgba(16,185,129,0.6)' : 'var(--pp-line)'}`,
                    color: hovered ? '#10b981' : 'var(--pp-ink)',
                    background: hovered ? 'rgba(16,185,129,0.06)' : 'transparent',
                  }),
            }}
          >
            {tier.buttonText}
          </button>
        </a>
      </div>
      <div className="px-6 pb-6 border-t border-[var(--pp-line)] pt-5 flex-1">
        <ul className="space-y-2.5 mb-5">
          {tier.features.map(f => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--pp-muted)]">
              <svg className="w-4 h-4 shrink-0 mt-0.5 text-[var(--pp-pos)]" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" opacity="0.4"/>
                <path d="M5 8l2.5 2.5 3.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {f}
            </li>
          ))}
        </ul>
        <div className="border-t border-[var(--pp-line)] pt-4">
          <p className="text-[10px] font-bold text-[var(--pp-muted)] uppercase tracking-widest mb-3">{tier.includesLabel}</p>
          <ul className="space-y-2">
            {tier.includes.map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-[var(--pp-muted)]">
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-[var(--pp-pos)]" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/* ─── Testimonial card ───────────────────────────────────────────────────── */

function TestimonialCard({ item, delay }: { item: TestimonialItem; delay: number }) {
  const t = useTranslations('landing.testimonials')
  const ref = useReveal()
  return (
    <div
      ref={ref}
      className="pp-reveal rounded-2xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-7 flex flex-col gap-5"
      style={{ transitionDelay: `${delay}ms` } as React.CSSProperties}
    >
      {/* Stars */}
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} className="w-4 h-4 text-[#f59e0b]" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1l1.85 3.75 4.15.6-3 2.93.7 4.12L8 10.4l-3.7 1.95.7-4.13-3-2.92 4.15-.6z"/>
          </svg>
        ))}
      </div>
      {/* Quote */}
      <p className="text-sm text-[var(--pp-muted)] leading-relaxed flex-1">
        &ldquo;{item.quote}&rdquo;
      </p>
      {/* Footer */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ background: item.color }}
        >
          {item.initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--pp-ink)]">{item.name}</p>
          <p className="text-xs text-[var(--pp-muted)]">{item.role} · {item.company} · {item.location}</p>
        </div>
        <span
          className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${item.color}18`, color: item.color }}
        >
          {t('planLabel', { plan: item.plan })}
        </span>
      </div>
    </div>
  )
}

/* ─── Placeholder testimonial card ─────────────────────────────────────── */

function PlaceholderTestimonialCard({ delay }: { delay: number }) {
  const t = useTranslations('landing.testimonials')
  const ref = useReveal()
  return (
    <div
      ref={ref}
      className="pp-reveal rounded-2xl p-7 flex flex-col gap-5"
      style={{
        transitionDelay: `${delay}ms`,
        background: 'transparent',
        border: '1px dashed var(--pp-line)',
      } as React.CSSProperties}
    >
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} className="w-4 h-4 text-[var(--pp-line)]" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1l1.85 3.75 4.15.6-3 2.93.7 4.12L8 10.4l-3.7 1.95.7-4.13-3-2.92 4.15-.6z"/>
          </svg>
        ))}
      </div>
      <p className="text-sm text-[var(--pp-muted)] leading-relaxed flex-1 italic opacity-60">
        &ldquo;{t('placeholderQuote')}&rdquo;
      </p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center border border-dashed border-[var(--pp-line)]">
          <svg className="w-5 h-5 text-[var(--pp-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--pp-muted)] opacity-70">{t('placeholderCompany')}</p>
          <p className="text-xs text-[var(--pp-muted)] opacity-50">{t('placeholderLocation')}</p>
        </div>
      </div>
      <a
        href="mailto:contact@pointon.be"
        className="inline-flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl w-full transition-all"
        style={{ border: '1px solid var(--pp-line)', color: 'var(--pp-muted)' }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = '#10b981'; el.style.color = '#10b981' }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = 'var(--pp-line)'; el.style.color = 'var(--pp-muted)' }}
      >
        {t('placeholderCta')}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </a>
    </div>
  )
}

/* ─── CTA Countdown ─────────────────────────────────────────────────────── */

const LAW_DATE = new Date('2027-01-01T00:00:00')

function useCountdown() {
  const [parts, setParts] = useState({ d: 0, h: 0, m: 0, s: 0 })
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, LAW_DATE.getTime() - Date.now())
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setParts({ d, h, m, s })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return parts
}

function CountUnit({ value, label, pad = 2 }: { value: number; label: string; pad?: number }) {
  const [prev, setPrev] = useState(value)
  const [flip, setFlip] = useState(false)
  useEffect(() => {
    if (value !== prev) { setFlip(true); setTimeout(() => { setPrev(value); setFlip(false) }, 200) }
  }, [value, prev])
  return (
    <div className="flex flex-col items-center">
      <div
        className="font-mono font-bold leading-none tabular-nums"
        style={{
          fontSize: 'clamp(1.8rem, 8vw, 5.5rem)',
          color: '#10b981',
          transform: flip ? 'translateY(-6px)' : 'translateY(0)',
          opacity: flip ? 0 : 1,
          transition: 'transform 0.2s ease, opacity 0.2s ease',
          letterSpacing: '-0.03em',
        }}
      >
        {String(prev).padStart(pad, '0')}
      </div>
      <span
        className="font-bold uppercase tracking-[0.15em] mt-2"
        style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)' }}
      >
        {label}
      </span>
    </div>
  )
}

function CtaCountdown() {
  const t = useTranslations('landing.ctaSection')
  const { d, h, m, s } = useCountdown()
  return (
    <section
      className="border-b border-[var(--pp-line)] relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #060b14 0%, #0a1a11 100%)' }}
    >
      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(16,185,129,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      {/* Green glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: 'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(16,185,129,0.12) 0%, transparent 70%)' }}
      />

      <div className="relative mx-auto max-w-4xl px-4 py-20 md:py-28 text-center">
        {/* Label */}
        <div className="inline-flex items-center gap-3 mb-10">
          <span className="w-8 h-px" style={{ background: 'rgba(16,185,129,0.5)' }} />
          <span
            className="font-bold tracking-[0.22em] uppercase"
            style={{ fontSize: '0.65rem', color: '#10b981' }}
          >
            {t('lawLabel')}
          </span>
          <span className="w-8 h-px" style={{ background: 'rgba(16,185,129,0.5)' }} />
        </div>

        {/* Countdown */}
        <div className="flex items-start justify-center gap-2 sm:gap-6 md:gap-10 mb-4">
          <CountUnit value={d} label={t('unitDays')} pad={3} />
          <span className="font-mono font-bold text-[#10b981] self-start mt-2" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', opacity: 0.4 }}>:</span>
          <CountUnit value={h} label={t('unitHours')} />
          <span className="font-mono font-bold text-[#10b981] self-start mt-2" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', opacity: 0.4 }}>:</span>
          <CountUnit value={m} label={t('unitMinutes')} />
          <span className="font-mono font-bold text-[#10b981] self-start mt-2" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', opacity: 0.4 }}>:</span>
          <CountUnit value={s} label={t('unitSeconds')} />
        </div>

        {/* Progress bar */}
        <div className="mx-auto max-w-xs mb-12 mt-4">
          <div className="h-px w-full rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              suppressHydrationWarning
              className="h-px rounded-full"
              style={{
                width: `${Math.min(100, ((Date.now() - new Date('2024-01-01').getTime()) / (LAW_DATE.getTime() - new Date('2024-01-01').getTime())) * 100).toFixed(1)}%`,
                background: 'linear-gradient(90deg, rgba(16,185,129,0.4), #10b981)',
                boxShadow: '0 0 8px rgba(16,185,129,0.6)',
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em' }}>2024</span>
            <span style={{ fontSize: '0.6rem', color: 'rgba(16,185,129,0.5)', letterSpacing: '0.05em' }}>2027</span>
          </div>
        </div>

        {/* Headline */}
        <h2
          className="font-display font-bold text-white leading-tight mb-4"
          style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3rem)' }}
        >
          {t('headline')}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1rem', marginBottom: '2.5rem' }}>
          {t('subtitle')}
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/signup">
            <Button size="lg">{t('ctaPrimary')}</Button>
          </Link>
          <a href="mailto:contact@pointon.be">
            <button
              className="px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', background: 'transparent' }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'rgba(255,255,255,0.35)'; b.style.color = 'rgba(255,255,255,0.95)' }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'rgba(255,255,255,0.15)'; b.style.color = 'rgba(255,255,255,0.7)' }}
            >
              {t('ctaSecondary')}
            </button>
          </a>
        </div>
      </div>
    </section>
  )
}

/* ─── FAQ item ──────────────────────────────────────────────────────────── */

function FaqItem({ q, a, n }: { q: string; a: string; n: string }) {
  const [open, setOpen] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  return (
    <div
      className="group"
      style={{
        borderBottom: '1px solid var(--pp-line)',
        transition: 'background 0.2s',
      }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-5 py-6 text-left"
      >
        {/* Number */}
        <span
          className="shrink-0 font-mono text-[11px] font-bold tracking-widest transition-colors duration-200"
          style={{ color: open ? '#10b981' : 'var(--pp-muted)', minWidth: '2rem' }}
        >
          {n}
        </span>

        {/* Question */}
        <span
          className="flex-1 font-display font-semibold text-base leading-snug transition-colors duration-200"
          style={{ color: open ? 'var(--pp-ink)' : 'var(--pp-ink)', opacity: open ? 1 : 0.85 }}
        >
          {q}
        </span>

        {/* Icon */}
        <span
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
          style={{
            background: open ? '#10b981' : 'var(--pp-line)',
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2 6h8" stroke={open ? '#fff' : 'var(--pp-muted)'} strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </span>
      </button>

      {/* Answer — smooth height animation */}
      <div
        ref={bodyRef}
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.35s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="pb-6 pl-[3.25rem] pr-10 text-[var(--pp-muted)] leading-relaxed text-sm">
            {a}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Pointing method card ──────────────────────────────────────────────── */

function PointingMethodCard({ m, delay }: { m: MethodItem; delay: number }) {
  const t = useTranslations('landing.methods')
  const ref = useReveal()
  const [hovered, setHovered] = useState(false)
  return (
    <div
      ref={ref}
      className="pp-reveal rounded-2xl p-6 flex flex-col gap-4"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        transitionDelay: `${delay}ms`,
        background: 'var(--pp-bg)',
        border: `1px solid ${hovered ? m.color + '55' : 'var(--pp-line)'}`,
        boxShadow: hovered ? `0 12px 32px ${m.color}14` : 'none',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      } as React.CSSProperties}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{
          background: hovered ? `${m.color}18` : `${m.color}10`,
          border: `1px solid ${m.color}30`,
          color: m.color,
          transition: 'background 0.2s ease, transform 0.2s ease',
          transform: hovered ? 'scale(1.08)' : 'scale(1)',
        }}
      >
        {m.icon}
      </div>
      <div className="flex-1">
        <h3 className="font-display font-bold text-[var(--pp-ink)] text-base mb-1.5">{m.title}</h3>
        <p className="text-sm text-[var(--pp-muted)] leading-relaxed">{m.description}</p>
      </div>
      {m.hasSub && (
        <div
          className="mt-auto pt-4"
          style={{ borderTop: `1px solid ${m.color}25` }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <svg width="10" height="10" viewBox="0 0 10 10" fill={m.color}>
              <path d="M5 0l1.12 3.45H9.51L6.69 5.59l1.07 3.32L5 7l-2.76 1.91 1.07-3.32L.49 3.45H3.88z"/>
            </svg>
            <span className="text-[11px] font-bold" style={{ color: m.color }}>{t('kioskSubLabel')}</span>
          </div>
          <p className="text-xs text-[var(--pp-muted)] leading-relaxed">{t('kioskSubDetail')}</p>
        </div>
      )}
    </div>
  )
}

/* ─── Section label ─────────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-[var(--pp-pos)] mb-5">
      <span className="w-5 h-px bg-[var(--pp-pos-btn)]" />
      <span className="text-[11px] font-bold tracking-[0.18em] uppercase">{children}</span>
    </div>
  )
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function Home() {
  const t = useTranslations('landing')
  const [annual, setAnnual] = useState(false)

  /* Merge visual config with translated text */
  const statLabels = t.raw('stats') as string[]
  const stats = statsConfig.map((c, i) => ({ ...c, label: statLabels[i] }))

  const fItems = t.raw('features.items') as { title: string; description: string }[]
  const features: FeatureItem[] = featuresConfig.map((c, i) => ({ ...c, ...fItems[i] }))

  const mItems = t.raw('methods.items') as { title: string; description: string }[]
  const methods: MethodItem[] = pointingMethodsConfig.map((c, i) => ({ ...c, ...mItems[i] }))

  const sItems = t.raw('how.steps') as { title: string; description: string }[]
  const steps: StepItem[] = stepsConfig.map((c, i) => ({ ...c, ...sItems[i] }))

  const tItems = t.raw('testimonials.items') as { quote: string; role: string }[]
  const testimonials: TestimonialItem[] = testimonialsConfig.map((c, i) => ({ ...c, ...tItems[i] }))

  const trTiers = t.raw('pricing.tiers') as { limit: string; buttonText: string; includesLabel: string; features: string[]; includes: string[] }[]
  const tiers: TierItem[] = pricingConfig.map((c, i) => ({ ...c, ...trTiers[i] }))

  const faqs = t.raw('faq.items') as FaqEntry[]

  /* FAQ structured data (per-locale, SEO) */
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <div className="min-h-screen bg-[var(--pp-bg)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Header />

      <main>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1a14 100%)' }}
      >
        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(16,185,129,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(16,185,129,0.04) 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px',
          }}
        />
        {/* Glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(ellipse 80% 60% at 70% 50%, rgba(16,185,129,0.09) 0%, transparent 60%)`,
          }}
        />

        <div className="relative w-full mx-auto max-w-6xl px-4 pt-28 pb-20 md:pt-36 md:pb-28">
          <div className="grid md:grid-cols-2 gap-12 md:gap-8 items-center">
            {/* Left */}
            <div>
              <div className="mb-6">
                <Logo size="hero" dark />
              </div>
              <div className="inline-flex items-center gap-2 mb-6">
                <span className="w-5 h-px bg-[#10b981]" />
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#10b981]">
                  {t('badge')}
                </span>
              </div>

              <h1
                className="font-display font-bold text-white leading-[0.95] mb-7"
                style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)' }}
                aria-label={`${t('hero.line1')} ${t('hero.line2')} ${t('hero.line3')}`}
              >
                {t('hero.line1')}<br />
                <span style={{ color: '#10b981' }}>{t('hero.line2')}</span><br />
                {t('hero.line3')}
              </h1>

              <p className="text-white/60 mb-8 leading-relaxed max-w-md" style={{ fontSize: '1.1rem' }}>
                {t('hero.subtitle')}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <Link href="/signup">
                  <Button size="lg" className="w-full sm:w-auto">{t('hero.ctaPrimary')}</Button>
                </Link>
                <a href="#how">
                  <button
                    className="px-6 py-3 rounded-xl text-sm font-bold tracking-wide w-full sm:w-auto transition-all"
                    style={{
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: 'rgba(255,255,255,0.7)',
                      background: 'transparent',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.35)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.95)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)' }}
                  >
                    {t('hero.ctaSecondary')}
                  </button>
                </a>
              </div>

              <p className="text-[11px] text-white/30 tracking-wide uppercase" style={{ letterSpacing: '0.1em' }}>
                {t('hero.legal')}
              </p>
            </div>

            {/* Right — live clock widget */}
            <div className="relative flex justify-center">
              <HeroClockWidget />
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-24"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--pp-bg))' }}
        />
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <section className="border-b border-[var(--pp-line)] py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-6">
            {stats.map((s, i) => (
              <StatCounter key={s.label} value={s.value} suffix={s.suffix} label={s.label} delay={i * 120} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo video ───────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 border-b border-[var(--pp-line)]">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-12">
            <SectionLabel>{t('demo.label')}</SectionLabel>
            <h2
              className="font-display font-bold text-[var(--pp-ink)] leading-tight"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)' }}
            >
              {t('demo.title')}
            </h2>
            <p className="text-[var(--pp-muted)] mt-3">{t('demo.subtitle')}</p>
          </div>
          <div
            className="rounded-2xl overflow-hidden border border-[var(--pp-line)]"
            style={{ boxShadow: '0 32px 80px rgba(16,185,129,0.10), 0 0 0 1px var(--pp-line)' }}
          >
            <ThemeVideo style={{ aspectRatio: '16/9' }} />
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 md:py-28 border-b border-[var(--pp-line)]">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-14">
            <SectionLabel>{t('features.label')}</SectionLabel>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <h2
                className="font-display font-bold text-[var(--pp-ink)] leading-tight"
                style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)' }}
              >
                {t('features.title1')}<br />{t('features.title2')}
              </h2>
              <p className="text-[var(--pp-muted)] max-w-sm md:text-right">
                {t('features.intro')}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--pp-line)] rounded-2xl overflow-hidden border border-[var(--pp-line)]">
            {features.map((f, i) => (
              <FeatureCard key={f.title} f={f} delay={(i % 3) * 60} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Méthodes de pointage ─────────────────────────────────────────── */}
      <section id="methods" className="py-20 md:py-28 border-b border-[var(--pp-line)]" style={{ background: 'var(--pp-bg2)' }}>
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <SectionLabel>{t('methods.label')}</SectionLabel>
            <h2
              className="font-display font-bold text-[var(--pp-ink)] leading-tight"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)' }}
            >
              {t('methods.title1')}<br />{t('methods.title2')}
            </h2>
            <p className="text-[var(--pp-muted)] mt-3 max-w-md mx-auto">{t('methods.intro')}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {methods.map((m, i) => (
              <PointingMethodCard key={m.title} m={m} delay={i * 80} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 border-b border-[var(--pp-line)]">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <SectionLabel>{t('testimonials.label')}</SectionLabel>
            <h2
              className="font-display font-bold text-[var(--pp-ink)] leading-tight"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)' }}
            >
              {t('testimonials.title1')}<br />{t('testimonials.title2')}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((item, i) => (
              <TestimonialCard key={item.name} item={item} delay={i * 80} />
            ))}
            <PlaceholderTestimonialCard delay={testimonials.length * 80} />
          </div>
          <p className="text-center text-xs text-[var(--pp-muted)] mt-6">
            {t('testimonials.disclaimer1')}
          </p>
          <p className="text-center text-xs text-[var(--pp-muted)] mt-1">
            {t('testimonials.disclaimer2')}
          </p>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section
        id="how"
        className="py-20 md:py-28 border-b border-[var(--pp-line)] relative overflow-hidden"
        style={{ background: 'var(--pp-bg2)' }}
      >
        {/* Decorative background text */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-end pr-8 md:pr-16 select-none"
          aria-hidden="true"
        >
          <span
            className="font-display font-bold uppercase leading-none"
            style={{
              fontSize: 'clamp(8rem, 22vw, 18rem)',
              color: 'var(--pp-line)',
              opacity: 0.35,
              letterSpacing: '-0.04em',
            }}
          >
            HOW
          </span>
        </div>

        <div className="relative mx-auto max-w-5xl px-4">
          <div className="grid md:grid-cols-[1fr_1.4fr] gap-12 md:gap-20 items-start">
            {/* Left: sticky heading */}
            <div className="md:sticky md:top-28">
              <SectionLabel>{t('how.label')}</SectionLabel>
              <h2
                className="font-display font-bold text-[var(--pp-ink)] leading-tight mt-4 mb-5"
                style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)' }}
              >
                {t('how.title1')}<br />{t('how.title2')}
              </h2>
              <p className="text-[var(--pp-muted)] leading-relaxed mb-8" style={{ fontSize: '0.95rem' }}>
                {t('how.intro')}
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#10b981] group"
              >
                <span>{t('how.cta')}</span>
                <span
                  className="inline-block transition-transform group-hover:translate-x-1"
                  style={{ transition: 'transform 0.2s ease' }}
                >→</span>
              </Link>
            </div>

            {/* Right: steps */}
            <div className="space-y-2">
              {steps.map((s, i) => (
                <StepCard key={s.n} s={s} delay={i * 120} isLast={i === steps.length - 1} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 md:py-28 border-b border-[var(--pp-line)] relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 70%)' }}
        />
        <div className="relative mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <SectionLabel>{t('pricing.label')}</SectionLabel>
            <h2
              className="font-display font-bold text-[var(--pp-ink)] leading-tight mb-3"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)' }}
            >
              {t('pricing.title')}
            </h2>
            <p className="text-[var(--pp-muted)] mb-1">{t('pricing.subtitle')}</p>
            <p className="text-xs text-[var(--pp-muted)] mb-8">{t('pricing.vat')}</p>

            <div className="flex justify-center">
              <div className="relative flex bg-[var(--pp-line)]/60 border border-[var(--pp-line)] rounded-full p-1">
                <span
                  className="absolute top-1 bottom-1 rounded-full bg-[var(--pp-bg)] shadow transition-all duration-300"
                  style={{ left: annual ? '50%' : '4px', right: annual ? '4px' : '50%' }}
                />
                <button
                  onClick={() => setAnnual(false)}
                  className={`relative z-10 px-5 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${!annual ? 'text-[var(--pp-ink)]' : 'text-[var(--pp-muted)]'}`}
                >
                  {t('pricing.monthly')}
                </button>
                <button
                  onClick={() => setAnnual(true)}
                  className={`relative z-10 px-5 py-2 rounded-full text-sm font-semibold transition-colors duration-200 flex items-center gap-2 ${annual ? 'text-[var(--pp-ink)]' : 'text-[var(--pp-muted)]'}`}
                >
                  {t('pricing.annual')}
                  <span className="text-[10px] bg-[var(--pp-pos-btn)] text-white px-1.5 py-0.5 rounded-full font-bold leading-none">{t('pricing.saveBadge')}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {tiers.map((tier, i) => (
              <PricingCard key={tier.name} tier={tier} annual={annual} delay={i * 70} />
            ))}
          </div>

          {!annual && (
            <p className="text-center text-sm text-[var(--pp-muted)] mt-8">
              {t('pricing.annualHintPre')}
              <button onClick={() => setAnnual(true)} className="text-[var(--pp-pos)] font-semibold underline underline-offset-2 hover:opacity-80">
                {t('pricing.annualHintLink')}
              </button>
            </p>
          )}
          {annual && (
            <p className="text-center text-sm text-[var(--pp-pos)] font-medium mt-8">
              {t('pricing.annualSavings')}
            </p>
          )}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 md:py-28 border-b border-[var(--pp-line)]" style={{ background: 'var(--pp-bg2)' }}>
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid md:grid-cols-[1fr_2fr] gap-12 md:gap-20 items-start">
            {/* Left — sticky heading */}
            <div className="md:sticky md:top-28">
              <SectionLabel>{t('faq.label')}</SectionLabel>
              <h2
                className="font-display font-bold text-[var(--pp-ink)] leading-tight mb-4"
                style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)' }}
              >
                {t('faq.title1')}<br />{t('faq.title2')}
              </h2>
              <p className="text-sm text-[var(--pp-muted)] leading-relaxed mb-6">
                {t('faq.intro')}
              </p>
              <a
                href="mailto:contact@pointon.be"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--pp-pos)] hover:gap-3 transition-all duration-200"
              >
                {t('faq.cta')}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>

            {/* Right — accordion */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'var(--pp-bg)',
                border: '1px solid var(--pp-line)',
                padding: '0 1.5rem',
              }}
            >
              {faqs.map((faq, i) => (
                <FaqItem
                  key={i}
                  q={faq.q}
                  a={faq.a}
                  n={String(i + 1).padStart(2, '0')}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA final ────────────────────────────────────────────────────── */}
      <CtaCountdown />

      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="py-14 bg-[var(--pp-bg)]">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="mb-3">
                <Logo size="md" useThemeVar />
              </div>
              <p className="text-sm text-[var(--pp-muted)] leading-relaxed max-w-xs">
                {t('footer.tagline')}
              </p>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-[var(--pp-ink)] uppercase tracking-[0.15em] mb-4">{t('footer.colProduct')}</h3>
              <ul className="space-y-2.5 text-sm text-[var(--pp-muted)]">
                <li><a href="#features" className="hover:text-[var(--pp-ink)] transition-colors">{t('footer.linkFeatures')}</a></li>
                <li><a href="#pricing" className="hover:text-[var(--pp-ink)] transition-colors">{t('footer.linkPricing')}</a></li>
                <li><a href="#faq" className="hover:text-[var(--pp-ink)] transition-colors">{t('footer.linkFaq')}</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-[var(--pp-ink)] uppercase tracking-[0.15em] mb-4">{t('footer.colLegal')}</h3>
              <ul className="space-y-2.5 text-sm text-[var(--pp-muted)]">
                <li><Link href="/legal/privacy" className="hover:text-[var(--pp-ink)] transition-colors">{t('footer.linkPrivacy')}</Link></li>
                <li><Link href="/legal/terms" className="hover:text-[var(--pp-ink)] transition-colors">{t('footer.linkTerms')}</Link></li>
                <li><Link href="/legal/compliance" className="hover:text-[var(--pp-ink)] transition-colors">{t('footer.linkCompliance')}</Link></li>
                <li><Link href="/legal/security" className="hover:text-[var(--pp-ink)] transition-colors">{t('footer.linkSecurity')}</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-[var(--pp-ink)] uppercase tracking-[0.15em] mb-4">{t('footer.colResources')}</h3>
              <ul className="space-y-2.5 text-sm text-[var(--pp-muted)]">
                <li><a href="mailto:support@pointon.be" className="hover:text-[var(--pp-ink)] transition-colors">{t('footer.linkSupport')}</a></li>
                <li><a href="mailto:contact@pointon.be" className="hover:text-[var(--pp-ink)] transition-colors">{t('footer.linkContact')}</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[var(--pp-line)] flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[var(--pp-muted)]">
            <span>{t('footer.copyright')}</span>
            <span className="tracking-wide">{t('footer.compliance')}</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
