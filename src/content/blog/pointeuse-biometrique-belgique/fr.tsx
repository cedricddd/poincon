import type { BlogMeta } from '@/lib/blog'
import { Link } from '@/i18n/navigation'
import { Callout, KeyTakeaway } from '../_components'

export const meta: BlogMeta = {
  title: 'Pointeuse biométrique en Belgique : est-ce légal ?',
  description:
    "Empreinte digitale, reconnaissance faciale : ce que dit le RGPD, l'amende de 45 000 € infligée en 2024, et que faire si vous avez déjà une pointeuse biométrique.",
  publishedAt: '2026-10-02',
  updatedAt: '2026-10-02',
  keywords: [
    'pointeuse biométrique',
    'pointeuse biométrique réglementation',
    'pointage biométrique',
    'pointeuse empreinte digitale',
    'pointeuse reconnaissance faciale',
    'pointeuse biométrique belgique',
  ],
  faq: [
    {
      q: 'Une pointeuse biométrique est-elle interdite en Belgique ?',
      a: "Pas formellement, mais elle est en pratique presque impossible à justifier pour enregistrer le temps de travail. Les données biométriques sont interdites de traitement sauf exception (article 9 du RGPD), le consentement d'un travailleur n'est pas considéré comme libre, et aucune loi belge ne prévoit la biométrie pour la gestion des horaires.",
    },
    {
      q: 'Le consentement écrit du travailleur suffit-il ?',
      a: "Non. Selon l'Autorité de protection des données, le déséquilibre de pouvoir entre employeur et travailleur empêche un consentement réellement libre. Dans la décision du 6 septembre 2024, la signature des documents d'accueil n'a pas suffi.",
    },
    {
      q: 'La reconnaissance faciale est-elle traitée comme l’empreinte digitale ?',
      a: "Oui. Dès qu'un visage est analysé pour identifier une personne de manière unique, il s'agit d'une donnée biométrique au sens du RGPD, avec le même régime que l'empreinte.",
    },
    {
      q: 'Que faire si on utilise déjà une pointeuse à empreinte ?',
      a: "Passer à une méthode non biométrique (badge, code personnel, application), supprimer les gabarits biométriques enregistrés, et mettre à jour l'information donnée aux travailleurs et le registre des traitements. Beaucoup d'appareils biométriques acceptent aussi un badge ou un code.",
    },
  ],
}

export default function Body() {
  return (
    <>
      <KeyTakeaway>
        <ul>
          <li>
            <strong>Empreinte, visage, paume, iris</strong> : ce sont des données biométriques, dont le traitement
            est <strong>interdit par principe</strong> (article 9 du RGPD).
          </li>
          <li>
            Le <strong>consentement du travailleur ne suffit pas</strong> : il n&apos;est pas considéré comme libre
            dans une relation de travail.
          </li>
          <li>
            Le <strong>6 septembre 2024</strong>, un employeur belge a reçu une <strong>amende de 45 000 €</strong>{' '}
            pour un pointage par empreinte.
          </li>
          <li>
            Un badge, un code personnel ou une application font le même travail,{' '}
            <strong>sans aucun risque RGPD</strong>.
          </li>
        </ul>
      </KeyTakeaway>

      <p>
        Les pointeuses à empreinte digitale ou à reconnaissance faciale sont vendues partout, souvent pour
        quelques centaines d&apos;euros, avec un argument séduisant : impossible de pointer à la place d&apos;un
        collègue. Techniquement, ça fonctionne. Juridiquement, en Belgique, c&apos;est une autre histoire — et
        avec l&apos;
        <Link href="/blog/pointage-obligatoire-belgique-2027">obligation d&apos;enregistrer le temps de travail
        attendue pour 2027</Link>, beaucoup d&apos;entreprises vont se poser la question.
      </p>

      <h2>Qu&apos;est-ce qu&apos;une donnée biométrique ?</h2>
      <p>
        Le RGPD définit les données biométriques comme des données issues d&apos;un traitement technique
        spécifique des caractéristiques physiques d&apos;une personne, qui permettent de l&apos;
        <strong>identifier de manière unique</strong>. Pour une pointeuse, cela couvre :
      </p>
      <ul>
        <li>l&apos;empreinte digitale ;</li>
        <li>la reconnaissance faciale ;</li>
        <li>le réseau veineux de la paume ou du doigt ;</li>
        <li>l&apos;iris.</li>
      </ul>
      <p>
        Peu importe que l&apos;appareil stocke une image ou un simple « gabarit » chiffré : dès qu&apos;il sert à
        reconnaître la personne, c&apos;est une donnée biométrique.
      </p>

      <h2>Pourquoi c&apos;est interdit par principe</h2>
      <p>
        Les données biométriques font partie des <strong>catégories particulières</strong> de l&apos;article 9
        du RGPD. Leur traitement est interdit, sauf si l&apos;employeur peut invoquer une des exceptions prévues.
        Pour une pointeuse, aucune ne tient vraiment :
      </p>
      <ul>
        <li>
          <strong>Le consentement</strong> : l&apos;Autorité de protection des données (APD) considère que, vu le
          déséquilibre de pouvoir entre employeur et travailleur, ce consentement ne peut pas être « libre ».
        </li>
        <li>
          <strong>Une base légale</strong> : il faudrait une loi belge qui prévoie la biométrie pour la gestion du
          temps de travail. Elle n&apos;existe pas. Selon l&apos;APD, une telle base légale est « quasiment
          toujours requise » au travail.
        </li>
      </ul>

      <h2>La décision de l&apos;APD du 6 septembre 2024 : 45 000 € d&apos;amende</h2>
      <p>
        La Chambre contentieuse de l&apos;APD a sanctionné un employeur qui faisait pointer son personnel par
        empreinte digitale. Les manquements retenus :
      </p>
      <ul>
        <li>
          <strong>Un consentement ni éclairé ni libre</strong> : la brochure d&apos;accueil informait
          insuffisamment, et la signature des documents ne prouvait pas un accord réel ;
        </li>
        <li>
          <strong>Une violation de la minimisation</strong> : des moyens moins intrusifs (badge, carte, code
          d&apos;accès) permettaient d&apos;atteindre le même but ;
        </li>
        <li>
          <strong>Pas d&apos;analyse d&apos;impact (AIPD)</strong>, alors que le traitement remplissait plusieurs
          critères qui la rendaient obligatoire ;
        </li>
        <li>
          <strong>Des finalités non documentées</strong> avant la mise en service : certaines justifications
          n&apos;ont été avancées qu&apos;au cours de la procédure.
        </li>
      </ul>
      <p>
        Le message est clair : quand un badge ou un code suffit, la biométrie est disproportionnée.
      </p>

      <h2>Les conditions minimales, si on insiste</h2>
      <p>
        La{' '}
        <a
          href="https://www.autoriteprotectiondonnees.be/publications/recommandation-01-2021-du-1-decembre-2021.pdf"
          rel="nofollow noopener"
          target="_blank"
        >
          recommandation 01/2021
        </a>{' '}
        de l&apos;APD et sa page sur la biométrie au travail fixent un cadre très strict :
      </p>
      <ul>
        <li>
          le gabarit biométrique doit être conservé <strong>par le travailleur lui-même</strong> (par exemple sur
          son badge), pas dans une base centrale de l&apos;employeur — sauf cas exceptionnels ;
        </li>
        <li>
          une <strong>alternative équivalente</strong> doit être proposée à qui refuse, sans conséquence pour
          lui ;
        </li>
        <li>une analyse d&apos;impact, une information complète et une inscription au registre des traitements.</li>
      </ul>
      <p>
        La plupart des pointeuses biométriques du marché stockent les empreintes dans l&apos;appareil ou dans
        un logiciel central : elles ne remplissent donc pas la première condition. Et si tout le monde doit de
        toute façon disposer d&apos;une alternative, la biométrie n&apos;apporte plus grand-chose.
      </p>

      <h2>Vous avez déjà une pointeuse biométrique ? Que faire</h2>
      <ol>
        <li>
          <strong>Arrêtez l&apos;enrôlement</strong> de nouveaux travailleurs par empreinte ou visage.
        </li>
        <li>
          <strong>Passez à un mode non biométrique</strong>. Beaucoup d&apos;appareils acceptent aussi un badge ou
          un code : vérifiez avant de racheter du matériel.
        </li>
        <li>
          <strong>Supprimez les gabarits biométriques</strong>, dans l&apos;appareil comme dans le logiciel
          associé, et gardez une trace de cette suppression.
        </li>
        <li>
          <strong>Mettez à jour</strong> l&apos;information donnée aux travailleurs (règlement de travail ou note
          dédiée) et le registre des traitements.
        </li>
        <li>
          <strong>Conservez les données de pointage</strong> elles-mêmes (heures d&apos;arrivée et de départ) :
          elles restent nécessaires pour vos obligations sociales.
        </li>
      </ol>

      <h2>Et la fraude au pointage ?</h2>
      <p>
        C&apos;est l&apos;argument principal de la biométrie : empêcher un collègue de pointer pour un autre. En
        pratique, des mesures simples réduisent fortement ce risque :
      </p>
      <ul>
        <li>un <strong>code personnel</strong> par travailleur, plutôt qu&apos;un badge qu&apos;on peut prêter ;</li>
        <li>un <strong>horodatage côté serveur</strong>, qu&apos;on ne peut pas modifier depuis l&apos;appareil ;</li>
        <li>
          un <strong>journal d&apos;audit</strong> qui garde la trace de chaque correction : qui l&apos;a faite,
          quand et pourquoi ;
        </li>
        <li>une validation régulière des heures par le responsable, qui repère vite les incohérences.</li>
      </ul>
      <p>
        Pour les autres méthodes et leurs règles RGPD (badge, application, GPS), voir{' '}
        <Link href="/blog/pointeuse-rgpd-belgique">Pointeuse et RGPD en Belgique</Link>.
      </p>

      <Callout>
        Pointon fonctionne <strong>sans biométrie et sans GPS</strong> : code personnel sur une borne partagée,
        application sur smartphone, horodatage côté serveur et journal d&apos;audit.{' '}
        <Link href="/comparaison">Comparer les solutions</Link>.
      </Callout>

      <h2>Pour aller plus loin</h2>
      <ul>
        <li>
          <Link href="/blog/pointeuse-rgpd-belgique">Pointeuse et RGPD en Belgique : GPS et vie privée</Link>
        </li>
        <li>
          <Link href="/blog/pointage-obligatoire-belgique-2027">
            Pointeuse obligatoire en 2027 : ce que dit la loi belge
          </Link>
        </li>
        <li>
          <Link href="/blog/pointeuse-mobile-smartphone">Pointeuse mobile : smartphone, QR code ou tablette ?</Link>
        </li>
      </ul>

      <h2>Sources</h2>
      <ul>
        <li>
          Autorité de protection des données —{' '}
          <a
            href="https://www.autoriteprotectiondonnees.be/professionnel/themes/vie-privee-sur-le-lieu-de-travail/donnees-sensibles/biometrie-sur-le-lieu-de-travail"
            rel="nofollow noopener"
            target="_blank"
          >
            « Biométrie sur le lieu de travail »
          </a>
        </li>
        <li>
          Autorité de protection des données —{' '}
          <a
            href="https://www.autoriteprotectiondonnees.be/publications/recommandation-01-2021-du-1-decembre-2021.pdf"
            rel="nofollow noopener"
            target="_blank"
          >
            Recommandation 01/2021 du 1ᵉʳ décembre 2021 relative au traitement de données biométriques
          </a>
        </li>
        <li>
          Claeys &amp; Engels —{' '}
          <a
            href="https://www.claeysengels.be/fr-be/nouvelles-evenements/traitement-des-donnees-biometriques-au-travail-lutilisation-dun-systeme"
            rel="nofollow noopener"
            target="_blank"
          >
            « L&apos;utilisation d&apos;un système d&apos;enregistrement du temps par empreintes digitales est
            contraire au RGPD »
          </a>
        </li>
        <li>
          Securex —{' '}
          <a
            href="https://www.securex.be/fr/lex4you/employeur/actualites/45%E2%80%89000-euros-d-amende-pour-l-enregistrement-du-temps-par-le-biais-d-empreintes-digitales"
            rel="nofollow noopener"
            target="_blank"
          >
            « 45 000 euros d&apos;amende pour l&apos;enregistrement du temps par empreintes digitales »
          </a>
        </li>
      </ul>

      <p className="blog-prose__note">
        Dernière vérification : 2 octobre 2026. Cet article informe, il ne remplace pas un avis juridique.
      </p>
    </>
  )
}
