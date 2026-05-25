import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — PoinçOn',
  description: 'Comment PoinçOn collecte, utilise et protège vos données personnelles. Conformité RGPD.',
}

const sections = [
  { id: 'responsable', label: 'Responsable du traitement' },
  { id: 'donnees', label: 'Données collectées' },
  { id: 'finalites', label: 'Finalités et base légale' },
  { id: 'conservation', label: 'Durée de conservation' },
  { id: 'droits', label: 'Vos droits RGPD' },
  { id: 'sous-traitants', label: 'Sous-traitants' },
  { id: 'contact', label: 'Contact DPO' },
]

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      {/* Breadcrumb */}
      <nav className="text-sm text-[var(--pp-muted)] mb-8">
        <Link href="/" className="hover:text-[var(--pp-ink)] transition-colors">Accueil</Link>
        <span className="mx-2">›</span>
        <span>Légal</span>
        <span className="mx-2">›</span>
        <span className="text-[var(--pp-ink)]">Confidentialité</span>
      </nav>

      {/* Hero */}
      <div className="mb-12">
        <h1 className="font-display text-4xl font-bold text-[var(--pp-ink)] mb-3">
          Politique de confidentialité
        </h1>
        <p className="text-[var(--pp-muted)] text-sm">
          Dernière mise à jour : 25 mai 2026 · Conforme au Règlement (UE) 2016/679 (RGPD)
        </p>
      </div>

      {/* Table des matières */}
      <div className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl p-6 mb-12">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--pp-muted)] mb-4">Table des matières</h2>
        <ol className="space-y-2">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="text-sm text-[var(--pp-info)] hover:underline"
              >
                {i + 1}. {s.label}
              </a>
            </li>
          ))}
        </ol>
      </div>

      {/* Contenu */}
      <div className="space-y-12 text-sm leading-relaxed text-[var(--pp-ink)]">

        <section id="responsable">
          <h2 className="font-display text-xl font-bold mb-4 text-[var(--pp-ink)]">1. Responsable du traitement</h2>
          <p className="text-[var(--pp-muted)] mb-3">
            Le responsable du traitement des données collectées via PoinçOn est :
          </p>
          <div className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-lg p-4 text-[var(--pp-muted)]">
            <strong className="text-[var(--pp-ink)]">Ced-IT</strong><br />
            Belgique<br />
            Email : <a href="mailto:privacy@ced-it.be" className="text-[var(--pp-info)] hover:underline">privacy@ced-it.be</a>
          </div>
        </section>

        <section id="donnees">
          <h2 className="font-display text-xl font-bold mb-4 text-[var(--pp-ink)]">2. Données collectées</h2>
          <p className="text-[var(--pp-muted)] mb-4">
            PoinçOn collecte uniquement les données nécessaires à la fourniture du service de pointage légal belge.
          </p>
          <div className="space-y-4">
            {[
              {
                title: 'Données d'identification',
                items: ['Nom et prénom', 'Adresse email professionnelle', 'Rôle dans l'entreprise (ADMIN, MANAGER, EMPLOYEE)'],
              },
              {
                title: 'Données de pointage',
                items: ['Heure d'arrivée et de départ', 'Durée de présence', 'Localisation du pointage (sur site, télétravail, déplacement)', 'Site de travail associé'],
              },
              {
                title: 'Données de navigation',
                items: ['Adresse IP (logs serveur)', 'Type de navigateur (User-Agent)', 'Actions dans l'application (audit trail)'],
              },
              {
                title: 'Données de facturation',
                items: ['Informations de paiement traitées par Stripe (non stockées chez nous)', 'Numéro de TVA de l'entreprise', 'Adresse de facturation'],
              },
            ].map(cat => (
              <div key={cat.title} className="border border-[var(--pp-line)] rounded-lg p-4">
                <h3 className="font-semibold text-[var(--pp-ink)] mb-2">{cat.title}</h3>
                <ul className="list-disc list-inside space-y-1 text-[var(--pp-muted)]">
                  {cat.items.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="finalites">
          <h2 className="font-display text-xl font-bold mb-4 text-[var(--pp-ink)]">3. Finalités et base légale</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[var(--pp-bg2)]">
                  <th className="text-left p-3 border border-[var(--pp-line)] text-[var(--pp-ink)]">Finalité</th>
                  <th className="text-left p-3 border border-[var(--pp-line)] text-[var(--pp-ink)]">Base légale</th>
                </tr>
              </thead>
              <tbody className="text-[var(--pp-muted)]">
                {[
                  ['Enregistrement du temps de travail', 'Obligation légale (CCT n°129, droit belge)'],
                  ['Gestion des comptes utilisateurs', 'Exécution du contrat'],
                  ['Envoi d'emails transactionnels', 'Exécution du contrat'],
                  ['Facturation et TVA', 'Obligation légale'],
                  ['Audit trail et sécurité', 'Intérêt légitime'],
                  ['Amélioration du service', 'Intérêt légitime'],
                ].map(([fin, base]) => (
                  <tr key={fin} className="border-b border-[var(--pp-line)]">
                    <td className="p-3 border border-[var(--pp-line)]">{fin}</td>
                    <td className="p-3 border border-[var(--pp-line)]">{base}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="conservation">
          <h2 className="font-display text-xl font-bold mb-4 text-[var(--pp-ink)]">4. Durée de conservation</h2>
          <div className="space-y-3">
            {[
              { type: 'Données de pointage', duree: '5 ans', raison: 'Obligation légale belge (Loi sur le bien-être au travail)' },
              { type: 'Données de compte', duree: 'Durée du contrat + 1 an', raison: 'Archivage légal' },
              { type: 'Logs d'audit', duree: '1 an', raison: 'Sécurité et conformité' },
              { type: 'Données de facturation', duree: '7 ans', raison: 'Obligation fiscale belge' },
              { type: 'Tokens de réinitialisation', duree: '24 heures', raison: 'Sécurité — expiration automatique' },
            ].map(row => (
              <div key={row.type} className="flex gap-4 border border-[var(--pp-line)] rounded-lg p-4">
                <div className="flex-1">
                  <span className="font-medium text-[var(--pp-ink)]">{row.type}</span>
                  <p className="text-[var(--pp-muted)] text-xs mt-1">{row.raison}</p>
                </div>
                <span className="text-[var(--pp-info)] font-semibold whitespace-nowrap">{row.duree}</span>
              </div>
            ))}
          </div>
          <p className="text-[var(--pp-muted)] mt-4">
            Après la période de conservation, les données sont soit supprimées, soit pseudo-anonymisées conformément aux exigences RGPD.
          </p>
        </section>

        <section id="droits">
          <h2 className="font-display text-xl font-bold mb-4 text-[var(--pp-ink)]">5. Vos droits RGPD</h2>
          <p className="text-[var(--pp-muted)] mb-4">
            Conformément au RGPD, vous disposez des droits suivants concernant vos données personnelles :
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { droit: 'Droit d'accès', desc: 'Obtenir une copie de vos données' },
              { droit: 'Droit de rectification', desc: 'Corriger des données inexactes' },
              { droit: 'Droit à l'effacement', desc: 'Demander la suppression de vos données' },
              { droit: 'Droit à la portabilité', desc: 'Recevoir vos données dans un format structuré' },
              { droit: 'Droit d'opposition', desc: 'Vous opposer à certains traitements' },
              { droit: 'Droit à la limitation', desc: 'Restreindre temporairement le traitement' },
            ].map(r => (
              <div key={r.droit} className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-lg p-4">
                <span className="font-semibold text-[var(--pp-ink)] text-sm">{r.droit}</span>
                <p className="text-[var(--pp-muted)] text-xs mt-1">{r.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-[var(--pp-muted)] mt-4">
            Pour exercer vos droits, contactez-nous à{' '}
            <a href="mailto:privacy@ced-it.be" className="text-[var(--pp-info)] hover:underline">privacy@ced-it.be</a>.
            Vous pouvez également introduire une réclamation auprès de l'
            <a href="https://www.autoriteprotectiondonnees.be" target="_blank" rel="noopener noreferrer" className="text-[var(--pp-info)] hover:underline">
              Autorité de Protection des Données belge
            </a>.
          </p>
        </section>

        <section id="sous-traitants">
          <h2 className="font-display text-xl font-bold mb-4 text-[var(--pp-ink)]">6. Sous-traitants</h2>
          <p className="text-[var(--pp-muted)] mb-4">
            PoinçOn fait appel aux sous-traitants suivants, tous conformes au RGPD :
          </p>
          <div className="space-y-3">
            {[
              { nom: 'Hostinger / VPS', role: 'Hébergement des serveurs et de la base de données', pays: 'UE' },
              { nom: 'Brevo (ex-Sendinblue)', role: 'Envoi d'emails transactionnels', pays: 'France (UE)' },
              { nom: 'Stripe', role: 'Traitement des paiements', pays: 'UE / USA (SCCs)' },
            ].map(s => (
              <div key={s.nom} className="flex gap-4 border border-[var(--pp-line)] rounded-lg p-4">
                <div className="flex-1">
                  <span className="font-medium text-[var(--pp-ink)]">{s.nom}</span>
                  <p className="text-[var(--pp-muted)] text-xs mt-1">{s.role}</p>
                </div>
                <span className="text-xs text-[var(--pp-muted)] bg-[var(--pp-bg2)] px-2 py-1 rounded h-fit">{s.pays}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="contact">
          <h2 className="font-display text-xl font-bold mb-4 text-[var(--pp-ink)]">7. Contact DPO</h2>
          <div className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl p-6">
            <p className="text-[var(--pp-muted)] mb-4">
              Pour toute question relative à la protection de vos données personnelles :
            </p>
            <div className="space-y-2 text-sm text-[var(--pp-muted)]">
              <div><strong className="text-[var(--pp-ink)]">Email :</strong>{' '}
                <a href="mailto:privacy@ced-it.be" className="text-[var(--pp-info)] hover:underline">privacy@ced-it.be</a>
              </div>
              <div><strong className="text-[var(--pp-ink)]">Délai de réponse :</strong> 30 jours maximum (RGPD Art. 12)</div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
