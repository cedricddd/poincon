import type { BlogMeta } from '@/lib/blog'
import { Link } from '@/i18n/navigation'
import { Callout, KeyTakeaway } from '../_components'

export const meta: BlogMeta = {
  title: 'Pointeuse mobile : pointer sur smartphone, sans GPS',
  description:
    "Chantier, nettoyage, aide à domicile, commerciaux : comment faire pointer une équipe mobile sur smartphone en Belgique, sans GPS ni biométrie, et rester conforme.",
  publishedAt: '2026-09-24',
  updatedAt: '2026-09-24',
  keywords: [
    'pointeuse mobile',
    'pointeuse sur smartphone',
    'pointeuse mobile pour chantier',
    'pointeuse horaire mobile',
    'application pointage smartphone',
    'pointeuse sans gps',
  ],
  faq: [
    {
      q: 'Peut-on faire pointer ses travailleurs sur leur smartphone personnel ?',
      a: "Oui. Une application web qui s'ouvre dans le navigateur ne demande aucune installation depuis un store et n'accède ni aux contacts, ni aux photos, ni à la position. Pour les travailleurs sans smartphone, une tablette à l'entrée du site avec un code personnel fait le même travail.",
    },
    {
      q: 'Faut-il un GPS pour vérifier qu’un travailleur est bien sur le chantier ?',
      a: "Non. Un QR code affiché sur le site, combiné à un code personnel, rattache le pointage au bon lieu sans collecter de position. Le GPS reste possible juridiquement, mais il impose des obligations RGPD lourdes (finalité, proportionnalité, information préalable) pour un bénéfice limité.",
    },
    {
      q: 'Que se passe-t-il si un travailleur oublie de pointer ?',
      a: "Il introduit une demande de correction, que le responsable valide ou refuse. L'heure initiale, la modification, son auteur et sa raison restent enregistrés : c'est cette traçabilité qui rend l'enregistrement fiable en cas de contrôle.",
    },
    {
      q: 'Les travailleurs itinérants devront-ils pointer à partir de 2027 ?',
      a: "Les travailleurs itinérants figurent parmi les exceptions probables de la future loi belge, mais la liste définitive n'est pas encore fixée. Beaucoup d'équipes « mobiles » (chantier, nettoyage, soins à domicile) travaillent cependant sur des sites fixes et seront concernées.",
    },
    {
      q: 'Une pointeuse mobile remplace-t-elle Checkin@Work ?',
      a: "Non. Checkin@Work est une déclaration de présence distincte, exigée dans certains secteurs (travaux immobiliers au-delà d'un seuil, livraison de béton prêt à l'emploi, secteur de la viande). L'enregistrement du temps de travail s'y ajoute, il ne le remplace pas.",
    },
  ],
}

export default function Body() {
  return (
    <>
      <KeyTakeaway>
        <ul>
          <li>
            Une <strong>pointeuse mobile</strong>, c&apos;est le smartphone du travailleur, un QR code affiché sur le
            site ou une tablette à l&apos;entrée — pas un boîtier à fixer au mur.
          </li>
          <li>
            Le <strong>GPS n&apos;est pas nécessaire</strong> : un QR code sur le site rattache le pointage au bon lieu
            sans suivre personne.
          </li>
          <li>
            Ce qui rend l&apos;enregistrement fiable, c&apos;est la <strong>traçabilité des corrections</strong>, pas la
            surveillance.
          </li>
          <li>
            Checkin@Work reste une obligation <strong>distincte</strong> dans les secteurs concernés.
          </li>
        </ul>
      </KeyTakeaway>

      <h2>Qui a besoin d&apos;une pointeuse mobile ?</h2>
      <p>
        Toutes les entreprises dont les travailleurs ne commencent pas leur journée devant la même porte :
      </p>
      <ul>
        <li>
          <strong>Construction et rénovation</strong> : une équipe par chantier, des chantiers qui changent toutes les
          semaines.
        </li>
        <li>
          <strong>Nettoyage</strong> : du personnel réparti chez plusieurs clients, souvent tôt le matin ou tard le
          soir.
        </li>
        <li>
          <strong>Aide et soins à domicile</strong> : des prestations chez les bénéficiaires, sans bureau commun.
        </li>
        <li>
          <strong>Commerciaux, techniciens, livreurs</strong> : des journées en déplacement.
        </li>
        <li>
          <strong>Télétravail</strong> : une partie de la semaine hors des locaux.
        </li>
      </ul>
      <p>
        Pour ces équipes, une pointeuse murale ne sert à rien : il faudrait en installer une par chantier, ou
        imposer un passage au dépôt qui n&apos;a aucun sens. Avec l&apos;obligation d&apos;enregistrement du temps de
        travail prévue pour 2027 (voir{' '}
        <Link href="/blog/pointage-obligatoire-belgique-2027">où en est la loi</Link>), la question se pose pour
        beaucoup de PME qui n&apos;avaient jamais pointé.
      </p>

      <h2>Quatre façons de pointer hors d&apos;un bureau</h2>

      <h3>1. L&apos;application sur le smartphone du travailleur</h3>
      <p>
        Le travailleur se connecte et pointe en un geste, en indiquant s&apos;il est sur site, en télétravail ou en
        déplacement. C&apos;est la solution la plus simple pour les équipes dispersées. Une application web qui
        s&apos;ouvre dans le navigateur évite l&apos;installation depuis un store et n&apos;a accès à rien d&apos;autre sur le
        téléphone — un argument important quand il s&apos;agit du smartphone personnel du travailleur.
      </p>

      <h3>2. Le QR code affiché sur le site</h3>
      <p>
        Un QR code propre à chaque site (chantier, client, dépôt) est affiché à l&apos;entrée. Le travailleur le scanne
        avec son téléphone et confirme avec son code personnel. Le pointage est automatiquement rattaché au bon site,{' '}
        <strong>sans collecter de position</strong>. C&apos;est l&apos;alternative au GPS la plus pratique pour les
        chantiers.
      </p>

      <h3>3. La tablette à l&apos;entrée</h3>
      <p>
        Une tablette posée à l&apos;entrée d&apos;un site fixe, sur laquelle chacun pointe avec un code à quatre
        chiffres. C&apos;est la solution pour les travailleurs qui n&apos;ont pas de smartphone ou qui ne veulent pas
        l&apos;utiliser pour le travail — et un seul appareil suffit pour toute l&apos;équipe.
      </p>

      <h3>4. Le GPS : une fausse bonne idée</h3>
      <p>
        Beaucoup d&apos;applications proposent d&apos;enregistrer la position au moment du pointage, voire de suivre les
        déplacements en continu. Juridiquement, c&apos;est possible mais strictement encadré : l&apos;Autorité de
        protection des données exige une finalité précise, la proportionnalité et une information préalable des
        travailleurs, et le suivi continu ne peut pas servir à surveiller en permanence (détails dans{' '}
        <Link href="/blog/pointeuse-rgpd-belgique">Pointeuse et RGPD</Link>).
      </p>
      <p>
        En pratique, le GPS apporte peu : la position d&apos;un téléphone ne prouve pas le travail effectué, elle est
        imprécise en intérieur, et elle installe un climat de méfiance. Pour savoir <em>où</em> quelqu&apos;un a pointé,
        un QR code sur le site suffit.
      </p>

      <h2>Pourquoi se passer du GPS</h2>
      <ul>
        <li>
          <strong>Minimisation des données</strong> : le RGPD demande de ne collecter que le nécessaire. Pour
          enregistrer le temps de travail, il faut une identité et des heures — pas une position.
        </li>
        <li>
          <strong>Moins d&apos;obligations</strong> : sans géolocalisation, pas d&apos;analyse de proportionnalité à
          justifier ni de règles supplémentaires à négocier avec les travailleurs.
        </li>
        <li>
          <strong>Meilleure adhésion</strong> : un outil qui ne suit personne est accepté plus facilement, surtout
          sur un smartphone personnel.
        </li>
        <li>
          <strong>Le lieu reste connu</strong> : par le QR code du site, ou par le mode déclaré (sur site,
          télétravail, déplacement).
        </li>
      </ul>

      <h2>Ce que dit la loi pour les équipes mobiles</h2>
      <p>
        L&apos;obligation belge d&apos;enregistrer le temps de travail, prévue pour le 1ᵉʳ janvier 2027, découle de
        l&apos;arrêt de la Cour de justice de l&apos;UE de 2019 : le système doit être <strong>objectif, fiable et
        accessible</strong>. Il ne doit pas forcément être un appareil physique — une application convient.
      </p>
      <p>
        Les travailleurs itinérants figurent parmi les exceptions probables, mais la liste n&apos;est pas encore
        fixée. Et la plupart des équipes dites « mobiles » travaillent en réalité sur des sites fixes le temps
        d&apos;un chantier ou d&apos;une prestation : elles seront concernées.
      </p>
      <Callout>
        <strong>Checkin@Work est une autre obligation.</strong> Dans certains secteurs — travaux immobiliers au-delà
        d&apos;un seuil, livraison de béton prêt à l&apos;emploi, secteur de la viande — chaque présence sur le lieu de
        travail doit être déclarée à la sécurité sociale. Une pointeuse mobile enregistre le temps de travail ; elle
        ne remplace pas cette déclaration.
      </Callout>

      <h2>Les pièges à éviter</h2>
      <ul>
        <li>
          <strong>Les oublis de pointage</strong> : ils sont inévitables. Il faut un rappel en fin de journée et une
          procédure de correction où le travailleur demande, le responsable valide, et tout reste tracé.
        </li>
        <li>
          <strong>Les corrections invisibles</strong> : un tableur où n&apos;importe qui modifie une heure sans trace ne
          sera pas considéré comme fiable. L&apos;heure initiale, la modification et son auteur doivent rester
          consultables.
        </li>
        <li>
          <strong>Imposer une installation</strong> : exiger d&apos;installer une application sur un téléphone privé
          crée des résistances. Préférez une application web, et une tablette pour ceux qui n&apos;ont pas de
          smartphone.
        </li>
        <li>
          <strong>Chercher le contrôle absolu</strong> : aucun système n&apos;empêche toute fraude, GPS compris. Le QR
          code du site, le code personnel et la traçabilité des corrections suffisent à détecter les anomalies.
        </li>
      </ul>

      <Callout>
        Pointon fonctionne sur smartphone, sur ordinateur et sur tablette à l&apos;entrée d&apos;un site, avec un QR code
        par site — <strong>sans GPS et sans biométrie</strong>. Les corrections passent par une demande validée et
        restent tracées dans le journal d&apos;audit. <Link href="/comparaison">Comparer les solutions</Link>.
      </Callout>

      <h2>Pour aller plus loin</h2>
      <ul>
        <li>
          <Link href="/blog/pointage-obligatoire-belgique-2027">
            Pointage obligatoire en Belgique (2027) : ce que dit la loi
          </Link>
        </li>
        <li>
          <Link href="/blog/pointeuse-rgpd-belgique">Pointeuse et RGPD en Belgique : GPS, biométrie et vie privée</Link>
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
            href="https://www.autoriteprotectiondonnees.be/professionnel/themes/vie-privee-sur-le-lieu-de-travail/surveillance-de-l-employeur/geolocalisation"
            rel="nofollow noopener"
            target="_blank"
          >
            « Géolocalisation »
          </a>
        </li>
        <li>
          Sécurité sociale —{' '}
          <a
            href="https://www.socialsecurity.be/site_fr/employer/applics/checkinatwork/index.htm"
            rel="nofollow noopener"
            target="_blank"
          >
            « Checkin@Work »
          </a>
        </li>
        <li>
          Cour de justice de l&apos;UE —{' '}
          <a href="https://curia.europa.eu/juris/liste.jsf?num=C-55/18" rel="nofollow noopener" target="_blank">
            arrêt C-55/18 du 14 mai 2019
          </a>
        </li>
      </ul>
    </>
  )
}
