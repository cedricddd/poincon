'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { Card } from '@/components/Card'

const PLAN_INFO: Record<string, {
  label: string
  color: string
  monthly: string
  yearly: string
  yearlyNote: string
  features: string[]
}> = {
  STARTER: {
    label: 'Starter',
    color: '#10b981',
    monthly: '19,90€/mois HTVA',
    yearly: '16,58€/mois HTVA',
    yearlyNote: 'facturé 199€/an · économisez 40€',
    features: ['5 utilisateurs inclus', 'Mode kiosque tablette', 'Export CSV/PDF illimité', '+2,90€/siège supplémentaire'],
  },
  TEAM: {
    label: 'Team',
    color: '#6366f1',
    monthly: '44,90€/mois HTVA',
    yearly: '37,42€/mois HTVA',
    yearlyNote: 'facturé 449€/an · économisez 90€',
    features: ['15 utilisateurs inclus', 'Planning & congés', 'Rôle Manager', '+2,60€/siège supplémentaire'],
  },
  BUSINESS: {
    label: 'Business',
    color: '#8b5cf6',
    monthly: '69,90€/mois HTVA',
    yearly: '58,25€/mois HTVA',
    yearlyNote: 'facturé 699€/an · économisez 140€',
    features: ['30 utilisateurs inclus', 'API & intégrations', 'SLA 99.9%', '+2,20€/siège supplémentaire'],
  },
}

function UpgradeContent() {
  const searchParams = useSearchParams()
  const plan = (searchParams.get('plan') ?? 'STARTER').toUpperCase()
  const billing = searchParams.get('billing') ?? 'monthly'

  const info = PLAN_INFO[plan] ?? PLAN_INFO.STARTER
  const price = billing === 'yearly' ? info.yearly : info.monthly
  const checkoutUrl = `/api/stripe/checkout?plan=${plan.toLowerCase()}&billing=${billing}`

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link href="/" aria-label="Pointon — accueil">
            <Logo size="lg" useThemeVar />
          </Link>
        </div>

        <Card>
          {/* Plan badge */}
          <div className="flex items-center gap-3 mb-6 p-4 rounded-xl" style={{ background: `${info.color}12`, border: `1px solid ${info.color}30` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: info.color }}>
              {info.label[0]}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[var(--pp-ink)]">Plan {info.label}</p>
              <p className="text-sm" style={{ color: info.color }}>
                {price}
                {billing === 'yearly' && <span className="text-[var(--pp-muted)] ml-1 text-xs">· {info.yearlyNote}</span>}
              </p>
            </div>
          </div>

          {/* Steps */}
          <p className="text-[var(--pp-muted)] text-sm mb-5">
            Pour activer ce plan, il suffit de suivre ces 2 étapes rapides :
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5" style={{ background: info.color }}>
                1
              </div>
              <div>
                <p className="font-medium text-[var(--pp-ink)] text-sm">Créez votre compte gratuit</p>
                <p className="text-xs text-[var(--pp-muted)]">Inscription en 1 minute, sans carte bancaire</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" style={{ background: `${info.color}20`, color: info.color, border: `1.5px solid ${info.color}40` }}>
                2
              </div>
              <div>
                <p className="font-medium text-[var(--pp-muted)] text-sm">Activez le plan {info.label}</p>
                <p className="text-xs text-[var(--pp-muted)]">Paiement sécurisé via Stripe — actif immédiatement</p>
              </div>
            </div>
          </div>

          {/* Primary CTA */}
          <Link
            href={`/signup?callbackUrl=${encodeURIComponent(checkoutUrl)}`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 mb-3"
            style={{ background: info.color }}
          >
            Créer mon compte gratuit
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>

          {/* Secondary CTA */}
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(checkoutUrl)}`}
            className="flex items-center justify-center w-full py-3 rounded-xl text-sm font-medium border border-[var(--pp-line)] text-[var(--pp-muted)] hover:text-[var(--pp-ink)] hover:border-[var(--pp-ink)] transition-colors"
          >
            J'ai déjà un compte — me connecter
          </Link>
        </Card>

        <p className="text-center text-xs text-[var(--pp-muted)] mt-4">
          <Link href="/pricing" className="hover:underline">Voir tous les plans</Link>
          {' · '}
          <Link href="/" className="hover:underline">Retour à l'accueil</Link>
        </p>
      </div>
    </div>
  )
}

export default function UpgradePage() {
  return (
    <Suspense>
      <UpgradeContent />
    </Suspense>
  )
}
