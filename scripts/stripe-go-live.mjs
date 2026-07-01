/**
 * Stripe Test → Live : crée le catalogue (6 produits + 12 prix) dans le compte LIVE
 * et imprime le bloc d'env vars à coller dans le .env de prod.
 *
 * Le code applicatif ne change PAS entre Test et Live — seules changent :
 *   - STRIPE_SECRET_KEY            (sk_test_… → sk_live_…)
 *   - STRIPE_PUBLISHABLE_KEY       (pk_test_… → pk_live_…)
 *   - STRIPE_WEBHOOK_SECRET        (whsec test → whsec live, créé dans Dashboard Live)
 *   - les 12 STRIPE_PRICE_*        (price IDs test → price IDs live, générés ci-dessous)
 *
 * USAGE (en local, le jour du lancement) :
 *   STRIPE_SECRET_KEY_LIVE=sk_live_xxx node scripts/stripe-go-live.mjs
 *
 * Idempotent : ré-exécuter ne crée pas de doublons (clés d'idempotence Stripe, TTL 24h).
 * Ne committe JAMAIS la clé live. Le script lit la clé depuis l'env, pas depuis un fichier.
 */

const KEY = process.env.STRIPE_SECRET_KEY_LIVE
if (!KEY) {
  console.error('✗ Définis STRIPE_SECRET_KEY_LIVE=sk_live_xxx avant de lancer le script.')
  process.exit(1)
}
if (!KEY.startsWith('sk_live_')) {
  console.error('✗ La clé fournie n\'est pas une clé LIVE (sk_live_…). Refus par sécurité.')
  process.exit(1)
}

async function stripe(path, data, idemKey) {
  const body = new URLSearchParams()
  const add = (k, v) => { if (v !== undefined && v !== null) body.append(k, String(v)) }
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === 'object') for (const [k2, v2] of Object.entries(v)) add(`${k}[${k2}]`, v2)
    else add(k, v)
  }
  const headers = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }
  if (idemKey) headers['Idempotency-Key'] = idemKey
  const res = await fetch(`https://api.stripe.com/v1/${path}`, { method: 'POST', headers, body })
  const json = await res.json()
  if (!res.ok) throw new Error(`${path} → ${json.error?.message ?? JSON.stringify(json)}`)
  return json
}

// Grille tarifaire HTVA (centimes). Annuel = 10 mois (2 mois offerts).
const PLANS = [
  { plan: 'STARTER',  base: { m: 1990, y: 19900 }, seat: { m: 290, y: 2900 } },
  { plan: 'TEAM',     base: { m: 4490, y: 44900 }, seat: { m: 260, y: 2600 } },
  { plan: 'BUSINESS', base: { m: 6990, y: 69900 }, seat: { m: 220, y: 2200 } },
]

// Add-ons (HTVA, cents). Annuel = 10 mois, cohérent avec la grille des plans.
// Doit rester synchronisé avec STRIPE_ADDON_CONFIG (src/lib/stripe.ts) et
// ADDON_INFO (src/lib/plan.ts).
const ADDONS = [
  { key: 'api_access',     envSuffix: 'API_ACCESS',     name: 'Pointon — Accès API',         m: 2900, y: 29000 },
  { key: 'webhooks',       envSuffix: 'WEBHOOKS',       name: 'Pointon — Webhooks sortants',  m: 1900, y: 19000 },
  { key: 'kiosk_advanced', envSuffix: 'KIOSK_ADVANCED', name: 'Pointon — Kiosk avancé',        m: 1900, y: 19000 },
  { key: 'rgpd_export',    envSuffix: 'RGPD_EXPORT',    name: 'Pointon — Export RGPD',         m: 1500, y: 15000 },
  { key: 'custom_reports', envSuffix: 'CUSTOM_REPORTS', name: 'Pointon — Rapports custom',     m: 1500, y: 15000 },
]

const envLines = []

for (const { plan, base, seat } of PLANS) {
  const label = plan.charAt(0) + plan.slice(1).toLowerCase()
  for (const kind of ['base', 'seat']) {
    const amts = kind === 'base' ? base : seat
    const name = kind === 'base' ? `Pointon ${label}` : `Pointon ${label} — Siège supplémentaire`
    const prodKey = `pointon_${plan.toLowerCase()}_${kind}`
    const product = await stripe('products', {
      name,
      metadata: { pointon_key: prodKey, plan, kind },
    }, `prod-live-${prodKey}`)
    console.log(`✓ ${name} → ${product.id}`)

    for (const [cycle, interval, amount] of [['MONTHLY', 'month', amts.m], ['YEARLY', 'year', amts.y]]) {
      const price = await stripe('prices', {
        product: product.id,
        currency: 'eur',
        unit_amount: amount,
        tax_behavior: 'exclusive',
        recurring: { interval },
        metadata: { pointon_key: prodKey, cycle },
      }, `price-live-${prodKey}-${cycle}`)
      const suffix = kind === 'base' ? `${plan}_${cycle}` : `${plan}_SEAT_${cycle}`
      envLines.push(`STRIPE_PRICE_${suffix}=${price.id}`)
      console.log(`    ${cycle.padEnd(7)} ${(amount / 100).toFixed(2)}€ → ${price.id}`)
    }
  }
}

for (const { key, envSuffix, name, m, y } of ADDONS) {
  const prodKey = `pointon_addon_${key}`
  const product = await stripe('products', {
    name,
    metadata: { pointon_key: prodKey, addon: key },
  }, `prod-live-${prodKey}`)
  console.log(`✓ ${name} → ${product.id}`)

  for (const [cycle, interval, amount] of [['MONTHLY', 'month', m], ['YEARLY', 'year', y]]) {
    const price = await stripe('prices', {
      product: product.id,
      currency: 'eur',
      unit_amount: amount,
      tax_behavior: 'exclusive',
      recurring: { interval },
      metadata: { pointon_key: prodKey, cycle },
    }, `price-live-${prodKey}-${cycle}`)
    envLines.push(`STRIPE_PRICE_ADDON_${envSuffix}_${cycle}=${price.id}`)
    console.log(`    ${cycle.padEnd(7)} ${(amount / 100).toFixed(2)}€ → ${price.id}`)
  }
}

console.log('\n========================================================')
console.log('1) Colle ces 22 lignes dans le .env de prod (remplace les price_ test) :\n')
console.log(envLines.join('\n'))
console.log('\n2) Remplace aussi dans le .env de prod :')
console.log('   STRIPE_SECRET_KEY=sk_live_…')
console.log('   STRIPE_PUBLISHABLE_KEY=pk_live_…')
console.log('   STRIPE_WEBHOOK_SECRET=whsec_…   (créer l\'endpoint pointon.be/api/stripe/webhook dans le Dashboard LIVE)')
console.log('\n3) Active Stripe Tax en mode LIVE (TVA 21% BE, services électroniques).')
console.log('\n4) Redéploie : docker compose up -d --force-recreate app')
console.log('\n5) Smoke test : un vrai checkout sur pointon.be (petite carte réelle) → vérifier facture Odoo.')
console.log('========================================================')
