import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Sécurité & infrastructure',
  description: 'Les pratiques de sécurité de Pointon : chiffrement, infrastructure, contrôle d\'accès et gestion des incidents.',
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

const sections = [
  { id: 'chiffrement', label: 'Chiffrement & transport' },
  { id: 'auth', label: 'Authentification & accès' },
  { id: 'infrastructure', label: 'Infrastructure & sauvegardes' },
  { id: 'isolation', label: 'Isolation des données' },
  { id: 'audit', label: 'Surveillance & audit' },
  { id: 'incidents', label: 'Gestion des incidents' },
  { id: 'contact', label: 'Signaler une vulnérabilité' },
]

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      {/* Breadcrumb */}
      <nav className="text-sm text-[var(--pp-muted)] mb-8">
        <Link href="/" className="hover:text-[var(--pp-ink)] transition-colors">Accueil</Link>
        <span className="mx-2">›</span>
        <span>Légal</span>
        <span className="mx-2">›</span>
        <span className="text-[var(--pp-ink)]">Sécurité</span>
      </nav>

      {/* Hero */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 bg-[var(--pp-sky)]/10 text-[var(--pp-sky)] text-xs font-semibold px-3 py-1 rounded-full mb-4">
          <ShieldIcon />
          Sécurité by design
        </div>
        <h1 className="font-display text-4xl font-bold text-[var(--pp-ink)] mb-3">
          Pratiques de sécurité
        </h1>
        <p className="text-[var(--pp-muted)] text-sm">
          Dernière mise à jour : 25 mai 2026
        </p>
        <p className="text-[var(--pp-muted)] mt-3 leading-relaxed">
          La sécurité des données de pointage de vos employés est une priorité absolue.
          Voici comment Pointon protège vos données à chaque niveau.
        </p>
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

        <section id="chiffrement">
          <h2 className="font-display text-xl font-bold mb-4 text-[var(--pp-ink)]">1. Chiffrement & transport</h2>
          <div className="space-y-3">
            {[
              {
                title: 'HTTPS / TLS 1.3',
                desc: 'Toutes les communications entre votre navigateur et nos serveurs sont chiffrées via TLS 1.3. HTTP est automatiquement redirigé vers HTTPS.',
              },
              {
                title: 'Mots de passe bcrypt',
                desc: 'Les mots de passe ne sont jamais stockés en clair. Nous utilisons bcrypt avec un cost factor de 12, rendant les attaques par force brute impraticables.',
              },
              {
                title: 'Tokens signés (JWT)',
                desc: 'Les sessions sont gérées via des JSON Web Tokens signés avec une clé secrète serveur. Les tokens expirent automatiquement (8h sans "Se souvenir de moi", 30-90j avec).',
              },
              {
                title: 'Tokens d\'invitation & reset',
                desc: 'Les tokens d\'invitation et de réinitialisation de mot de passe sont générés de manière cryptographiquement sécurisée, à usage unique, avec expiration de 24-48h.',
              },
            ].map(item => (
              <div key={item.title} className="border border-[var(--pp-line)] rounded-lg p-4">
                <h3 className="font-semibold text-[var(--pp-ink)] mb-1">{item.title}</h3>
                <p className="text-[var(--pp-muted)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="auth">
          <h2 className="font-display text-xl font-bold mb-4 text-[var(--pp-ink)]">2. Authentification & accès</h2>
          <div className="space-y-3 text-[var(--pp-muted)]">
            <div className="border border-[var(--pp-line)] rounded-lg p-4">
              <h3 className="font-semibold text-[var(--pp-ink)] mb-2">Contrôle d'accès basé sur les rôles (RBAC)</h3>
              <p className="mb-2">Chaque utilisateur dispose d'un rôle précis qui détermine ses permissions :</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {[
                  { role: 'EMPLOYEE', desc: 'Accès à ses propres données uniquement' },
                  { role: 'MANAGER', desc: 'Accès aux données de son équipe' },
                  { role: 'ADMIN', desc: 'Gestion complète de son entreprise' },
                  { role: 'SUPER_ADMIN', desc: 'Supervision globale (Ced-IT uniquement)' },
                ].map(r => (
                  <div key={r.role} className="bg-[var(--pp-bg2)] rounded p-2">
                    <span className="font-mono text-xs font-bold text-[var(--pp-info)]">{r.role}</span>
                    <p className="text-xs mt-0.5">{r.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-[var(--pp-line)] rounded-lg p-4">
              <h3 className="font-semibold text-[var(--pp-ink)] mb-1">Rate limiting</h3>
              <p>Les endpoints sensibles (login, reset de mot de passe) sont protégés par un rate limiter pour prévenir les attaques par force brute. Limite : 3 tentatives / 15 minutes.</p>
            </div>
            <div className="border border-[var(--pp-line)] rounded-lg p-4">
              <h3 className="font-semibold text-[var(--pp-ink)] mb-1">Anti-énumération</h3>
              <p>Les réponses aux tentatives de connexion ou de reset de mot de passe sont identiques qu'un compte existe ou non, empêchant la découverte d'emails enregistrés.</p>
            </div>
          </div>
        </section>

        <section id="infrastructure">
          <h2 className="font-display text-xl font-bold mb-4 text-[var(--pp-ink)]">3. Infrastructure & sauvegardes</h2>
          <div className="space-y-3 text-[var(--pp-muted)]">
            {[
              { title: 'Docker isolé', desc: 'L\'application et la base de données sont isolées dans des conteneurs Docker, limitant la surface d\'attaque.' },
              { title: 'PostgreSQL', desc: 'Base de données relationnelle robuste avec contraintes d\'intégrité, transactions ACID et journalisation des modifications.' },
              { title: 'Sauvegardes régulières', desc: 'Les données sont sauvegardées quotidiennement. Les sauvegardes sont chiffrées et stockées dans une localisation géographique distincte.' },
              { title: 'VPS dédié (Hostinger)', desc: 'Hébergement sur serveur virtuel dédié en zone UE, sans partage de ressources avec d\'autres clients.' },
            ].map(item => (
              <div key={item.title} className="flex gap-3 border border-[var(--pp-line)] rounded-lg p-4">
                <div className="w-2 h-2 rounded-full bg-[var(--pp-sky)] mt-1.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-[var(--pp-ink)]">{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="isolation">
          <h2 className="font-display text-xl font-bold mb-4 text-[var(--pp-ink)]">4. Isolation des données</h2>
          <p className="text-[var(--pp-muted)] mb-4">
            Pointon est une application multi-tenant : chaque entreprise dispose de ses propres données
            totalement isolées. Cette isolation est garantie à plusieurs niveaux :
          </p>
          <div className="space-y-3 text-[var(--pp-muted)]">
            {[
              'Toutes les requêtes API filtrent systématiquement par companyId',
              'Aucune donnée d\'une entreprise ne peut être accessible depuis un compte d\'une autre entreprise',
              'Les admins ne peuvent gérer que les utilisateurs de leur propre entreprise',
              'Les exports (CSV, PDF) sont filtrés par entreprise et vérifiés côté serveur',
            ].map(item => (
              <div key={item} className="flex items-start gap-3 bg-[var(--pp-bg2)] rounded-lg p-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--pp-pos)] mt-1.5 flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="audit">
          <h2 className="font-display text-xl font-bold mb-4 text-[var(--pp-ink)]">5. Surveillance & audit</h2>
          <p className="text-[var(--pp-muted)] mb-4">
            Toutes les actions sensibles sont enregistrées dans un audit trail immuable :
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-[var(--pp-muted)]">
            {[
              'Connexions / déconnexions',
              'Pointages (arrivée / départ)',
              'Modifications de données utilisateur',
              'Approbation / rejet de demandes',
              'Changements de mot de passe',
              'Invitations et suppressions de comptes',
              'Ajustements de solde',
              'Exports de données',
            ].map(action => (
              <div key={action} className="flex items-center gap-2 border border-[var(--pp-line)] rounded-lg px-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--pp-info)] flex-shrink-0" />
                <span className="text-xs">{action}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="incidents">
          <h2 className="font-display text-xl font-bold mb-4 text-[var(--pp-ink)]">6. Gestion des incidents</h2>
          <div className="space-y-3 text-[var(--pp-muted)]">
            <p>
              En cas de violation de données ou d'incident de sécurité, Pointon s'engage à :
            </p>
            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>Identifier et contenir l'incident dans les 4 heures</li>
              <li>Notifier les entreprises concernées dans les 24 heures</li>
              <li>Notifier l'Autorité de Protection des Données belge dans les 72 heures (art. 33 RGPD)</li>
              <li>Publier un rapport post-incident dans les 30 jours</li>
            </ol>
          </div>
        </section>

        <section id="contact">
          <h2 className="font-display text-xl font-bold mb-4 text-[var(--pp-ink)]">7. Signaler une vulnérabilité</h2>
          <div className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl p-6">
            <p className="text-[var(--pp-muted)] mb-4">
              Si vous découvrez une vulnérabilité de sécurité dans Pointon, nous vous encourageons
              à nous la signaler de manière responsable (responsible disclosure). Nous nous engageons
              à répondre dans les 48 heures et à corriger les vulnérabilités critiques dans les 7 jours.
            </p>
            <div className="space-y-2 text-sm text-[var(--pp-muted)]">
              <div>
                <strong className="text-[var(--pp-ink)]">Email de sécurité :</strong>{' '}
                <a href="mailto:security@ced-it.be" className="text-[var(--pp-info)] hover:underline">security@ced-it.be</a>
              </div>
              <div>
                <strong className="text-[var(--pp-ink)]">PGP :</strong>{' '}
                <span>Disponible sur demande</span>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
