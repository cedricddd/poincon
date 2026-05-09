'use client'

import { Header } from '@/components/Header'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'

const features = [
  {
    title: 'Simple',
    description: 'Interface minimaliste, pointage en 1 clic. Pas de complications.',
    icon: '⚡'
  },
  {
    title: 'Légal',
    description: 'Conforme à la loi belge 2027. Audit trail immuable. Exportable.',
    icon: '⚖️'
  },
  {
    title: 'Accessible',
    description: 'Mobile-first. Fonctionne offline. Prêt pour tous.',
    icon: '📱'
  }
]

const pricingTiers = [
  {
    name: 'Free',
    planKey: 'FREE',
    price: 'Gratuit',
    limit: '1 admin + 3 employes',
    features: ['Export CSV 1×/mois', 'Rapports basiques', 'Pointage mobile (PWA)'],
    cta: 'Commencer gratuitement',
    ctaHref: '/signup',
    highlight: false,
  },
  {
    name: 'Solo',
    planKey: 'SOLO',
    price: '49€',
    period: '/mois',
    limit: '1 admin +10 employés',
    features: ['Export CSV/PDF illimité', 'Rapports avancés', 'Notifications email', 'Support email'],
    cta: 'Choisir Solo',
    ctaHref: '/api/stripe/checkout?plan=solo&billing=monthly',
    highlight: false,
  },
  {
    name: 'Team',
    planKey: 'TEAM',
    price: '99€',
    period: '/mois',
    limit: '5 managers +50 employés',
    features: ['Tout Solo inclus', 'Gestion d\'équipes', 'Rôle Manager', 'Export planifié mensuel', 'Support prioritaire'],
    cta: 'Choisir Team',
    ctaHref: '/api/stripe/checkout?plan=team&billing=monthly',
    highlight: true,
  },
  {
    name: 'Enterprise',
    planKey: 'ENTERPRISE',
    price: 'Devis',
    limit: 'Employés illimités',
    features: ['Tout Team inclus', 'Export planifié hebdomadaire', 'Managers illimités', 'SLA garanti', 'Support dédié'],
    cta: 'Nous contacter',
    ctaHref: 'mailto:contact@ced-it.be',
    highlight: false,
  },
]

const faqs = [
  {
    q: 'La solution est-elle conforme à la loi belge 2027?',
    a: 'Oui. PoinçOn respecte toutes les exigences légales belges et CJUE: enregistrement objectif, audit trail immuable, export certifié.'
  },
  {
    q: 'Comment sont stockées les données?',
    a: 'Données hébergées en EU (Vercel Postgres ou serveur auto-hebergé). Chiffrement HTTPS. RGPD compliant.'
  },
  {
    q: 'Puis-je exporter les données?',
    a: 'Oui. Export CSV/PDF signé numériquement pour inspection légale. Disponible sur tous les plans.'
  },
  {
    q: 'Quel est le délai de mise en place?',
    a: 'Setup en 5 minutes. Intégration: 15 min. Pointage immédiat après création compte.'
  },
  {
    q: 'Y a-t-il une période d\'essai?',
    a: 'Plan Free illimité sans engagement. Essayez gratuitement, pas de carte requise.'
  },
  {
    q: 'Le système fonctionne hors ligne?',
    a: 'Oui. PWA installable. Enregistre offline, synchro automatique quand connecté.'
  }
]

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--pp-bg)]">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--pp-line)]">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-4 py-2 rounded-full border border-[var(--pp-pos)] text-[var(--pp-pos)] text-sm font-medium mb-6">
                Conforme Belgique 2027
              </div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 text-[var(--pp-ink)]">
                Pointeuse simple. <br />Conforme légal.
              </h1>
              <p className="text-xl text-[var(--pp-muted)] mb-8 leading-relaxed">
                PoinçOn est l'outil que vous attendiez pour enregistrer le temps légalement, sans complications.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="/login"><Button size="lg">Se connecter</Button></a>
                <Button variant="outline" size="lg">Voir une démo</Button>
              </div>
            </div>
            <div className="relative aspect-square">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--pp-pos)]/20 to-[var(--pp-info)]/20 rounded-2xl" />
              <div className="relative h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl font-bold text-[var(--pp-pos)] mb-2">
                    09:35:42
                  </div>
                  <div className="text-lg text-[var(--pp-muted)] mb-6">
                    Mardi 6 mai
                  </div>
                  <Button size="lg">ARRIVÉE</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 border-b border-[var(--pp-line)]">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-4xl font-bold mb-4 text-center text-[var(--pp-ink)]">
            Pourquoi PoinçOn?
          </h2>
          <p className="text-center text-[var(--pp-muted)] mb-12 max-w-2xl mx-auto">
            Une solution pensée pour les PME belges, avec ce qu'il faut. Rien de plus.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map(feature => (
              <Card key={feature.title}>
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3 text-[var(--pp-ink)]">
                  {feature.title}
                </h3>
                <p className="text-[var(--pp-muted)]">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 border-b border-[var(--pp-line)]">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-4xl font-bold mb-4 text-center text-[var(--pp-ink)]">
            Tarifs transparents
          </h2>
          <p className="text-center text-[var(--pp-muted)] mb-12 max-w-2xl mx-auto">
            Commencez gratuitement. Payez seulement quand vous grandissez.
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            {pricingTiers.map(tier => (
              <div key={tier.name} className={[
                'rounded-lg border bg-[var(--pp-bg)] p-6 flex flex-col relative',
                tier.highlight
                  ? 'border-[var(--pp-info)] ring-2 ring-[var(--pp-info)]'
                  : 'border-[var(--pp-line)]',
              ].join(' ')}>
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--pp-info)] text-white text-xs font-bold px-3 py-1 rounded-full">
                    Populaire
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2 text-[var(--pp-ink)]">{tier.name}</h3>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-3xl font-bold text-[var(--pp-pos)]">{tier.price}</span>
                  {(tier as any).period && <span className="text-sm text-[var(--pp-muted)] mb-1">{(tier as any).period}</span>}
                </div>
                <p className="text-sm text-[var(--pp-muted)] mb-6 pb-6 border-b border-[var(--pp-line)]">
                  {tier.limit}
                </p>
                <ul className="space-y-3 mb-8 flex-grow">
                  {tier.features.map(feature => (
                    <li key={feature} className="text-[var(--pp-muted)] text-sm flex gap-2">
                      <span className="text-[var(--pp-pos)] shrink-0">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <a href={tier.ctaHref} className="w-full">
                  <Button
                    variant={tier.highlight ? 'primary' : 'secondary'}
                    size="md"
                    className="w-full"
                  >
                    {tier.cta}
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 border-b border-[var(--pp-line)]">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-4xl font-bold mb-12 text-center text-[var(--pp-ink)]">
            Questions fréquentes
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, idx) => (
              <Card key={idx}>
                <h3 className="text-lg font-bold mb-3 text-[var(--pp-ink)]">
                  {faq.q}
                </h3>
                <p className="text-[var(--pp-muted)]">
                  {faq.a}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--pp-bg)] border-t border-[var(--pp-line)] py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold mb-4 text-[var(--pp-ink)]">Produit</h4>
              <ul className="space-y-2 text-[var(--pp-muted)]">
                <li><a href="#" className="hover:text-[var(--pp-info)]">Fonctionnalités</a></li>
                <li><a href="#" className="hover:text-[var(--pp-info)]">Tarifs</a></li>
                <li><a href="#" className="hover:text-[var(--pp-info)]">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-[var(--pp-ink)]">Légal</h4>
              <ul className="space-y-2 text-[var(--pp-muted)]">
                <li><a href="/legal/privacy" className="hover:text-[var(--pp-info)]">Confidentialité</a></li>
                <li><a href="/legal/terms" className="hover:text-[var(--pp-info)]">Conditions</a></li>
                <li><a href="/legal/compliance" className="hover:text-[var(--pp-info)]">Conformité</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-[var(--pp-ink)]">Ressources</h4>
              <ul className="space-y-2 text-[var(--pp-muted)]">
                <li><a href="#" className="hover:text-[var(--pp-info)]">Documentation</a></li>
                <li><a href="#" className="hover:text-[var(--pp-info)]">Guide 2027</a></li>
                <li><a href="#" className="hover:text-[var(--pp-info)]">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-[var(--pp-ink)]">Nous</h4>
              <ul className="space-y-2 text-[var(--pp-muted)]">
                <li><a href="#" className="hover:text-[var(--pp-info)]">À propos</a></li>
                <li><a href="#" className="hover:text-[var(--pp-info)]">Contact</a></li>
                <li><a href="#" className="hover:text-[var(--pp-info)]">Twitter</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-[var(--pp-line)] text-center text-[var(--pp-muted)] text-sm">
            <p>© 2026 PoinçOn. Tous droits réservés. Conforme Belgique 2027.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
