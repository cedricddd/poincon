'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'

const freePlan = {
  name: 'FREE',
  label: 'Free',
  limit: '3 utilisateurs inclus',
  features: ['Pointage mobile (PWA)', 'Export CSV (30 derniers jours)', 'Rapports basiques'],
  includes: ['Audit trail immuable', 'Multi-appareils', 'Authentification sécurisée'],
}

const paidPlans = [
  {
    name: 'STARTER',
    label: 'Starter',
    monthlyPrice: 19.90,
    annualMonthlyPrice: 16.58,
    annualTotal: 199,
    annualSavings: 40,
    limit: '5 utilisateurs inclus',
    highlight: false,
    extraSeat: 2.90,
    features: ['Mode kiosque tablette', 'QR code par site (1 scan = pointage)', 'Export CSV/PDF illimité'],
    includesLabel: 'Tout Free inclus :',
    includes: ['Support email', 'Heures supp automatiques', 'Congés & Récupération'],
  },
  {
    name: 'TEAM',
    label: 'Team',
    monthlyPrice: 44.90,
    annualMonthlyPrice: 37.42,
    annualTotal: 449,
    annualSavings: 90,
    limit: '15 utilisateurs inclus',
    highlight: true,
    extraSeat: 2.60,
    features: ['Planning & congés', 'Rôle Manager', 'Exports planifiés'],
    includesLabel: 'Tout Starter inclus :',
    includes: ['Support prioritaire', 'Multi-sites', 'Dashboard manager'],
  },
  {
    name: 'BUSINESS',
    label: 'Business',
    monthlyPrice: 69.90,
    annualMonthlyPrice: 58.25,
    annualTotal: 699,
    annualSavings: 140,
    limit: '30 utilisateurs inclus',
    highlight: false,
    extraSeat: 2.20,
    features: ['API & intégrations', 'Rapports avancés', 'Multi-sociétés'],
    includesLabel: 'Tout Team inclus :',
    includes: ['SLA garanti 99.9%', 'Onboarding dédié', 'Facturation personnalisée'],
  },
  {
    name: 'ENTERPRISE',
    label: 'Enterprise',
    monthlyPrice: null,
    annualMonthlyPrice: null,
    annualTotal: null,
    annualSavings: null,
    limit: 'Utilisateurs illimités',
    highlight: false,
    extraSeat: null,
    features: ['Managers illimités', 'Export planifié hebdo', 'SLA garanti'],
    includesLabel: 'Tout Business inclus :',
    includes: ['Support dédié', 'Onboarding personnalisé', 'Contrat sur mesure'],
  },
]

function CheckIcon({ pos }: { pos?: boolean }) {
  return pos ? (
    <svg className="w-4 h-4 shrink-0 mt-0.5 text-[var(--pp-pos)]" viewBox="0 0 16 16" fill="none">
      <path d="M3 8l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ) : (
    <svg className="w-4 h-4 shrink-0 mt-0.5 text-[var(--pp-pos)]" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" opacity="0.4"/>
      <path d="M5 8l2.5 2.5 3.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function getCtaHref(planName: string, annual: boolean, isAuthenticated: boolean): string {
  if (planName === 'FREE') {
    return isAuthenticated ? '/admin/dashboard' : '/signup'
  }
  if (planName === 'ENTERPRISE') {
    return 'mailto:contact@pointon.be'
  }
  const billing = annual ? 'yearly' : 'monthly'
  if (isAuthenticated) {
    return `/api/stripe/checkout?plan=${planName.toLowerCase()}&billing=${billing}`
  }
  return `/pricing/upgrade?plan=${planName}&billing=${billing}`
}

function getCtaText(planName: string, isAuthenticated: boolean): string {
  if (planName === 'FREE') return isAuthenticated ? 'Mon tableau de bord' : 'Commencer gratuitement'
  if (planName === 'ENTERPRISE') return 'Nous contacter'
  if (planName === 'STARTER') return 'Choisir Starter'
  if (planName === 'TEAM') return 'Choisir Team'
  if (planName === 'BUSINESS') return 'Choisir Business'
  return 'Choisir ce plan'
}

function fmtPrice(n: number) {
  return n.toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function PricingPlans({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [annual, setAnnual] = useState(false)

  return (
    <div className="min-h-screen bg-[var(--pp-bg)]">
      {/* Header */}
      <div className="border-b border-[var(--pp-line)] py-4 px-6 flex items-center justify-between">
        <Link href={isAuthenticated ? '/admin/dashboard' : '/'} aria-label="Pointon — accueil">
          <Logo size="md" useThemeVar />
        </Link>
        {isAuthenticated ? (
          <Link href="/admin/dashboard/settings" className="text-sm text-[var(--pp-muted)] hover:text-[var(--pp-ink)] transition-colors">
            ← Retour aux paramètres
          </Link>
        ) : (
          <div className="flex items-center gap-4 text-sm">
            <Link href="/login" className="text-[var(--pp-muted)] hover:text-[var(--pp-ink)] transition-colors">Se connecter</Link>
            <Link href="/signup" className="px-4 py-2 bg-[var(--pp-pos)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity">
              Démarrer gratuitement
            </Link>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--pp-ink)] mb-3">
            Choisissez votre plan
          </h1>
          <p className="text-[var(--pp-muted)] text-lg">
            Sans engagement. Changez ou résiliez à tout moment.
          </p>
          <p className="text-xs text-[var(--pp-muted)] mt-2">Tous les prix sont indiqués HTVA (TVA belge 21% en sus).</p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 mt-8 bg-[var(--pp-surface,var(--pp-bg))] border border-[var(--pp-line)] rounded-full p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                !annual
                  ? 'bg-[var(--pp-ink)] text-[var(--pp-bg)] shadow-sm'
                  : 'text-[var(--pp-muted)] hover:text-[var(--pp-ink)]'
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                annual
                  ? 'bg-[var(--pp-ink)] text-[var(--pp-bg)] shadow-sm'
                  : 'text-[var(--pp-muted)] hover:text-[var(--pp-ink)]'
              }`}
            >
              Annuel
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full transition-colors ${
                annual ? 'bg-[var(--pp-pos)] text-white' : 'bg-[var(--pp-pos)]/15 text-[var(--pp-pos)]'
              }`}>
                −17%
              </span>
            </button>
          </div>
          {annual && (
            <p className="text-xs text-[var(--pp-pos)] mt-3 font-medium">
              ✓ 2 mois offerts — facturé en une fois pour l'année
            </p>
          )}
        </div>

        {/* FREE — horizontal strip */}
        <div className="mb-6 rounded-2xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-lg font-bold text-[var(--pp-ink)]">Free</span>
                <span className="text-[var(--pp-muted)] text-sm ml-2">· {freePlan.limit} · Toujours gratuit</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {freePlan.features.map(f => (
                  <span key={f} className="inline-flex items-center gap-1.5 text-xs text-[var(--pp-muted)]">
                    <CheckIcon /> {f}
                  </span>
                ))}
              </div>
              <a
                href={getCtaHref('FREE', annual, isAuthenticated)}
                className="shrink-0 px-5 py-2 rounded-xl border border-[var(--pp-line)] text-sm font-semibold text-[var(--pp-ink)] hover:border-[var(--pp-pos)] hover:text-[var(--pp-pos)] transition-colors text-center"
              >
                {getCtaText('FREE', isAuthenticated)}
              </a>
            </div>
          </div>
        </div>

        {/* Paid plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {paidPlans.map((plan) => {
            const price = annual ? plan.annualMonthlyPrice : plan.monthlyPrice
            const href = getCtaHref(plan.name, annual, isAuthenticated)
            const ctaText = getCtaText(plan.name, isAuthenticated)

            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl border flex flex-col bg-[var(--pp-bg)] transition-shadow hover:shadow-lg ${
                  plan.highlight
                    ? 'border-[var(--pp-pos)] shadow-[0_0_0_1px_rgba(16,185,129,0.3)]'
                    : 'border-[var(--pp-line)]'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[var(--pp-pos)] text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-widest uppercase shadow-sm">
                      Populaire
                    </span>
                  </div>
                )}

                <div className="p-6 pb-4">
                  <h2 className="text-lg font-bold text-[var(--pp-ink)] mb-4">{plan.label}</h2>

                  {/* Price */}
                  {price === null ? (
                    <div className="mb-1">
                      <span className="text-3xl font-bold text-[var(--pp-pos)]">Devis</span>
                    </div>
                  ) : (
                    <div className="mb-1">
                      <span className="text-3xl font-bold text-[var(--pp-ink)]">{fmtPrice(price)}€</span>
                      <span className="text-sm text-[var(--pp-muted)] ml-1">/mois HTVA</span>
                      {annual && plan.annualTotal && (
                        <p className="text-xs text-[var(--pp-muted)] mt-0.5">
                          facturé {plan.annualTotal}€/an · économisez {plan.annualSavings}€
                        </p>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-[var(--pp-muted)] mt-1">{plan.limit}</p>
                  {plan.extraSeat && (
                    <p className="text-xs text-[var(--pp-muted)]">+{plan.extraSeat}€/siège supplémentaire</p>
                  )}

                  {/* CTA */}
                  <a
                    href={href}
                    className={`block w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all mt-4 ${
                      plan.highlight
                        ? 'bg-[var(--pp-pos)] text-white hover:opacity-90'
                        : 'border border-[var(--pp-line)] text-[var(--pp-ink)] hover:border-[var(--pp-pos)] hover:text-[var(--pp-pos)]'
                    }`}
                  >
                    {ctaText}
                  </a>
                </div>

                {/* Features */}
                <div className="px-6 pb-6 border-t border-[var(--pp-line)] pt-5 flex-1 space-y-4">
                  <ul className="space-y-2.5">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--pp-muted)]">
                        <CheckIcon />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-[var(--pp-line)] pt-4">
                    <p className="text-[10px] font-bold text-[var(--pp-muted)] uppercase tracking-widest mb-3">
                      {plan.includesLabel}
                    </p>
                    <ul className="space-y-2">
                      {plan.includes.map(item => (
                        <li key={item} className="flex items-start gap-2 text-sm text-[var(--pp-muted)]">
                          <CheckIcon pos />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Annual savings callout */}
        {!annual && (
          <p className="text-center text-sm text-[var(--pp-muted)] mt-8">
            💡 Passez à la facturation annuelle et{' '}
            <button onClick={() => setAnnual(true)} className="text-[var(--pp-pos)] font-semibold underline underline-offset-2 hover:opacity-80">
              économisez 17% (2 mois offerts)
            </button>
          </p>
        )}
        {annual && (
          <p className="text-center text-sm text-[var(--pp-pos)] font-medium mt-8">
            ✓ Vous économisez jusqu'à 140€/an avec la facturation annuelle
          </p>
        )}

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap justify-center gap-6 text-xs text-[var(--pp-muted)]">
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[var(--pp-pos)]" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Paiement sécurisé Stripe
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[var(--pp-pos)]" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Zéro GPS · RGPD compliant
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[var(--pp-pos)]" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Conforme loi belge 2027
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[var(--pp-pos)]" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Résiliable à tout moment
          </span>
        </div>

        {/* Footer links */}
        <div className="text-center mt-10 text-xs text-[var(--pp-muted)] space-x-4">
          <Link href="/legal/terms" className="hover:underline">Conditions d'utilisation</Link>
          <Link href="/legal/privacy" className="hover:underline">Confidentialité</Link>
          <a href="mailto:contact@pointon.be" className="hover:underline">Contact</a>
        </div>
      </div>
    </div>
  )
}
