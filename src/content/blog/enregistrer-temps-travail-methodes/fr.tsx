import type { BlogMeta } from '@/lib/blog'
import { Link } from '@/i18n/navigation'
import { Callout, KeyTakeaway } from '../_components'

export const meta: BlogMeta = {
  title: 'Enregistrer le temps de travail : quelle méthode choisir ? (2027)',
  description:
    "Badge, application mobile, borne, QR code, logiciel web, Excel : chaque méthode d'enregistrement du temps de travail a ses forces et ses limites. Comment choisir selon votre réalité, et pourquoi Excel risque de ne plus suffire en 2027.",
  publishedAt: '2026-09-07',
  updatedAt: '2026-09-07',
  keywords: [
    'enregistrement du temps de travail méthode',
    'comment fonctionne une pointeuse au travail',
    'système de pointage entreprise',
    'pointeuse mobile',
    'alternative excel pointage',
  ],
  faq: [
    {
      q: "Une feuille Excel suffit-elle pour enregistrer le temps de travail ?",
      a: "C'est légalement autorisé, mais fragile. Un fichier Excel est modifiable après coup sans laisser de trace et repose sur un horodatage déclaratif : il remplit mal les critères « objectif » et « fiable » attendus. Beaucoup d'entreprises devront passer à un système plus robuste.",
    },
    {
      q: 'Faut-il un smartphone pour chaque employé ?',
      a: "Non. La borne (kiosque) sur site fonctionne sans smartphone, avec un code personnel. Le badge aussi. Le smartphone n'est nécessaire que pour l'application mobile et, souvent, le QR code.",
    },
    {
      q: 'Quelle méthode pour des équipes sur le terrain ?',
      a: "L'application mobile est la plus adaptée : chaque personne pointe depuis son téléphone, où qu'elle soit. Un QR code imprimé par chantier ou par site est une bonne solution complémentaire.",
    },
    {
      q: "Le système doit-il enregistrer chaque minute, ou seulement les écarts ?",
      a: "Il peut se contenter d'enregistrer les écarts par rapport à l'horaire convenu, tant que le résultat reflète le temps réellement presté.",
    },
  ],
}

export default function Body() {
  return (
    <>
      <KeyTakeaway>
        <ul>
          <li>
            <strong>Libre choix</strong> de la méthode — tant que le système est objectif, fiable et accessible.
          </li>
          <li>
            <strong>Excel ou papier</strong> : autorisé, mais faible sur l&apos;objectivité et la fiabilité. Huit
            entreprises belges sur dix en sont encore là.
          </li>
          <li>
            Le système peut n&apos;enregistrer que les <strong>écarts</strong> par rapport à l&apos;horaire prévu.
          </li>
          <li>Choisissez selon votre réalité : bureau fixe, terrain, télétravail, ou un mélange.</li>
        </ul>
      </KeyTakeaway>

      <p>
        L&apos;
        <Link href="/blog/pointage-obligatoire-belgique-2027">obligation attendue pour 2027</Link> laisse chaque
        employeur libre de sa méthode. Le seul cadre : le système doit permettre de mesurer le temps de travail
        quotidien de manière <strong>objective, fiable et accessible</strong>. Voici ce que ça implique, méthode
        par méthode.
      </p>

      <h2>Les trois critères à respecter</h2>
      <ul>
        <li>
          <strong>Objectif</strong> : l&apos;enregistrement ne repose pas sur une simple déclaration. Un
          horodatage indépendant (côté serveur) vaut mieux qu&apos;une heure saisie à la main.
        </li>
        <li>
          <strong>Fiable</strong> : les données sont infalsifiables et toute correction laisse une trace.
        </li>
        <li>
          <strong>Accessible</strong> : le travailleur peut consulter ses propres enregistrements.
        </li>
      </ul>

      <h2>Badge / badgeuse électronique</h2>
      <p>
        Le grand classique : chaque personne passe son badge à l&apos;entrée. Simple, éprouvé, rapide à adopter.
      </p>
      <p>
        <strong>Limites</strong> : la perte de badge est fréquente, le matériel a un coût d&apos;installation et
        d&apos;entretien, et surtout le badge n&apos;est <strong>pas adapté au télétravail</strong> ni aux
        équipes mobiles.
      </p>

      <h2>Application mobile</h2>
      <p>
        Chaque personne pointe depuis son smartphone, en un geste, où qu&apos;elle soit. C&apos;est la solution
        idéale pour les <strong>équipes sur le terrain et le télétravail</strong>, sans aucun matériel à
        installer.
      </p>
      <p>
        <strong>Limites</strong> : dépend du smartphone de chacun et de sa connexion (un bon système fonctionne
        toutefois hors ligne et synchronise ensuite).
      </p>

      <h2>Borne ou kiosque sur site</h2>
      <p>
        Une tablette ou un terminal à l&apos;entrée, avec un code personnel. Parfait pour les{' '}
        <strong>équipes fixes</strong> qui n&apos;ont pas toutes un smartphone professionnel.
      </p>
      <p>
        <strong>Limites</strong> : un point de passage unique peut créer une file le matin ; il faut un appareil
        dédié par site.
      </p>

      <h2>QR code par site</h2>
      <p>
        Un QR code imprimé par site ou par chantier ; un scan = un pointage horodaté. Coût quasi nul, difficile
        à falsifier si l&apos;horodatage est fait côté serveur.
      </p>
      <p>
        <strong>Limites</strong> : suppose un smartphone, et un QR mal placé peut être scanné à distance —
        l&apos;horodatage serveur et un contrôle de cohérence limitent le risque.
      </p>

      <h2>Logiciel web / interface navigateur</h2>
      <p>
        Le pointage depuis n&apos;importe quel ordinateur, via un navigateur. Utile pour les postes
        administratifs.
      </p>
      <p>
        <strong>Limites</strong> : suppose un poste de travail disponible ; peu pratique pour qui n&apos;est
        jamais devant un écran.
      </p>

      <h2>Excel ou feuille papier : autorisé, mais…</h2>
      <p>
        Un tableur ou un relevé papier reste une méthode <strong>légalement admise</strong>. Mais elle coche mal
        deux critères sur trois : un fichier Excel se modifie après coup <strong>sans laisser de trace</strong>,
        et l&apos;heure y est saisie manuellement — donc déclarative, pas objective.
      </p>
      <p>
        Or huit entreprises belges sur dix utilisent encore un système traditionnel de ce type. Beaucoup
        devront changer d&apos;ici 2027 pour un dispositif qui horodate réellement et trace les corrections.
      </p>

      <h2>Comment choisir</h2>
      <ul>
        <li>
          <strong>Bureau, équipe fixe</strong> → badge ou borne à code.
        </li>
        <li>
          <strong>Terrain, multi-sites, chantiers</strong> → application mobile, complétée par un QR code par
          site.
        </li>
        <li>
          <strong>Télétravail</strong> → application mobile ou interface web.
        </li>
        <li>
          <strong>Situation mixte</strong> → combiner deux méthodes dans le même outil plutôt que d&apos;en
          empiler plusieurs.
        </li>
      </ul>

      <Callout>
        Pointon réunit application mobile, kiosque tablette, QR code par site et interface web dans un seul
        outil, avec horodatage serveur et journal d&apos;audit. <Link href="/comparaison">Comparer les
        solutions</Link>.
      </Callout>

      <h2>Pour aller plus loin</h2>
      <ul>
        <li>
          <Link href="/blog/pointage-obligatoire-belgique-2027">
            Pointage obligatoire en Belgique : où en est la loi de 2027 ?
          </Link>
        </li>
        <li>
          <Link href="/blog/pointeuse-rgpd-belgique">
            Pointeuse et RGPD : GPS, biométrie et vie privée
          </Link>
        </li>
      </ul>

      <h2>Sources</h2>
      <ul>
        <li>
          HRmagazine —{' '}
          <a href="https://hrmagazine.be/fr/posts/enregistrement-des-temps-de-travail-la-pointeuse-regne-toujours" rel="nofollow noopener" target="_blank">
            « Enregistrement des temps de travail : la pointeuse règne toujours »
          </a>
        </li>
        <li>
          Securex —{' '}
          <a href="https://www.securex.be/fr/lex4you/employeur/actualites/enregistrement-du-temps-de-travail-obligatoire-a-partir-de-2027" rel="nofollow noopener" target="_blank">
            « Enregistrement du temps de travail obligatoire à partir de 2027 »
          </a>
        </li>
        <li>
          SD&nbsp;Worx —{' '}
          <a href="https://www.sdworx.be/fr-be/actua-tendances/gestion-temps-effectifs/enregistrement-temps-travail" rel="nofollow noopener" target="_blank">
            « 7 questions sur l&apos;enregistrement obligatoire du temps de travail en 2027 »
          </a>
        </li>
      </ul>

      <p className="blog-prose__note">Dernière vérification : 7 septembre 2026.</p>
    </>
  )
}
