import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Conditions d\'utilisation — PoinçOn',
  description: 'Conditions générales d\'utilisation du service PoinçOn, la pointeuse légale belge.',
}

const sections = [
  { id: 'objet', label: 'Objet du service' },
  { id: 'acces', label: 'Accès et inscription' },
  { id: 'utilisation', label: 'Utilisation acceptable' },
  { id: 'plans', label: 'Plans et facturation' },
  { id: 'responsabilites', label: 'Responsabilités' },
  { id: 'resiliation', label: 'Résiliation et données' },
  { id: 'propriete', label: 'Propriété intellectuelle' },
  { id: 'loi', label: 'Loi applicable' },
]

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      {/* Breadcrumb */}
      <nav className="text-sm text-[var(--pp-muted)] mb-8">
        <Link href="/" className="hover:text-[var(--pp-ink)] transition-colors">Accueil</Link>
        <span className="mx-2">›</span>
        <span>Légal</span>
        <span className="mx-2">›</span>
        <span className="text-[var(--pp-ink)]">Conditions d'utilisation</span>
      </nav>

      {/* Hero */}
      <div className="mb-12">
        <h1 className="font-display text-4xl font-bold text-[var(--pp-ink)] mb-3">
          Conditions d'utilisation
        </h1>
        <p className="text-[var(--pp-muted)] text-sm">
          Dernière mise à jour : 25 mai 2026 · Droit applicable : Belgique
        </p>
      </div>

      {/* Intro */}
      <div className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl p-5 mb-10 text-sm text-[var(--pp-muted)]">
        En accédant à PoinçOn ou en utilisant nos services, vous acceptez les présentes conditions d'utilisation.
        Si vous utilisez PoinçOn pour le compte d'une entreprise, vous acceptez ces conditions au nom de cette entreprise.
      </div>

      {/* Table des matières */}
      <div className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl p-6 mb-12">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--pp-muted)] mb-4">Table des matières</h2>
        <ol className="space-y-2">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-sm text-[var(--pp-info)] hover:underline">
                {i + 1}. {s.label}
              </a>
            </li>
          ))}
        </ol>
      </div>

      {/* Contenu */}
      <div className="space-y-12 text-sm leading-relaxed">

        <section id="objet">
          <h2 className="font-display text-xl font-bold mb-4 text-[var(--pp-ink)]">1. Objet du service</h2>
          <p className="text-[var(--pp-muted)]">
            PoinçOn est un logiciel de gestion du temps de travail (SaaS) conçu pour les entreprises belges,
            permettant l'enregistrement électronique du temps de travail conformément à la CCT n°129 et aux
            exigences légales belges en vigueur. Le service comprend : le pointage (arrivée/départ),
            la gestion des congés et récupérations, les rapports d'heures, la gestion multi-sites et multi-équipes,
            ainsi que les exports comptables.
          </p>
        </section>

        <section id="acces">
          <h2 className="font-display text-xl font-bold mb-4 text-[var(--pp-ink)]">2. Accès et inscription</h2>
          <div className="space-y-3 text-[var(--pp-muted)]">
            <p>
              Pour utiliser PoinçOn, vous devez créer un compte entreprise (compte administrateur) ou
              accepter une invitation de votre employeur. Vous vous engagez à :
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Fournir des informations exactes et à jour lors de l'inscription</li>
              <li>Maintenir la confidentialité de vos identifiants de connexion</li>
              <li>Notifier immédiatement tout accès non autorisé à votre compte</li>
              <li>Ne pas partager votre compte avec d'autres personnes</li>
            </ul>
            <p>
              PoinçOn se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes conditions.
            </p>
          </div>
        </section>

        <section id="utilisation">
          <h2 className="font-display text-xl font-bold mb-4 text-[var(--pp-ink)]">3. Utilisation acceptable</h2>
          <p className="text-[var(--pp-muted)] mb-3">Vous vous engagez à ne pas :</p>
          <ul className="list-disc list-inside space-y-2 text-[var(--pp-muted)] ml-2">
            <li>Falsifier des données de pointage</li>
            <li>Tenter d'accéder aux données d'autres entreprises</li>
            <li>Utiliser le service à des fins illégales ou contraires à l'ordre public</li>
            <li>Effectuer du reverse engineering ou tenter de copier le logiciel</li>
            <li>Surcharger les serveurs par des requêtes automatisées (scraping, bots)</li>
            <li>Utiliser PoinçOn pour traiter des données non liées à la gestion du temps de travail</li>
          </ul>
        </section>

        <section id="plans">
          <h2 className="font-display text-xl font-bold mb-4 text-[var(--pp-ink)]">4. Plans et facturation</h2>
          <div className="space-y-4 text-[var(--pp-muted)]">
            <p>PoinçOn propose les plans suivants :</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { plan: 'FREE', desc: "Jusqu'à 3 employés, fonctionnalités de base" },
                { plan: 'SOLO', desc: "Jusqu'à 10 employés, exports CSV" },
                { plan: 'TEAM', desc: "Jusqu'à 50 employés, gestion équipes" },
                { plan: 'ENTERPRISE', desc: 'Illimité, API, support prioritaire' },
              ].map(p => (
                <div key={p.plan} className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-lg p-3">
                  <span className="font-semibold text-[var(--pp-ink)]">{p.plan}</span>
                  <p className="text-xs mt-1">{p.desc}</p>
                </div>
              ))}
            </div>
            <p>
              Les abonnements payants sont facturés mensuellement ou annuellement via Stripe.
              En cas de non-paiement, le compte est rétrogradé au plan FREE après un délai de grâce de 7 jours.
              Les prix sont indiqués hors TVA ; la TVA belge (21%) est appliquée pour les clients particuliers.
            </p>
          </div>
        </section>

        <section id="responsabilites">
          <h2 className="font-display text-xl font-bold mb-4 text-[var(--pp-ink)]">5. Responsabilités</h2>
          <div className="space-y-4 text-[var(--pp-muted)]">
            <div>
              <h3 className="font-semibold text-[var(--pp-ink)] mb-2">Responsabilité de l'éditeur</h3>
              <p>
                PoinçOn s'engage à fournir un service disponible 24h/24, 7j/7, avec un objectif de disponibilité
                de 99,5% (hors maintenance planifiée). En cas d'interruption, la responsabilité de PoinçOn
                est limitée au remboursement des frais d'abonnement proportionnels à la durée d'interruption.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--pp-ink)] mb-2">Responsabilité de l'utilisateur</h3>
              <p>
                L'administrateur de l'entreprise est responsable de l'exactitude des données saisies,
                du respect du droit du travail belge dans l'utilisation du service, et de la configuration
                correcte des horaires de travail conformément aux conventions collectives applicables.
              </p>
            </div>
          </div>
        </section>

        <section id="resiliation">
          <h2 className="font-display text-xl font-bold mb-4 text-[var(--pp-ink)]">6. Résiliation et données</h2>
          <div className="space-y-3 text-[var(--pp-muted)]">
            <p>
              Vous pouvez résilier votre abonnement à tout moment depuis votre tableau de bord
              (Paramètres → Abonnement → Annuler). La résiliation prend effet à la fin de la période
              de facturation en cours.
            </p>
            <p>
              Après résiliation, vos données sont conservées pendant 90 jours et peuvent être exportées
              (CSV/PDF). Passé ce délai, les données sont supprimées, à l'exception des données soumises
              à des obligations légales de conservation (pointages : 5 ans).
            </p>
            <p>
              PoinçOn peut résilier votre compte en cas de violation grave des présentes conditions,
              avec un préavis de 30 jours sauf cas de fraude avérée.
            </p>
          </div>
        </section>

        <section id="propriete">
          <h2 className="font-display text-xl font-bold mb-4 text-[var(--pp-ink)]">7. Propriété intellectuelle</h2>
          <p className="text-[var(--pp-muted)]">
            PoinçOn et son code source sont la propriété exclusive de Ced-IT. L'abonnement vous confère
            un droit d'utilisation non exclusif et non transférable du service. Vos données restent votre
            propriété ; PoinçOn n'en revendique aucun droit et ne les utilise pas à des fins commerciales.
          </p>
        </section>

        <section id="loi">
          <h2 className="font-display text-xl font-bold mb-4 text-[var(--pp-ink)]">8. Loi applicable</h2>
          <p className="text-[var(--pp-muted)]">
            Les présentes conditions sont régies par le droit belge. Tout litige relatif à l'utilisation
            du service sera soumis à la compétence exclusive des tribunaux de Bruxelles, Belgique.
            Si une clause des présentes conditions était déclarée nulle, les autres clauses resteraient
            pleinement en vigueur.
          </p>
          <div className="mt-4 p-4 bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-lg text-[var(--pp-muted)]">
            <strong className="text-[var(--pp-ink)]">Contact :</strong>{' '}
            <a href="mailto:contact@ced-it.be" className="text-[var(--pp-info)] hover:underline">contact@ced-it.be</a>
          </div>
        </section>

      </div>
    </div>
  )
}
