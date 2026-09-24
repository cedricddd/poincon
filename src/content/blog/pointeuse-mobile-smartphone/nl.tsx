import type { BlogMeta } from '@/lib/blog'
import { Link } from '@/i18n/navigation'
import { Callout, KeyTakeaway } from '../_components'

export const meta: BlogMeta = {
  title: 'Mobiele prikklok: tijdregistratie op smartphone, zonder gps',
  description:
    'Bouw, schoonmaak, thuiszorg, vertegenwoordigers: hoe laat u een mobiel team prikken op de smartphone in België, zonder gps of biometrie, en blijft u in orde?',
  publishedAt: '2026-09-24',
  updatedAt: '2026-09-24',
  keywords: [
    'mobiele prikklok',
    'prikklok smartphone',
    'tijdregistratie app',
    'tijdregistratie bouwwerf',
    'prikklok zonder gps',
    'mobiele tijdsregistratie',
  ],
  faq: [
    {
      q: 'Mogen werknemers prikken op hun eigen smartphone?',
      a: 'Ja. Een webapplicatie die in de browser opent, vraagt geen installatie via een store en heeft geen toegang tot contacten, foto’s of locatie. Voor werknemers zonder smartphone doet een tablet aan de ingang van de site met een persoonlijke code hetzelfde.',
    },
    {
      q: 'Is gps nodig om te controleren of een werknemer op de werf is?',
      a: 'Nee. Een QR-code op de site, gecombineerd met een persoonlijke code, koppelt de registratie aan de juiste plaats zonder locatiegegevens te verzamelen. Gps blijft juridisch mogelijk, maar brengt zware GDPR-verplichtingen mee (doelbinding, proportionaliteit, voorafgaande informatie) voor een beperkt voordeel.',
    },
    {
      q: 'Wat als een werknemer vergeet te prikken?',
      a: 'Hij dient een correctieaanvraag in, die de verantwoordelijke goedkeurt of weigert. Het oorspronkelijke tijdstip, de wijziging, de auteur en de reden blijven bewaard: die traceerbaarheid maakt de registratie betrouwbaar bij een controle.',
    },
    {
      q: 'Moeten rondtrekkende werknemers vanaf 2027 hun tijd registreren?',
      a: 'Rondtrekkende werknemers behoren tot de waarschijnlijke uitzonderingen van de toekomstige Belgische wet, maar de definitieve lijst ligt nog niet vast. Veel “mobiele” teams (bouw, schoonmaak, thuiszorg) werken wel op vaste sites en zullen betrokken zijn.',
    },
    {
      q: 'Vervangt een mobiele prikklok Checkin@Work?',
      a: 'Nee. Checkin@Work is een afzonderlijke aanwezigheidsregistratie, verplicht in bepaalde sectoren (werken in onroerende staat boven een drempelbedrag, levering van stortklaar beton, vleessector). De registratie van de arbeidstijd komt daar bovenop.',
    },
  ],
}

export default function Body() {
  return (
    <>
      <KeyTakeaway>
        <ul>
          <li>
            Een <strong>mobiele prikklok</strong> is de smartphone van de werknemer, een QR-code op de site of een
            tablet aan de ingang — geen kastje aan de muur.
          </li>
          <li>
            <strong>Gps is niet nodig</strong>: een QR-code op de site koppelt de registratie aan de juiste plaats
            zonder iemand te volgen.
          </li>
          <li>
            Wat de registratie betrouwbaar maakt, is de <strong>traceerbaarheid van correcties</strong>, niet
            toezicht.
          </li>
          <li>
            Checkin@Work blijft een <strong>afzonderlijke</strong> verplichting in de betrokken sectoren.
          </li>
        </ul>
      </KeyTakeaway>

      <h2>Wie heeft een mobiele prikklok nodig?</h2>
      <p>Elke onderneming waarvan de werknemers hun dag niet aan dezelfde deur beginnen:</p>
      <ul>
        <li>
          <strong>Bouw en renovatie</strong>: één ploeg per werf, werven die elke week veranderen.
        </li>
        <li>
          <strong>Schoonmaak</strong>: personeel verspreid over verschillende klanten, vaak vroeg of laat op de dag.
        </li>
        <li>
          <strong>Thuiszorg</strong>: prestaties bij de cliënten, zonder gemeenschappelijk kantoor.
        </li>
        <li>
          <strong>Vertegenwoordigers, technici, koeriers</strong>: dagen onderweg.
        </li>
        <li>
          <strong>Telewerk</strong>: een deel van de week buiten de kantoren.
        </li>
      </ul>
      <p>
        Voor die teams heeft een prikklok aan de muur geen zin: u zou er één per werf moeten plaatsen, of een
        omweg langs het depot opleggen. Met de verplichte tijdsregistratie die voor 2027 gepland is (zie{' '}
        <Link href="/blog/verplichte-tijdregistratie-belgie-2027">waar de wet staat</Link>), stelt die vraag zich
        voor veel kmo’s die nooit hebben geprikt.
      </p>

      <h2>Vier manieren om buiten een kantoor te prikken</h2>

      <h3>1. De app op de smartphone van de werknemer</h3>
      <p>
        De werknemer logt in en prikt met één tik, met de vermelding of hij op de site, in telewerk of onderweg
        is. Dat is de eenvoudigste oplossing voor verspreide teams. Een webapplicatie die in de browser opent,
        vermijdt een installatie via een store en heeft nergens anders toegang toe op de telefoon — een belangrijk
        argument als het om de privésmartphone van de werknemer gaat.
      </p>

      <h3>2. De QR-code op de site</h3>
      <p>
        Aan de ingang van elke site (werf, klant, depot) hangt een eigen QR-code. De werknemer scant die met zijn
        telefoon en bevestigt met zijn persoonlijke code. De registratie wordt automatisch aan de juiste site
        gekoppeld, <strong>zonder locatiegegevens te verzamelen</strong>. Voor werven is dit het handigste
        alternatief voor gps.
      </p>

      <h3>3. De tablet aan de ingang</h3>
      <p>
        Een tablet aan de ingang van een vaste site, waarop iedereen prikt met een code van vier cijfers. Dit is
        de oplossing voor werknemers zonder smartphone of die hem niet voor het werk willen gebruiken — en één
        toestel volstaat voor het hele team.
      </p>

      <h3>4. Gps: een schijnbaar goed idee</h3>
      <p>
        Veel apps registreren de positie bij het prikken, of volgen de verplaatsingen zelfs continu. Juridisch kan
        dat, maar het is strikt omkaderd: de Gegevensbeschermingsautoriteit eist een duidelijk doel,
        proportionaliteit en voorafgaande informatie van de werknemers, en continue tracking mag niet dienen om
        permanent toezicht te houden.
      </p>
      <p>
        In de praktijk levert gps weinig op: de positie van een telefoon bewijst niet dat er gewerkt is, ze is
        onnauwkeurig binnenshuis en ze zorgt voor wantrouwen. Om te weten <em>waar</em> iemand geprikt heeft,
        volstaat een QR-code op de site.
      </p>

      <h2>Waarom zonder gps</h2>
      <ul>
        <li>
          <strong>Dataminimalisatie</strong>: de GDPR vraagt om alleen het noodzakelijke te verzamelen. Voor
          tijdsregistratie zijn een identiteit en tijdstippen nodig — geen positie.
        </li>
        <li>
          <strong>Minder verplichtingen</strong>: zonder geolocatie hoeft u geen proportionaliteit te verantwoorden
          of bijkomende regels met de werknemers af te spreken.
        </li>
        <li>
          <strong>Meer draagvlak</strong>: een tool die niemand volgt, wordt makkelijker aanvaard, zeker op een
          privésmartphone.
        </li>
        <li>
          <strong>De plaats blijft gekend</strong>: via de QR-code van de site, of via de opgegeven modus (op de
          site, telewerk, onderweg).
        </li>
      </ul>

      <h2>Wat de wet zegt voor mobiele teams</h2>
      <p>
        De Belgische verplichting om de arbeidstijd te registreren, gepland voor 1 januari 2027, vloeit voort uit
        het arrest van het Hof van Justitie van de EU van 2019: het systeem moet <strong>objectief, betrouwbaar en
        toegankelijk</strong> zijn. Het hoeft geen fysiek toestel te zijn — een app volstaat.
      </p>
      <p>
        Rondtrekkende werknemers behoren tot de waarschijnlijke uitzonderingen, maar de lijst ligt nog niet vast.
        En de meeste zogenaamd “mobiele” teams werken in werkelijkheid op vaste sites tijdens een werf of een
        prestatie: zij zullen betrokken zijn.
      </p>
      <Callout>
        <strong>Checkin@Work is een andere verplichting.</strong> In bepaalde sectoren — werken in onroerende staat
        boven een drempelbedrag, levering van stortklaar beton, vleessector — moet elke aanwezigheid op de
        werkplaats aan de sociale zekerheid worden gemeld. Een mobiele prikklok registreert de arbeidstijd; ze
        vervangt die melding niet.
      </Callout>

      <h2>Valkuilen om te vermijden</h2>
      <ul>
        <li>
          <strong>Vergeten prikken</strong>: dat is onvermijdelijk. Er is een herinnering op het einde van de dag
          nodig en een correctieprocedure waarbij de werknemer aanvraagt, de verantwoordelijke goedkeurt en alles
          traceerbaar blijft.
        </li>
        <li>
          <strong>Onzichtbare correcties</strong>: een spreadsheet waarin iedereen een uur wijzigt zonder spoor, wordt
          niet als betrouwbaar beschouwd. Het oorspronkelijke tijdstip, de wijziging en de auteur moeten raadpleegbaar
          blijven.
        </li>
        <li>
          <strong>Een installatie opleggen</strong>: een app verplicht installeren op een privételefoon wekt weerstand.
          Kies voor een webapplicatie, en een tablet voor wie geen smartphone heeft.
        </li>
        <li>
          <strong>Absolute controle nastreven</strong>: geen enkel systeem voorkomt elke fraude, ook gps niet. De
          QR-code van de site, de persoonlijke code en de traceerbaarheid van correcties volstaan om afwijkingen op
          te sporen.
        </li>
      </ul>

      <Callout>
        Pointon werkt op smartphone, computer en op een tablet aan de ingang van een site, met een QR-code per site
        — <strong>zonder gps en zonder biometrie</strong>. Correcties verlopen via een goedgekeurde aanvraag en
        blijven bewaard in het auditlogboek. <Link href="/comparaison">Vergelijk de oplossingen</Link>.
      </Callout>

      <h2>Meer lezen</h2>
      <ul>
        <li>
          <Link href="/blog/verplichte-tijdregistratie-belgie-2027">
            Verplichte tijdregistratie in België (2027): wat zegt de wet?
          </Link>
        </li>
      </ul>

      <h2>Bronnen</h2>
      <ul>
        <li>
          Gegevensbeschermingsautoriteit —{' '}
          <a
            href="https://www.gegevensbeschermingsautoriteit.be/professioneel/thema-s/privacy-op-de-werkplek/toezicht-van-de-werkgever/geolocalisatie"
            rel="nofollow noopener"
            target="_blank"
          >
            “Geolocalisatie”
          </a>
        </li>
        <li>
          Sociale zekerheid —{' '}
          <a
            href="https://www.socialsecurity.be/site_nl/employer/applics/checkinatwork/index.htm"
            rel="nofollow noopener"
            target="_blank"
          >
            “Checkin@Work”
          </a>
        </li>
        <li>
          Hof van Justitie van de EU —{' '}
          <a href="https://curia.europa.eu/juris/liste.jsf?num=C-55/18" rel="nofollow noopener" target="_blank">
            arrest C-55/18 van 14 mei 2019
          </a>
        </li>
      </ul>
    </>
  )
}
