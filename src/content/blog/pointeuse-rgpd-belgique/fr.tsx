import type { BlogMeta } from '@/lib/blog'
import { Link } from '@/i18n/navigation'
import { Callout, KeyTakeaway } from '../_components'

export const meta: BlogMeta = {
  title: 'Pointeuse et RGPD en Belgique : GPS, biométrie et vie privée',
  description:
    "Badge, application, logiciel : ces méthodes de pointage ne posent aucun problème RGPD. L'empreinte digitale, elle, est quasi interdite pour enregistrer le temps de travail. Ce que dit l'Autorité de protection des données.",
  publishedAt: '2026-09-07',
  updatedAt: '2026-09-07',
  keywords: [
    'pointeuse rgpd belgique',
    'badgeuse conforme rgpd',
    'pointeuse sans gps',
    'pointeuse biométrique rgpd',
    'enregistrement temps de travail vie privée',
  ],
  faq: [
    {
      q: 'Une pointeuse par empreinte digitale est-elle légale en Belgique ?',
      a: "En pratique, non, pour enregistrer le temps de travail. L'empreinte est une donnée sensible et l'Autorité de protection des données considère que le consentement d'un travailleur n'est pas « libre » dans une relation de travail. En 2024, un employeur a été sanctionné de 45 000 € pour un pointage par empreinte.",
    },
    {
      q: 'Peut-on utiliser le GPS au moment du pointage ?',
      a: "Oui, à condition de respecter strictement le RGPD : finalité limitée au pointage, information préalable des travailleurs, proportionnalité. Le suivi GPS continu des déplacements, lui, est beaucoup plus restreint et ne peut pas servir à surveiller en permanence.",
    },
    {
      q: 'Quelles méthodes de pointage ne posent aucun problème RGPD ?',
      a: "Un badge, une application mobile, un code personnel ou un logiciel RH. Ils n'enregistrent qu'un identifiant et un horodatage : c'est le minimum de données nécessaire, conforme au principe de minimisation.",
    },
    {
      q: 'Combien de temps faut-il conserver les données de pointage ?',
      a: "Cinq ans. Les données doivent rester accessibles au travailleur concerné et être supprimées ou anonymisées au terme de cette période.",
    },
  ],
}

export default function Body() {
  return (
    <>
      <KeyTakeaway>
        <ul>
          <li>
            <strong>Badge, application, code, logiciel RH</strong> : aucune difficulté RGPD — ces méthodes
            enregistrent le strict minimum.
          </li>
          <li>
            <strong>Empreinte digitale, reconnaissance faciale</strong> : à éviter. L&apos;Autorité de protection
            des données les juge disproportionnées pour un simple pointage (amende de 45 000 € en 2024).
          </li>
          <li>
            <strong>GPS au moment du pointage</strong> : possible, mais strictement encadré. Pas de suivi continu
            des déplacements.
          </li>
          <li>
            Information préalable des travailleurs obligatoire · conservation des données <strong>5 ans</strong>.
          </li>
        </ul>
      </KeyTakeaway>

      <p>
        L&apos;
        <Link href="/blog/pointage-obligatoire-belgique-2027">obligation d&apos;enregistrer le temps de travail
        prévue pour 2027</Link>{' '}
        ne dit pas <em>comment</em> pointer. C&apos;est le RGPD qui fixe les limites. Bonne nouvelle : les
        méthodes les plus courantes sont aussi les plus simples à mettre en conformité.
      </p>

      <h2>Les méthodes qui ne posent aucun problème</h2>
      <p>
        Un badge, une application sur smartphone, un code personnel saisi sur une borne ou un logiciel RH
        accessible depuis un navigateur : tous enregistrent uniquement <strong>un identifiant et un horodatage</strong>.
        C&apos;est exactement le principe de minimisation du RGPD — on ne collecte que ce qui est nécessaire à la
        finalité. Rien de sensible, rien de disproportionné.
      </p>

      <h2>Pointeuse biométrique : pourquoi c&apos;est à éviter</h2>
      <p>
        L&apos;empreinte digitale et la reconnaissance faciale sont des <strong>données biométriques</strong>,
        une catégorie particulière au sens de l&apos;article 9 du RGPD. Leur traitement est en principe interdit,
        sauf exception.
      </p>
      <p>
        Dans une décision du <strong>6 septembre 2024</strong>, l&apos;Autorité de protection des données a
        infligé une <strong>amende de 45 000 €</strong> à un employeur qui utilisait l&apos;empreinte comme
        unique méthode de pointage. Les motifs :
      </p>
      <ul>
        <li>
          le <strong>consentement n&apos;était pas « libre »</strong> : dans une relation de travail, le
          déséquilibre de pouvoir empêche un consentement réellement volontaire (et ici, il n&apos;était que
          tacite, via la signature du règlement de travail) ;
        </li>
        <li>l&apos;information préalable donnée aux travailleurs était insuffisante ;</li>
        <li>
          des <strong>systèmes moins intrusifs existaient</strong> pour atteindre le même but — violation du
          principe de minimisation ;
        </li>
        <li>pas d&apos;analyse d&apos;impact (AIPD), registre des traitements incomplet.</li>
      </ul>
      <p>
        L&apos;Autorité est constante sur ce point : la biométrie est <strong>rarement justifiée</strong> dans la
        gestion des horaires.
      </p>

      <h2>Et si on veut quand même de la biométrie ?</h2>
      <p>
        Il faudrait une <strong>base légale nationale</strong> prévoyant explicitement que ce traitement
        biométrique est proportionné et légitime — elle n&apos;existe pas pour la gestion du temps de travail.
        À défaut, il faut au minimum : proposer une <strong>alternative équivalente</strong> au travailleur qui
        refuse, et stocker le gabarit biométrique <strong>sur le support du travailleur</strong> (son badge),
        pas dans une base centrale contrôlée par l&apos;employeur. Autant dire que, pour du pointage, ça n&apos;en
        vaut pas la peine.
      </p>

      <h2>Géolocalisation GPS au moment du pointage</h2>
      <p>
        Enregistrer la position <em>à l&apos;instant du pointage</em> peut être considéré comme objectif et
        fiable, à condition de respecter les quatre principes rappelés par l&apos;Autorité :{' '}
        <strong>légalité, légitimité, proportionnalité et transparence</strong>. Concrètement : finalité limitée
        au pointage, information préalable des travailleurs, aucune donnée collectée au-delà du nécessaire.
      </p>
      <p>
        Le <strong>suivi GPS continu</strong> des déplacements d&apos;un travailleur, lui, est une tout autre
        histoire : il n&apos;est admis que dans des cas précis (sécurité, logistique) et jamais comme outil de
        surveillance permanente. Une pointeuse n&apos;en a pas besoin.
      </p>

      <h2>Vos obligations RGPD en pratique</h2>
      <ul>
        <li>
          <strong>Informer</strong> les travailleurs : finalité, données collectées, durée de conservation, leurs
          droits — dans le règlement de travail ou une note dédiée, <em>avant</em> la mise en service.
        </li>
        <li>
          <strong>Inscrire</strong> le traitement au registre des activités de traitement.
        </li>
        <li>
          Réaliser une <strong>analyse d&apos;impact (AIPD)</strong> si le traitement présente un risque élevé
          (c&apos;est le cas de la biométrie ; rarement pour un badge).
        </li>
        <li>
          <strong>Conserver</strong> les données cinq ans, les garder accessibles au travailleur concerné, puis
          les supprimer ou les anonymiser.
        </li>
        <li>
          <strong>Sécuriser</strong> l&apos;accès (chiffrement, droits limités) et tracer les modifications.
        </li>
      </ul>

      <Callout>
        Pointon enregistre l&apos;heure d&apos;arrivée et de départ avec un horodatage côté serveur —{' '}
        <strong>sans GPS, sans biométrie</strong> — et un journal d&apos;audit infalsifiable.{' '}
        <Link href="/comparaison">Comparer les solutions</Link>.
      </Callout>

      <h2>Pour aller plus loin</h2>
      <ul>
        <li>
          <Link href="/blog/pointeuse-mobile-smartphone">Pointeuse mobile : pointer sur smartphone, sans GPS</Link>
        </li>
        <li>
          <Link href="/blog/pointage-obligatoire-belgique-2027">
            Pointage obligatoire en Belgique : où en est la loi de 2027 ?
          </Link>
        </li>
        <li>
          <Link href="/blog/enregistrer-temps-travail-methodes">
            Enregistrer le temps de travail : quelle méthode choisir ?
          </Link>
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
          </a>{' '}
          et{' '}
          <a
            href="https://www.autoriteprotectiondonnees.be/professionnel/themes/vie-privee-sur-le-lieu-de-travail/surveillance-de-l-employeur/geolocalisation"
            rel="nofollow noopener"
            target="_blank"
          >
            « Géolocalisation »
          </a>
        </li>
        <li>
          Securex —{' '}
          <a
            href="https://www.securex.be/fr/lex4you/employeur/actualites/45%E2%80%89000-euros-d-amende-pour-l-enregistrement-du-temps-par-le-biais-d-empreintes-digitales"
            rel="nofollow noopener"
            target="_blank"
          >
            « 45 000 euros d&apos;amende pour l&apos;enregistrement du temps par empreintes digitales »
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
      </ul>

      <p className="blog-prose__note">
        Dernière vérification : 7 septembre 2026. La décision de l&apos;Autorité de protection des données citée
        ici (6 septembre 2024) reste la référence en matière de biométrie au travail.
      </p>
    </>
  )
}
