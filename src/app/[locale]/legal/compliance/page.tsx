import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import CompliancePdfButton from '@/components/CompliancePdfButton'

export const metadata: Metadata = {
  title: 'Conformité légale — arrêt CJUE 2019 & obligation 2027',
  description: 'Pointon répond à l\'arrêt CJUE 2019 et au RGPD, et anticipe l\'obligation belge de suivi du temps de travail prévue pour 2027 (texte encore en cours d\'adoption).',
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--pp-pos)] flex-shrink-0 mt-0.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

const checklistItems = [
  {
    category: 'Enregistrement du temps de travail',
    items: [
      'Enregistrement électronique de l\'heure d\'arrivée et de départ',
      'Données immuables — aucune modification possible sans trace d\'audit',
      'Horodatage automatique (serveur, pas client)',
      'Conservation minimale 5 ans (obligation légale belge)',
    ],
  },
  {
    category: 'Audit trail & traçabilité',
    items: [
      'Toutes les actions admin sont enregistrées (AuditLog)',
      'Qui a fait quoi, quand — traçabilité complète',
      'Export CSV des logs d\'audit disponible',
      'Impossible de supprimer un pointage sans trace',
    ],
  },
  {
    category: 'RGPD & protection des données',
    items: [
      'Base légale définie pour chaque traitement',
      'Durées de conservation documentées',
      'Droits des personnes concernées respectés',
      'Pseudo-anonymisation des données après la période légale',
      'Sous-traitants conformes RGPD (Brevo, Stripe, Hostinger)',
    ],
  },
  {
    category: 'Sécurité & confidentialité',
    items: [
      'Chiffrement HTTPS/TLS 1.3 en transit',
      'Mots de passe hashés bcrypt (cost factor 12)',
      'Isolation des données par entreprise (multi-tenancy)',
      'Sessions sécurisées (expiration, token rotation)',
      'Audit des accès et des modifications sensibles',
    ],
  },
]

export default function CompliancePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      {/* Breadcrumb */}
      <nav className="text-sm text-[var(--pp-muted)] mb-8">
        <Link href="/" className="hover:text-[var(--pp-ink)] transition-colors">Accueil</Link>
        <span className="mx-2">›</span>
        <span>Légal</span>
        <span className="mx-2">›</span>
        <span className="text-[var(--pp-ink)]">Conformité</span>
      </nav>

      {/* Hero */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 bg-[var(--pp-pos-btn)]/10 text-[var(--pp-pos)] text-xs font-semibold px-3 py-1 rounded-full mb-4">
          <CheckIcon />
          Prêt pour l'obligation 2027
        </div>
        <h1 className="font-display text-4xl font-bold text-[var(--pp-ink)] mb-3">
          Conformité légale
        </h1>
        <p className="text-[var(--pp-muted)] text-sm">
          Dernière mise à jour : 21 juillet 2026
        </p>
        <p className="text-[var(--pp-muted)] mt-3 leading-relaxed">
          Pointon est conçu pour répondre à l'arrêt CJUE de 2019 et au RGPD, et pour anticiper
          l'obligation belge de suivi du temps de travail que le gouvernement prévoit d'introduire
          à partir de 2027. Cette page détaille ces bases légales et comment Pointon y répond.
        </p>
      </div>

      {/* PDF download */}
      <div className="mb-10">
        <CompliancePdfButton />
      </div>

      {/* Bases légales */}
      <div className="space-y-6 mb-14">
        <h2 className="font-display text-2xl font-bold text-[var(--pp-ink)]">Bases légales</h2>

        <div className="border border-[var(--pp-line)] rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--pp-info)]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[var(--pp-info)] font-bold text-sm">BE</span>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--pp-ink)] mb-1">Obligation belge de suivi du temps de travail (dès 2027)</h3>
              <p className="text-sm text-[var(--pp-muted)] leading-relaxed">
                Le gouvernement belge a décidé le 25 novembre 2025, dans le cadre de l'accord budgétaire,
                d'introduire une obligation générale d'enregistrement du temps de travail à partir du
                1er janvier 2027, en application de l'arrêt de la Cour de Justice de l'Union Européenne
                (voir ci-dessous). Le texte de loi définitif est encore en cours d'examen (Conseil National
                du Travail, puis Parlement) et n'est pas encore voté ni publié au Moniteur belge. Pointon
                répond déjà aux exigences connues à ce jour : système objectif, fiable et accessible.
              </p>
            </div>
          </div>
        </div>

        <div className="border border-[var(--pp-line)] rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--pp-peach)]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[var(--pp-peach)] font-bold text-sm">EU</span>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--pp-ink)] mb-1">Arrêt CJUE C-55/18 (2019) — Deutsche Bank</h3>
              <p className="text-sm text-[var(--pp-muted)] leading-relaxed">
                La Cour de Justice de l'Union Européenne a établi en 2019 que les employeurs sont tenus
                de mettre en place un système objectif, fiable et accessible permettant de mesurer
                la durée du temps de travail journalier effectué par chaque travailleur.
                Pointon fournit exactement ce système : enregistrement automatique, immuable et exportable.
              </p>
            </div>
          </div>
        </div>

        <div className="border border-[var(--pp-line)] rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--pp-pos-btn)]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[var(--pp-pos)] font-bold text-xs">RGPD</span>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--pp-ink)] mb-1">RGPD — Règlement (UE) 2016/679</h3>
              <p className="text-sm text-[var(--pp-muted)] leading-relaxed">
                Les données de pointage sont des données personnelles au sens du RGPD.
                Pointon traite ces données avec les bases légales appropriées (obligation légale pour
                le temps de travail, contrat pour la gestion des comptes), dans le respect des principes
                de minimisation, limitation de conservation et sécurité des données.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Checklist de conformité */}
      <div className="mb-14">
        <h2 className="font-display text-2xl font-bold text-[var(--pp-ink)] mb-6">Checklist de conformité</h2>
        <div className="space-y-6">
          {checklistItems.map(cat => (
            <div key={cat.category} className="border border-[var(--pp-line)] rounded-xl p-6">
              <h3 className="font-semibold text-[var(--pp-ink)] mb-4">{cat.category}</h3>
              <ul className="space-y-3">
                {cat.items.map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm text-[var(--pp-muted)]">
                    <CheckIcon />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Conservation & anonymisation */}
      <div className="mb-14">
        <h2 className="font-display text-2xl font-bold text-[var(--pp-ink)] mb-6">Conservation & anonymisation</h2>
        <div className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl p-6 text-sm text-[var(--pp-muted)] space-y-4">
          <p>
            Le droit belge impose la conservation des données de temps de travail pendant <strong className="text-[var(--pp-ink)]">5 ans minimum</strong>.
            Pointon applique cette obligation automatiquement : les données de pointage ne peuvent pas être
            supprimées manuellement avant l'échéance légale.
          </p>
          <p>
            Après la période de conservation légale, les données sont <strong className="text-[var(--pp-ink)]">pseudo-anonymisées</strong> :
            les identifiants personnels (nom, email) sont remplacés par des identifiants anonymes,
            tout en conservant les agrégats statistiques nécessaires aux obligations comptables.
          </p>
          <p>
            Les exports CSV et PDF sont disponibles à tout moment pour les audits des organes sociaux
            (inspection du travail, ONSS, SPF Emploi).
          </p>
        </div>
      </div>

      {/* Contact conformité */}
      <div>
        <h2 className="font-display text-2xl font-bold text-[var(--pp-ink)] mb-4">Questions de conformité</h2>
        <div className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl p-6">
          <p className="text-sm text-[var(--pp-muted)] mb-4">
            Pour toute question relative à la conformité légale de Pointon dans votre entreprise,
            ou pour obtenir une attestation de conformité :
          </p>
          <div className="text-sm text-[var(--pp-muted)]">
            <strong className="text-[var(--pp-ink)]">Email :</strong>{' '}
            <a href="mailto:contact@ced-it.be" className="text-[var(--pp-info)] hover:underline">contact@ced-it.be</a>
          </div>
        </div>
      </div>
    </div>
  )
}
