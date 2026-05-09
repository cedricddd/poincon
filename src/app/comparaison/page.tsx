'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Button } from '@/components/Button'

const competitors = [
  {
    name: 'PoinçOn',
    logo: '🍃',
    highlight: true,
    description: 'Pointeuse légale belge',
    plans: {
      free: '0€',
      entry: '49€/mois',
      mid: '99€/mois',
      enterprise: 'Devis',
    },
    employees: {
      free: '3',
      entry: '10',
      mid: '50',
      enterprise: 'Illimité',
    },
    features: {
      'Conforme loi belge 2027': true,
      'Mobile-first PWA': true,
      'Offline-first': true,
      'Audit trail immuable': true,
      'Gestion équipes': { free: false, entry: false, mid: true, enterprise: true },
      'Export illimité': { free: false, entry: true, mid: true, enterprise: true },
      'Managers': { free: false, entry: false, mid: true, enterprise: true },
      'Support français': true,
      'Hébergement EU': true,
      'Prix / employé': { free: '0€', entry: '4.90€', mid: '1.98€', enterprise: 'custom' },
    },
  },
  {
    name: 'Guidepoint',
    logo: '📊',
    highlight: false,
    description: 'Pointeuse belge générique',
    plans: {
      free: 'Essai',
      entry: '150€/mois',
      mid: '300€/mois',
      enterprise: 'Devis',
    },
    employees: {
      free: 'Limité',
      entry: '25',
      mid: '100',
      enterprise: 'Illimité',
    },
    features: {
      'Conforme loi belge 2027': true,
      'Mobile-first PWA': false,
      'Offline-first': false,
      'Audit trail immuable': true,
      'Gestion équipes': { free: false, entry: true, mid: true, enterprise: true },
      'Export illimité': { free: false, entry: false, mid: true, enterprise: true },
      'Managers': { free: false, entry: true, mid: true, enterprise: true },
      'Support français': true,
      'Hébergement EU': true,
      'Prix / employé': { free: '—', entry: '6€', mid: '3€', enterprise: 'custom' },
    },
  },
  {
    name: 'Factorial',
    logo: '💼',
    highlight: false,
    description: 'Solution RH complète',
    plans: {
      free: '0€ limité',
      entry: '200€/mois',
      mid: '400€/mois',
      enterprise: 'Custom',
    },
    employees: {
      free: '3',
      entry: 'Illimité',
      mid: 'Illimité',
      enterprise: 'Illimité',
    },
    features: {
      'Conforme loi belge 2027': false,
      'Mobile-first PWA': true,
      'Offline-first': false,
      'Audit trail immuable': false,
      'Gestion équipes': { free: false, entry: true, mid: true, enterprise: true },
      'Export illimité': { free: false, entry: true, mid: true, enterprise: true },
      'Managers': { free: false, entry: true, mid: true, enterprise: true },
      'Support français': false,
      'Hébergement EU': true,
      'Prix / employé': { free: 'Variable', entry: 'Illimité', mid: 'Illimité', enterprise: 'custom' },
    },
  },
  {
    name: 'Toggl Track',
    logo: '⏱️',
    highlight: false,
    description: 'Time tracking global',
    plans: {
      free: '0€ limité',
      entry: '5-9€/mois',
      mid: '13-18€/mois',
      enterprise: 'Custom',
    },
    employees: {
      free: 'Illimité',
      entry: '1-5',
      mid: '5-10',
      enterprise: 'Illimité',
    },
    features: {
      'Conforme loi belge 2027': false,
      'Mobile-first PWA': true,
      'Offline-first': true,
      'Audit trail immuable': false,
      'Gestion équipes': { free: false, entry: false, mid: true, enterprise: true },
      'Export illimité': { free: false, entry: false, mid: true, enterprise: true },
      'Managers': { free: false, entry: false, mid: true, enterprise: true },
      'Support français': false,
      'Hébergement EU': false,
      'Prix / employé': { free: '0€', entry: '10€/user', mid: '20€/user', enterprise: 'custom' },
    },
  },
  {
    name: 'Quickbooks Time',
    logo: '💳',
    highlight: false,
    description: 'Time tracking US',
    plans: {
      free: '0€',
      entry: '8€/user/mois',
      mid: '12€/user/mois',
      enterprise: 'Custom',
    },
    employees: {
      free: 'Illimité',
      entry: 'Illimité',
      mid: 'Illimité',
      enterprise: 'Illimité',
    },
    features: {
      'Conforme loi belge 2027': false,
      'Mobile-first PWA': true,
      'Offline-first': false,
      'Audit trail immuable': false,
      'Gestion équipes': { free: false, entry: true, mid: true, enterprise: true },
      'Export illimité': { free: false, entry: false, mid: true, enterprise: true },
      'Managers': { free: false, entry: true, mid: true, enterprise: true },
      'Support français': false,
      'Hébergement EU': false,
      'Prix / employé': { free: '0€', entry: '8€', mid: '12€', enterprise: 'custom' },
    },
  },
]

const differentiators = [
  {
    icon: '⚖️',
    title: 'Conforme légalement',
    description: 'Unique sur le marché : PoinçOn est certifié pour la loi belge 2027. Pas de risque juridique.',
  },
  {
    icon: '📱',
    title: '100% Mobile-first',
    description: 'Conçu pour smartphone. PWA installable. Fonctionne hors ligne. Setup en 1 minute.',
  },
  {
    icon: '🌍',
    title: 'Prix 80% moins cher',
    description: 'Team 50 emp.: 99€ vs 300€ concurrents. Jusqu\'à 3× moins cher à employé constant.',
  },
  {
    icon: '🔐',
    title: 'Données EU garanties',
    description: 'Hébergement Europe, RGPD compliant, audit trail immuable = confiance totale.',
  },
  {
    icon: '⚡',
    title: 'Zéro formation',
    description: 'Interface si intuitive que tes équipes pointent immédiatement. Pas de doc, pas de support.',
  },
  {
    icon: '💰',
    title: 'Prix prévisible',
    description: 'Pas de coût par employé. Forfait par plan. Budget transparent et stable.',
  },
]

function FeatureRow({ feature, items }: { feature: string; items: any[] }) {
  return (
    <div className="border-b border-[var(--pp-line)] py-4">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
        <div className="font-semibold text-sm text-[var(--pp-ink)] md:col-span-2">{feature}</div>
        {items.map((item, idx) => (
          <div key={idx} className="text-xs text-[var(--pp-muted)] text-center">
            {typeof item === 'boolean' ? (
              item ? (
                <span className="text-[#10b981] font-bold">✓</span>
              ) : (
                <span className="text-[#ef4444]">✕</span>
              )
            ) : (
              item
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ComparaisonPage() {
  const [viewMode, setViewMode] = useState<'all' | 'poincon'>('all')
  const visibleCompetitors = viewMode === 'poincon' ? competitors.slice(0, 1) : competitors

  return (
    <div className="min-h-screen bg-[var(--pp-bg)]">
      <Header />

      {/* Hero */}
      <section
        className="relative py-20 md:py-28 border-b border-[var(--pp-line)]"
        style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1a14 100%)' }}
      >
        <div className="mx-auto max-w-5xl px-4 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="w-5 h-px bg-[#10b981]" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#10b981]">
              Comparaison marché
            </span>
          </div>

          <h1
            className="font-display font-bold text-white leading-tight mb-6"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}
          >
            Pourquoi <span style={{ color: '#10b981' }}>PoinçOn</span> plutôt que les autres ?
          </h1>

          <p className="text-white/60 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            Unique en Belgique : pointeuse légale, mobile-first, et jusqu'à 80% moins cher. Pas de compromis.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login">
              <Button size="lg">Essayer gratuitement</Button>
            </Link>
            <a href="mailto:contact@ced-it.be">
              <button
                className="px-6 py-3 rounded-xl text-sm font-bold tracking-wide"
                style={{
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.7)',
                  background: 'transparent',
                }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.35)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.95)'
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)'
                }}
              >
                Parler à un expert
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="py-20 md:py-28 border-b border-[var(--pp-line)]">
        <div className="mx-auto max-w-6xl px-4">
          <h2
            className="font-display font-bold text-[var(--pp-ink)] text-center mb-14"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)' }}
          >
            6 raisons de choisir PoinçOn
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {differentiators.map(d => (
              <div
                key={d.title}
                className="p-6 rounded-xl border border-[var(--pp-line)] hover:border-[#10b981]/50 transition-colors"
                style={{ background: 'var(--pp-bg)' }}
              >
                <div className="text-3xl mb-3">{d.icon}</div>
                <h3 className="font-display font-bold text-[var(--pp-ink)] mb-2">{d.title}</h3>
                <p className="text-sm text-[var(--pp-muted)] leading-relaxed">{d.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section className="py-20 md:py-28 border-b border-[var(--pp-line)]">
        <div className="mx-auto max-w-7xl px-4">
          <h2
            className="font-display font-bold text-[var(--pp-ink)] text-center mb-8"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)' }}
          >
            Comparaison tarifaire
          </h2>

          <p className="text-center text-[var(--pp-muted)] mb-8 max-w-2xl mx-auto">
            Pour une PME belge de 25 à 50 employés : ce que vous payeriez chaque mois.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {competitors.map(comp => (
              <div
                key={comp.name}
                className={`p-6 rounded-xl border text-center transition-all ${
                  comp.highlight
                    ? 'border-[#10b981] bg-[#10b981]/5 scale-105 shadow-lg'
                    : 'border-[var(--pp-line)] bg-[var(--pp-bg)]'
                }`}
              >
                <div className="text-4xl mb-2">{comp.logo}</div>
                <h3 className="font-display font-bold text-[var(--pp-ink)] mb-1">{comp.name}</h3>
                <p className="text-xs text-[var(--pp-muted)] mb-4">{comp.description}</p>

                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-[10px] text-[var(--pp-muted)] uppercase tracking-widest mb-1">
                      Prix entrée
                    </p>
                    <p className="font-mono font-bold text-[var(--pp-ink)]">{comp.plans.entry}</p>
                  </div>
                  <div className="pt-2 border-t border-[var(--pp-line)]">
                    <p className="text-[10px] text-[var(--pp-muted)] uppercase tracking-widest mb-1">
                      Employés
                    </p>
                    <p className="text-xs text-[var(--pp-muted)]">{comp.employees.entry}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#10b981]/5 border border-[#10b981]/30 rounded-xl p-6 text-center">
            <p className="text-sm text-[var(--pp-ink)] font-semibold mb-2">
              💰 Pour 50 employés / mois
            </p>
            <div className="grid sm:grid-cols-5 gap-4 text-center">
              {competitors.map(comp => (
                <div key={comp.name}>
                  <p className="text-xs font-bold text-[var(--pp-muted)] mb-1">{comp.name}</p>
                  <p
                    className="font-display font-bold"
                    style={{
                      color: comp.highlight ? '#10b981' : 'var(--pp-ink)',
                      fontSize: '1.5rem',
                    }}
                  >
                    {comp.plans.mid}
                  </p>
                  {comp.highlight && (
                    <p className="text-[10px] text-[#10b981] font-bold mt-1">
                      {comp.plans.mid === '99€/mois' && '−66% vs Guidepoint'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Full Comparison Table */}
      <section className="py-20 md:py-28 border-b border-[var(--pp-line)]" style={{ background: 'var(--pp-bg2)' }}>
        <div className="mx-auto max-w-7xl px-4">
          <h2
            className="font-display font-bold text-[var(--pp-ink)] text-center mb-3"
            style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}
          >
            Comparaison détaillée
          </h2>
          <p className="text-center text-[var(--pp-muted)] mb-8">
            Tableau complet de toutes les fonctionnalités.
          </p>

          {/* View toggle */}
          <div className="flex justify-center gap-3 mb-8">
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'all'
                  ? 'bg-[#10b981] text-white'
                  : 'border border-[var(--pp-line)] text-[var(--pp-muted)] hover:text-[var(--pp-ink)]'
              }`}
            >
              Tous les concurrents
            </button>
            <button
              onClick={() => setViewMode('poincon')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'poincon'
                  ? 'bg-[#10b981] text-white'
                  : 'border border-[var(--pp-line)] text-[var(--pp-muted)] hover:text-[var(--pp-ink)]'
              }`}
            >
              PoinçOn seul
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--pp-line)]" style={{ background: 'var(--pp-bg)' }}>
            <div className="min-w-max">
              {/* Header */}
              <div className="border-b border-[var(--pp-line)] bg-[var(--pp-bg2)]">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 font-semibold text-sm">
                  <div className="md:col-span-2">Fonctionnalité</div>
                  {visibleCompetitors.map(comp => (
                    <div
                      key={comp.name}
                      className={`text-center py-2 rounded-lg ${
                        comp.highlight ? 'bg-[#10b981]/10 border border-[#10b981]' : ''
                      }`}
                    >
                      <p className="font-display font-bold text-[var(--pp-ink)]">{comp.name}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              {Object.entries(competitors[0].features).map(([feature]) => {
                const items = visibleCompetitors.map(comp => {
                  const value = comp.features[feature as keyof typeof comp.features]
                  if (typeof value === 'object' && value !== null) {
                    return (
                      <div className="text-xs space-y-0.5">
                        <p>🔵 Mid+</p>
                      </div>
                    )
                  }
                  return value
                })
                return <FeatureRow key={feature} feature={feature} items={items} />
              })}

              {/* CTA Row */}
              <div className="border-t border-[var(--pp-line)] p-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold text-[var(--pp-ink)]">Commencer maintenant</p>
                  </div>
                  {visibleCompetitors.map(comp => (
                    <div key={comp.name} className="text-center">
                      {comp.highlight ? (
                        <Link href="/login">
                          <button className="w-full px-3 py-2 rounded-lg bg-[#10b981] text-white text-xs font-bold hover:bg-[#059669] transition-all">
                            Accès gratuit
                          </button>
                        </Link>
                      ) : (
                        <button className="w-full px-3 py-2 rounded-lg border border-[var(--pp-line)] text-xs text-[var(--pp-muted)] cursor-not-allowed opacity-50">
                          Voir site
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 md:py-28" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1a14 100%)' }}>
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2
            className="font-display font-bold text-white mb-4"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
          >
            Prêt à devenir conforme ?
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-2xl mx-auto">
            Zéro engagement. Pas de carte requise. Conforme dès le premier pointage.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login">
              <Button size="lg">Créer un compte gratuit</Button>
            </Link>
            <a href="mailto:contact@ced-it.be">
              <button
                className="px-6 py-3 rounded-xl text-sm font-bold tracking-wide"
                style={{
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.7)',
                  background: 'transparent',
                }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.35)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.95)'
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)'
                }}
              >
                Planifier une démo
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[var(--pp-bg)] border-t border-[var(--pp-line)]">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-[var(--pp-muted)]">
          <p>
            Tarifs concurrents mis à jour en mai 2026. Contactez-nous pour corriger une info.
            <br />© 2026 PoinçOn · Belgique · Conforme 2027
          </p>
        </div>
      </footer>
    </div>
  )
}
