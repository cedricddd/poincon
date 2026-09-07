import type { BlogMeta } from '@/lib/blog'
import { Link } from '@/i18n/navigation'
import { Callout, KeyTakeaway } from '../_components'

export const meta: BlogMeta = {
  title: 'Pointage obligatoire en Belgique : où en est la loi de 2027 ?',
  description:
    "L'obligation d'enregistrer le temps de travail est prévue pour le 1ᵉʳ janvier 2027, mais la loi belge n'est pas encore votée. État des lieux à jour : ce qui est certain, ce qui peut encore changer, et comment s'y préparer.",
  publishedAt: '2026-09-07',
  updatedAt: '2026-09-07',
  keywords: [
    'pointage obligatoire belgique',
    'pointeuse obligatoire 2027',
    'enregistrement du temps de travail belgique',
    'obligation de pointage 2027',
    'loi pointage belgique',
  ],
  faq: [
    {
      q: 'Le pointage est-il obligatoire en Belgique en 2026 ?',
      a: "La loi belge spécifique n'est pas encore adoptée. Mais l'obligation européenne issue de l'arrêt de la Cour de justice de l'UE du 14 mai 2019 impose déjà aux États membres d'exiger des employeurs un système de mesure du temps de travail.",
    },
    {
      q: 'À partir de quand l’obligation s’appliquera-t-elle exactement ?',
      a: "Le gouvernement fédéral vise le 1ᵉʳ janvier 2027. Les employeurs qui n'ont pas encore de système à cette date disposeraient d'une période transitoire jusqu'au 31 mars 2027 pour se mettre en conformité.",
    },
    {
      q: 'Faut-il acheter une pointeuse physique ?',
      a: "Non. Le texte n'impose aucun matériel précis. Une application mobile, un badge, un logiciel ou tout autre système objectif, fiable et accessible suffit.",
    },
    {
      q: 'Une entreprise de trois personnes est-elle concernée ?',
      a: "Oui. L'obligation vise tous les employeurs, sans seuil de taille, dans le secteur privé comme dans le secteur public.",
    },
    {
      q: 'Les télétravailleurs devront-ils pointer ?',
      a: "Les télétravailleurs figurent parmi les exceptions probables, de même que les travailleurs itinérants et le personnel de direction. La liste définitive n'est pas encore fixée par la loi.",
    },
    {
      q: 'Quelles sont les amendes prévues ?',
      a: "Le texte ne fixe pas encore de sanctions propres à cette obligation. En l'absence de système de mesure du temps de travail, ce sont les sanctions existantes du Code pénal social qui s'appliquent.",
    },
  ],
}

export default function Body() {
  return (
    <>
      <KeyTakeaway>
        <ul>
          <li>
            L&apos;obligation d&apos;enregistrer le temps de travail est <strong>prévue pour le 1ᵉʳ janvier 2027</strong>,
            avec une période transitoire jusqu&apos;au 31 mars 2027.
          </li>
          <li>
            À ce jour (septembre 2026), <strong>la loi belge n&apos;est ni votée ni publiée</strong> : le texte est
            encore à l&apos;état d&apos;avant-projet.
          </li>
          <li>
            Elle transpose l&apos;arrêt de la Cour de justice de l&apos;UE de 2019 — le principe s&apos;impose donc
            <strong> déjà en droit européen</strong>.
          </li>
          <li>
            <strong>Aucune pointeuse physique n&apos;est obligatoire</strong> : tout système objectif, fiable et
            accessible convient.
          </li>
        </ul>
      </KeyTakeaway>

      <h2>Le pointage est-il déjà obligatoire aujourd&apos;hui ?</h2>
      <p>
        En droit belge, non : la loi qui rendra l&apos;enregistrement du temps de travail obligatoire n&apos;a pas
        encore été adoptée. En droit européen, en revanche, l&apos;obligation existe depuis 2019. La Belgique est
        simplement en retard pour la traduire dans sa propre législation, et c&apos;est cette transposition qui est
        annoncée pour 2027.
      </p>

      <h2>Ce que prévoit la mesure</h2>
      <p>
        D&apos;après l&apos;avant-projet, chaque employeur devra disposer d&apos;un système permettant de mesurer le
        temps de travail quotidien de ses travailleurs de manière objective et fiable, à partir du
        <strong> 1ᵉʳ janvier 2027</strong>. Les entreprises qui ne disposent pas encore d&apos;un système adapté à
        cette date bénéficieraient d&apos;un délai supplémentaire, <strong>jusqu&apos;au 31 mars 2027</strong>.
      </p>
      <p>
        L&apos;obligation concernerait <strong>tous les employeurs</strong>, du secteur privé comme du secteur
        public, quels que soient leur secteur d&apos;activité et la taille de l&apos;entreprise.
      </p>

      <h2>D&apos;où vient cette obligation ? L&apos;arrêt CJUE de 2019</h2>
      <p>
        Le point de départ est l&apos;arrêt de la Cour de justice de l&apos;Union européenne du{' '}
        <strong>14 mai 2019</strong> (affaire C-55/18, <em>CCOO contre Deutsche Bank</em>). La Cour y juge que,
        pour garantir le respect de la directive sur le temps de travail, chaque État membre doit imposer aux
        employeurs la mise en place d&apos;un système <em>objectif, fiable et accessible</em> mesurant la durée
        du temps de travail journalier de chaque travailleur.
      </p>
      <p>
        Un arrêt ultérieur du <strong>19 décembre 2024</strong> (affaire <em>Loredas</em>) a confirmé que cette
        obligation s&apos;applique à l&apos;ensemble des travailleurs. Plusieurs pays voisins ont déjà légiféré ;
        la Belgique ne l&apos;a pas encore fait.
      </p>

      <h2>Où en est la loi ? (septembre 2026)</h2>
      <p>Le processus est engagé mais loin d&apos;être terminé :</p>
      <ol>
        <li>
          <strong>Novembre 2025</strong> — l&apos;accord budgétaire du gouvernement fédéral acte le principe d&apos;une
          obligation généralisée d&apos;enregistrement du temps de travail à partir de 2027.
        </li>
        <li>
          Un <strong>avant-projet de loi</strong> est soumis pour avis au Conseil national du travail (avis
          n° 2462).
        </li>
        <li>
          Le <strong>5 février 2026</strong>, une proposition de résolution est déposée à la Chambre des
          représentants pour pousser le processus législatif.
        </li>
        <li>
          Restent à venir : passage en Conseil des ministres, avis du Conseil d&apos;État, vote au Parlement, puis
          publication au <strong>Moniteur belge</strong>.
        </li>
      </ol>
      <p>
        Tant que ces étapes ne sont pas franchies, les détails — exceptions exactes, modalités de contrôle,
        sanctions — peuvent encore évoluer. Les secrétariats sociaux le formulent tous de la même façon : le
        texte n&apos;est pas finalisé, des modifications restent possibles.
      </p>

      <h2>Qui sera concerné ? Quelles exceptions ?</h2>
      <p>
        L&apos;obligation viserait tous les employeurs et, en principe, tous les travailleurs. L&apos;avant-projet
        prévoit toutefois des <strong>exceptions probables</strong> (non encore définitives) pour des profils
        qui échappent déjà aujourd&apos;hui à certaines règles sur la durée du travail :
      </p>
      <ul>
        <li>les membres de la famille de l&apos;employeur travaillant dans une entreprise familiale ;</li>
        <li>le personnel de direction et les postes de confiance ;</li>
        <li>les représentants de commerce ;</li>
        <li>les télétravailleurs, qu&apos;il s&apos;agisse de télétravail structurel ou occasionnel ;</li>
        <li>les travailleurs itinérants, qui exercent hors d&apos;un établissement fixe de l&apos;employeur.</li>
      </ul>

      <h2>Faut-il une pointeuse ? Non.</h2>
      <p>
        C&apos;est la confusion la plus fréquente. Le texte n&apos;impose <strong>aucun matériel particulier</strong>.
        Ce qui compte, c&apos;est que le système soit objectif, fiable et accessible : une application mobile, un
        badge, un logiciel de gestion du temps ou une borne conviennent tous. Le système peut se contenter
        d&apos;enregistrer les <em>écarts</em> par rapport à l&apos;horaire convenu, mais il doit refléter le temps
        réellement presté, pas un horaire théorique. Les données doivent être <strong>conservées cinq ans</strong>.
      </p>

      <h2>Quelles sanctions ?</h2>
      <p>
        L&apos;avant-projet ne fixe pas encore de sanctions propres à cette nouvelle obligation. Dans l&apos;attente,
        c&apos;est le <strong>Code pénal social</strong> qui s&apos;applique : l&apos;absence de mesure du temps de
        travail y est déjà une infraction. Les montants exacts qui accompagneront la future loi ne sont pas
        connus — méfiez-vous des chiffres avancés ici ou là tant que le texte n&apos;est pas publié.
      </p>

      <h2>Comment se préparer dès maintenant</h2>
      <p>
        Même sans texte définitif, la direction est claire et l&apos;échéance est courte. Ce qui peut être fait
        aujourd&apos;hui, sans risque de « refaire » plus tard :
      </p>
      <ul>
        <li>choisir un système d&apos;enregistrement objectif (horodatage côté serveur, pas déclaratif) ;</li>
        <li>s&apos;assurer que les enregistrements sont infalsifiables et tracés (journal d&apos;audit) ;</li>
        <li>prévoir une conservation des données d&apos;au moins cinq ans ;</li>
        <li>tester le dispositif sur une équipe avant fin 2026, pour être opérationnel au 1ᵉʳ janvier.</li>
      </ul>
      <Callout>
        Pointon est une pointeuse belge conçue exactement pour ces exigences : enregistrement objectif, audit
        trail immuable, export certifié, sans GPS.{' '}
        <Link href="/comparaison">Comparer les solutions de pointage</Link>.
      </Callout>

      <h2>Sources</h2>
      <ul>
        <li>
          Cour de justice de l&apos;UE, arrêt du 14 mai 2019, affaire C-55/18 (
          <a href="https://curia.europa.eu/juris/liste.jsf?num=C-55/18" rel="nofollow noopener" target="_blank">
            curia.europa.eu
          </a>
          )
        </li>
        <li>
          Securex —{' '}
          <a
            href="https://www.securex.be/fr/lex4you/employeur/actualites/enregistrement-du-temps-de-travail-obligatoire-a-partir-de-2027"
            rel="nofollow noopener"
            target="_blank"
          >
            « Enregistrement du temps de travail obligatoire à partir de 2027 »
          </a>
        </li>
        <li>
          SD&nbsp;Worx —{' '}
          <a
            href="https://www.sdworx.be/fr-be/actua-tendances/gestion-temps-effectifs/enregistrement-temps-travail"
            rel="nofollow noopener"
            target="_blank"
          >
            « 7 questions sur l&apos;enregistrement obligatoire du temps de travail en 2027 »
          </a>
        </li>
        <li>
          Acerta —{' '}
          <a
            href="https://www.acerta.be/fr/inspiration/enregistrement-du-temps-de-travail-obligatoire-partir-de-2027"
            rel="nofollow noopener"
            target="_blank"
          >
            « Enregistrement du temps de travail obligatoire à partir de 2027 ? »
          </a>
        </li>
      </ul>

      <p className="blog-prose__note">
        Dernière vérification : 7 septembre 2026. Cet article sera mis à jour à chaque avancée du texte (vote au
        Parlement, publication au Moniteur belge).
      </p>
    </>
  )
}
