'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import NumberFlow from '@number-flow/react'
import { Header } from '@/components/Header'
import { Button } from '@/components/Button'
import { ThemeVideo } from '@/components/ThemeVideo'

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

/* ─── Data ─────────────────────────────────────────────────────────────── */

const stats = [
  { value: 500, suffix: '+', label: 'PME belges' },
  { value: 2, suffix: ' min', label: 'Setup moyen' },
  { value: 100, suffix: '%', label: 'Conforme CJUE' },
  { value: 0, suffix: '€', label: 'Pour commencer' },
]

const features = [
  {
    n: '01',
    color: '#10b981',
    title: 'Pointage en 1 tap',
    description: 'ARRIVÉE / DÉPART en un geste. Fonctionne sur smartphone, tablette et PC sans formation.',
  },
  {
    n: '02',
    color: '#f59e0b',
    title: 'Conforme loi 2027',
    description: 'Enregistrement objectif, audit trail immuable et export certifié. Prêt pour inspection légale.',
  },
  {
    n: '03',
    color: '#0ea5e9',
    title: 'Mobile-first',
    description: 'Interface pensée pour le smartphone. Rapide, fluide, installable comme une app native.',
  },
  {
    n: '04',
    color: '#fb923c',
    title: 'Alertes intelligentes',
    description: "Rappel fin de journée, détection d'heures supplémentaires, notifications temps réel.",
  },
  {
    n: '05',
    color: '#6366f1',
    title: 'Rapports & exports',
    description: 'CSV et PDF signés numériquement. Export planifié hebdomadaire ou mensuel inclus.',
  },
  {
    n: '06',
    color: '#8b5cf6',
    title: "Gestion d'équipes",
    description: 'Managers, sites, congés, RTT — tout centralisé pour les RH et les administrateurs.',
  },
]

const steps = [
  {
    n: '01',
    title: 'Créez votre compte',
    description: 'Inscrivez-vous en 2 minutes. Pas de carte bancaire requise pour le plan gratuit.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
      </svg>
    ),
  },
  {
    n: '02',
    title: 'Invitez vos employés',
    description: 'Ajoutez vos équipes et assignez les sites. Chaque membre reçoit accès immédiatement.',
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
    title: 'Pointez & exportez',
    description: 'Vos employés pointent sur téléphone, tablette ou ordinateur. Vous exportez les rapports en un clic.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14.5"/>
      </svg>
    ),
  },
]

const pricingTiers = [
  {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    limit: '1 admin · 3 employés',
    buttonText: 'Commencer gratuitement',
    buttonHref: '/login',
    buttonHrefAnnual: '/login',
    highlight: false,
    features: ['Pointage mobile (PWA)', 'Export CSV 1×/mois', 'Rapports basiques'],
    includes: ['Audit trail immuable', 'Multi-appareils', 'Authentification sécurisée'],
    includesLabel: 'Inclus :',
  },
  {
    name: 'Solo',
    monthlyPrice: 49,
    annualPrice: 39,
    limit: '1 admin · 10 employés',
    buttonText: 'Choisir Solo',
    buttonHref: '/api/stripe/checkout?plan=solo&billing=monthly',
    buttonHrefAnnual: '/api/stripe/checkout?plan=solo&billing=annual',
    highlight: false,
    features: ['Export CSV/PDF illimité', 'Rapports avancés', 'Notifications email'],
    includes: ['Support email', 'Heures supp automatiques', 'Congés & RTT'],
    includesLabel: 'Tout Free inclus :',
  },
  {
    name: 'Team',
    monthlyPrice: 99,
    annualPrice: 79,
    limit: '5 managers · 50 employés',
    buttonText: 'Choisir Team',
    buttonHref: '/api/stripe/checkout?plan=team&billing=monthly',
    buttonHrefAnnual: '/api/stripe/checkout?plan=team&billing=annual',
    highlight: true,
    features: ["Gestion d'équipes", 'Rôle Manager', 'Export planifié mensuel'],
    includes: ['Support prioritaire', 'Multi-sites', 'Dashboard manager'],
    includesLabel: 'Tout Solo inclus :',
  },
  {
    name: 'Enterprise',
    monthlyPrice: null,
    annualPrice: null,
    limit: 'Employés illimités',
    buttonText: 'Nous contacter',
    buttonHref: 'mailto:contact@ced-it.be',
    buttonHrefAnnual: 'mailto:contact@ced-it.be',
    highlight: false,
    features: ['Managers illimités', 'Export planifié hebdo', 'SLA garanti'],
    includes: ['Support dédié', 'Onboarding personnalisé', 'Contrat sur mesure'],
    includesLabel: 'Tout Team inclus :',
  },
]

const faqs = [
  {
    q: 'La solution est-elle conforme à la loi belge 2027?',
    a: 'Oui. PoinçOn respecte toutes les exigences légales belges et CJUE : enregistrement objectif, audit trail immuable, export certifié.',
  },
  {
    q: 'Comment sont stockées les données?',
    a: 'Données hébergées en EU (Vercel Postgres ou serveur auto-hébergé). Chiffrement HTTPS. RGPD compliant.',
  },
  {
    q: 'Puis-je exporter les données?',
    a: 'Oui. Export CSV/PDF signé numériquement pour inspection légale. Disponible sur tous les plans.',
  },
  {
    q: 'Quel est le délai de mise en place?',
    a: 'Setup en 5 minutes. Intégration : 15 min. Pointage immédiat après création de compte.',
  },
  {
    q: "Y a-t-il une période d'essai?",
    a: 'Plan Free illimité sans engagement. Essayez gratuitement, aucune carte requise.',
  },
  {
    q: 'Que se passe-t-il si je pointe hors ligne?',
    a: 'Votre pointage est sauvegardé localement et marqué "⏳ en attente de sync". Dès reconnexion, il synchronise automatiquement au serveur et devient officiel. Le tableau de présence ne compte que les pointages synchronisés.',
  },
]

/* ─── Hero clock widget (phone mockup) ──────────────────────────────────── */

function HeroClockWidget() {
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
      setTime(now.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setDate(now.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' }))
      const base = departureTime ?? now
      const diff = Math.max(0, Math.floor((base.getTime() - arrivalTime.getTime()) / 1000))
      const dh = Math.floor(diff / 3600).toString().padStart(2, '0')
      const dm = Math.floor((diff % 3600) / 60).toString().padStart(2, '0')
      const ds = (diff % 60).toString().padStart(2, '0')
      setDuration(`${dh}h${dm}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [arrivalTime, departureTime])

  function handleToggle() {
    if (clockedIn) {
      setDepartureTime(new Date())
      setClockedIn(false)
    } else {
      setDepartureTime(null)
      setClockedIn(true)
    }
  }

  const arrStr = arrivalTime.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
  const depStr = departureTime
    ? departureTime.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
    : null

  /* Theme tokens */
  const screen   = dark ? '#111827' : '#f0faf6'
  const ink      = dark ? 'rgba(249,250,251,1)' : 'rgba(0,0,0,0.85)'
  const muted    = dark ? 'rgba(156,163,175,1)' : 'rgba(0,0,0,0.4)'
  const divider  = dark ? 'rgba(55,65,81,1)' : 'rgba(0,0,0,0.08)'
  const bezel    = dark ? '#0d1117' : '#1a1a1a'
  const sideBtn  = dark ? '#060a10' : '#111'

  return (
    /* Phone shell */
    <div
      className="relative mx-auto select-none"
      style={{ width: 'min(280px, 80vw)', transition: 'all 0.3s ease' }}
    >
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
              <span className="text-[11px] font-semibold text-[#10b981]">Siège social</span>
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
              {clockedIn ? 'POINTER DÉPART ✕' : 'ARRIVÉE ✓'}
            </button>
          </div>

          {/* Today's session */}
          <div className="mx-5 mb-4">
            <div
              className="text-[9px] font-bold tracking-[0.18em] uppercase mb-3 flex items-center justify-between"
              style={{ color: muted }}
            >
              <span>Aujourd&apos;hui</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100/20 text-amber-600 font-semibold">⏳ en attente</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                  <span className="text-[12px] font-medium" style={{ color: ink }}>Arrivée</span>
                </div>
                <span className="font-mono text-[12px] font-semibold" style={{ color: ink }}>{arrStr}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: depStr ? '#ef4444' : 'transparent', border: depStr ? 'none' : `1px solid ${muted}` }}
                  />
                  <span className="text-[12px] font-medium" style={{ color: muted }}>Départ</span>
                </div>
                <span className="font-mono text-[12px]" style={{ color: muted }}>{depStr ?? '—'}</span>
              </div>
              {duration && (
                <div
                  className="flex justify-between items-center pt-2"
                  style={{ borderTop: `1px solid ${divider}` }}
                >
                  <span className="text-[12px] font-medium" style={{ color: muted }}>Durée</span>
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
  )
}

/* ─── Stat counter ──────────────────────────────────────────────────────── */

function StatCounter({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useReveal()
  const [started, setStarted] = useState(false)
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); obs.disconnect() } },
      { threshold: 0.5 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} className="pp-reveal text-center">
      <div ref={innerRef} className="flex items-end justify-center gap-0.5 leading-none mb-2">
        <span
          className="font-display font-bold text-[var(--pp-ink)]"
          style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)' }}
        >
          {started ? <NumberFlow value={value} /> : 0}
        </span>
        <span
          className="font-display font-bold text-[var(--pp-pos)]"
          style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', paddingBottom: '0.1em' }}
        >
          {suffix}
        </span>
      </div>
      <div className="text-sm text-[var(--pp-muted)] tracking-wide uppercase font-semibold" style={{ letterSpacing: '0.1em', fontSize: '0.7rem' }}>
        {label}
      </div>
    </div>
  )
}

/* ─── Feature card ──────────────────────────────────────────────────────── */

function FeatureCard({ f, delay }: { f: typeof features[0]; delay: number }) {
  const ref = useReveal()
  return (
    <div
      ref={ref}
      className="pp-reveal bg-[var(--pp-bg)] p-7 group transition-colors hover:bg-[var(--pp-bg2)]"
      style={{ transitionDelay: `${delay}ms` } as React.CSSProperties}
    >
      <div className="flex items-start justify-between mb-5">
        <span className="text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: f.color }}>{f.n}</span>
        <span className="w-2 h-2 rounded-full opacity-50 group-hover:opacity-100 transition-opacity" style={{ background: f.color }} />
      </div>
      <h3 className="font-display font-bold text-[var(--pp-ink)] text-lg mb-2.5">{f.title}</h3>
      <p className="text-sm text-[var(--pp-muted)] leading-relaxed">{f.description}</p>
    </div>
  )
}

/* ─── Step row ───────────────────────────────────────────────────────────── */

function StepCard({ s, delay, isLast }: { s: typeof steps[0]; delay: number; isLast: boolean }) {
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
              Commencer maintenant
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Pricing card ───────────────────────────────────────────────────────── */

function PricingCard({ tier, annual, delay }: { tier: typeof pricingTiers[0]; annual: boolean; delay: number }) {
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
            <span className="text-[9px] bg-[var(--pp-pos)] text-white font-bold px-2 py-1 rounded-full tracking-widest">POPULAIRE</span>
          )}
        </div>
        {price === null ? (
          <div className="mb-1">
            <span className="font-display font-bold text-[var(--pp-pos)]" style={{ fontSize: '2rem' }}>Devis</span>
          </div>
        ) : price === 0 ? (
          <div className="mb-1">
            <span className="font-display font-bold text-[var(--pp-pos)]" style={{ fontSize: '2rem' }}>Gratuit</span>
          </div>
        ) : (
          <div className="flex items-end gap-1 mb-1">
            <span className="font-display font-bold text-[var(--pp-ink)]" style={{ fontSize: '2rem', lineHeight: 1 }}>
              <NumberFlow value={price} />€
            </span>
            <span className="text-xs text-[var(--pp-muted)] mb-1">/mois HTVA</span>
          </div>
        )}
        <p className="text-xs text-[var(--pp-muted)] mt-1">{tier.limit}</p>
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

function CountUnit({ value, label }: { value: number; label: string }) {
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
          fontSize: 'clamp(2.8rem, 8vw, 5.5rem)',
          color: '#10b981',
          transform: flip ? 'translateY(-6px)' : 'translateY(0)',
          opacity: flip ? 0 : 1,
          transition: 'transform 0.2s ease, opacity 0.2s ease',
          letterSpacing: '-0.03em',
        }}
      >
        {String(prev).padStart(label === 'jours' ? 3 : 2, '0')}
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
            La loi belge entre en vigueur le 1er janvier 2027
          </span>
          <span className="w-8 h-px" style={{ background: 'rgba(16,185,129,0.5)' }} />
        </div>

        {/* Countdown */}
        <div className="flex items-start justify-center gap-6 md:gap-10 mb-4">
          <CountUnit value={d} label="jours" />
          <span className="font-mono font-bold text-[#10b981] self-start mt-2" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', opacity: 0.4 }}>:</span>
          <CountUnit value={h} label="heures" />
          <span className="font-mono font-bold text-[#10b981] self-start mt-2" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', opacity: 0.4 }}>:</span>
          <CountUnit value={m} label="minutes" />
          <span className="font-mono font-bold text-[#10b981] self-start mt-2" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', opacity: 0.4 }}>:</span>
          <CountUnit value={s} label="secondes" />
        </div>

        {/* Progress bar */}
        <div className="mx-auto max-w-xs mb-12 mt-4">
          <div className="h-px w-full rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
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
          Votre système est-il prêt ?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1rem', marginBottom: '2.5rem' }}>
          Aucune carte requise. Setup en 2 minutes. Conforme dès le premier pointage.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/login">
            <Button size="lg">Créer mon compte gratuit</Button>
          </Link>
          <a href="mailto:contact@ced-it.be">
            <button
              className="px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', background: 'transparent' }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'rgba(255,255,255,0.35)'; b.style.color = 'rgba(255,255,255,0.95)' }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'rgba(255,255,255,0.15)'; b.style.color = 'rgba(255,255,255,0.7)' }}
            >
              Parler à un expert
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

/* ─── Section label ─────────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-[var(--pp-pos)] mb-5">
      <span className="w-5 h-px bg-[var(--pp-pos)]" />
      <span className="text-[11px] font-bold tracking-[0.18em] uppercase">{children}</span>
    </div>
  )
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function Home() {
  const [annual, setAnnual] = useState(false)

  return (
    <div className="min-h-screen bg-[var(--pp-bg)]">
      <Header />

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
              <div className="inline-flex items-center gap-2 mb-6">
                <span className="w-5 h-px bg-[#10b981]" />
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#10b981]">
                  Conformité Belgique 2027
                </span>
              </div>

              <h1
                className="font-display font-bold text-white leading-[0.95] mb-7"
                style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)' }}
              >
                Pointeuse<br />
                <span style={{ color: '#10b981' }}>légale.</span><br />
                Belge.
              </h1>

              <p className="text-white/60 mb-8 leading-relaxed max-w-md" style={{ fontSize: '1.1rem' }}>
                Enregistrez le temps de travail légalement en Belgique. En&nbsp;1&nbsp;tap. Sans complications. Audit trail immuable.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <Link href="/login">
                  <Button size="lg" className="w-full sm:w-auto">Commencer gratuitement</Button>
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
                    Comment ça marche →
                  </button>
                </a>
              </div>

              <p className="text-[11px] text-white/30 tracking-wide uppercase" style={{ letterSpacing: '0.1em' }}>
                Aucune carte · Plan Free illimité · RGPD
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
              <div key={s.label} style={{ transitionDelay: `${i * 80}ms` }}>
                <StatCounter value={s.value} suffix={s.suffix} label={s.label} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo video ───────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 border-b border-[var(--pp-line)]">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-12">
            <SectionLabel>Démo live</SectionLabel>
            <h2
              className="font-display font-bold text-[var(--pp-ink)] leading-tight"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)' }}
            >
              Voir PoinçOn en action
            </h2>
            <p className="text-[var(--pp-muted)] mt-3">20 secondes pour comprendre l'essentiel.</p>
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
            <SectionLabel>Fonctionnalités</SectionLabel>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <h2
                className="font-display font-bold text-[var(--pp-ink)] leading-tight"
                style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)' }}
              >
                Tout ce qu'il faut.<br />Rien de superflu.
              </h2>
              <p className="text-[var(--pp-muted)] max-w-sm md:text-right">
                Une solution pensée pour les PME belges qui veulent être conformes sans se compliquer la vie.
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
              <SectionLabel>Comment ça marche</SectionLabel>
              <h2
                className="font-display font-bold text-[var(--pp-ink)] leading-tight mt-4 mb-5"
                style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)' }}
              >
                Opérationnel<br />en 5 minutes
              </h2>
              <p className="text-[var(--pp-muted)] leading-relaxed mb-8" style={{ fontSize: '0.95rem' }}>
                Pas de formation, pas d'intégration complexe. Votre équipe pointe dès le premier jour.
              </p>
              <a
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#10b981] group"
              >
                <span>Essayer gratuitement</span>
                <span
                  className="inline-block transition-transform group-hover:translate-x-1"
                  style={{ transition: 'transform 0.2s ease' }}
                >→</span>
              </a>
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
            <SectionLabel>Tarifs</SectionLabel>
            <h2
              className="font-display font-bold text-[var(--pp-ink)] leading-tight mb-3"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)' }}
            >
              Tarifs transparents
            </h2>
            <p className="text-[var(--pp-muted)] mb-1">Commencez gratuitement. Payez seulement quand vous grandissez.</p>
            <p className="text-xs text-[var(--pp-muted)] mb-8">Tous les prix sont indiqués hors TVA (21 %).</p>

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
                  Mensuel
                </button>
                <button
                  onClick={() => setAnnual(true)}
                  className={`relative z-10 px-5 py-2 rounded-full text-sm font-semibold transition-colors duration-200 flex items-center gap-2 ${annual ? 'text-[var(--pp-ink)]' : 'text-[var(--pp-muted)]'}`}
                >
                  Annuel
                  <span className="text-[10px] bg-[var(--pp-pos)] text-white px-1.5 py-0.5 rounded-full font-bold leading-none">−20%</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pricingTiers.map((tier, i) => (
              <PricingCard key={tier.name} tier={tier} annual={annual} delay={i * 70} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 md:py-28 border-b border-[var(--pp-line)]" style={{ background: 'var(--pp-bg2)' }}>
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid md:grid-cols-[1fr_2fr] gap-12 md:gap-20 items-start">
            {/* Left — sticky heading */}
            <div className="md:sticky md:top-28">
              <SectionLabel>FAQ</SectionLabel>
              <h2
                className="font-display font-bold text-[var(--pp-ink)] leading-tight mb-4"
                style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)' }}
              >
                Questions<br />fréquentes
              </h2>
              <p className="text-sm text-[var(--pp-muted)] leading-relaxed mb-6">
                Vous ne trouvez pas votre réponse ? Contactez-nous directement.
              </p>
              <a
                href="mailto:contact@ced-it.be"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--pp-pos)] hover:gap-3 transition-all duration-200"
              >
                Nous écrire
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

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="py-14 bg-[var(--pp-bg)]">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="font-display font-bold text-[var(--pp-ink)] text-xl mb-3">
                Poinç<span className="text-[var(--pp-pos)]">On</span>
              </div>
              <p className="text-sm text-[var(--pp-muted)] leading-relaxed max-w-xs">
                La pointeuse légale belge pour les PME. Simple, mobile-first, conforme 2027.
              </p>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-[var(--pp-ink)] uppercase tracking-[0.15em] mb-4">Produit</h4>
              <ul className="space-y-2.5 text-sm text-[var(--pp-muted)]">
                <li><a href="#features" className="hover:text-[var(--pp-ink)] transition-colors">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:text-[var(--pp-ink)] transition-colors">Tarifs</a></li>
                <li><a href="#faq" className="hover:text-[var(--pp-ink)] transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-[var(--pp-ink)] uppercase tracking-[0.15em] mb-4">Légal</h4>
              <ul className="space-y-2.5 text-sm text-[var(--pp-muted)]">
                <li><a href="/legal/privacy" className="hover:text-[var(--pp-ink)] transition-colors">Confidentialité</a></li>
                <li><a href="/legal/terms" className="hover:text-[var(--pp-ink)] transition-colors">Conditions</a></li>
                <li><a href="/legal/compliance" className="hover:text-[var(--pp-ink)] transition-colors">Conformité</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-[var(--pp-ink)] uppercase tracking-[0.15em] mb-4">Ressources</h4>
              <ul className="space-y-2.5 text-sm text-[var(--pp-muted)]">
                <li><a href="#" className="hover:text-[var(--pp-ink)] transition-colors">Guide 2027</a></li>
                <li><a href="#" className="hover:text-[var(--pp-ink)] transition-colors">Support</a></li>
                <li><a href="mailto:contact@ced-it.be" className="hover:text-[var(--pp-ink)] transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[var(--pp-line)] flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[var(--pp-muted)]">
            <span>© 2026 PoinçOn · Ced-IT · Belgique</span>
            <span className="tracking-wide">Conforme Belgique 2027 · RGPD · HTTPS</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
