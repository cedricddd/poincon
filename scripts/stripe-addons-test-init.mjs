/**
 * Crée le catalogue Stripe TEST des 5 add-ons Pointon (5 produits + 10 prix,
 * mensuel + annuel) et imprime le bloc d'env vars à coller dans ton .env local
 * (et dans la config de dev Docker).
 *
 * USAGE (en local, clé Stripe TEST) :
 *   STRIPE_SECRET_KEY_TEST=sk_test_xxx node scripts/stripe-addons-test-init.mjs
 *
 * Idempotent : ré-exécuter ne crée pas de doublons (clés d'idempotence Stripe, TTL 24h).
 * Refuse de tourner avec une clé sk_live_ par sécurité.
 */

const KEY = process.env.STRIPE_SECRET_KEY_TEST
if (!KEY) {
  console.error('✗ Définis STRIPE_SECRET_KEY_TEST=sk_test_xxx avant de lancer le script.')
  process.exit(1)
}
if (!KEY.startsWith('sk_test_')) {
  console.error('✗ La clé fournie n\'est pas une clé TEST (sk_test_…). Refus par sécurité.')
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

// Doit rester synchronisé avec STRIPE_ADDON_CONFIG (src/lib/stripe.ts),
// ADDON_INFO (src/lib/plan.ts) et le bloc ADDONS de scripts/stripe-go-live.mjs.
const ADDONS = [
  { key: 'api_access',     envSuffix: 'API_ACCESS',     name: 'Pointon — Accès API',         m: 2900, y: 29000 },
  { key: 'webhooks',       envSuffix: 'WEBHOOKS',       name: 'Pointon — Webhooks sortants',  m: 1900, y: 19000 },
  { key: 'kiosk_advanced', envSuffix: 'KIOSK_ADVANCED', name: 'Pointon — Kiosk avancé',        m: 1900, y: 19000 },
  { key: 'rgpd_export',    envSuffix: 'RGPD_EXPORT',    name: 'Pointon — Export RGPD',         m: 1500, y: 15000 },
  { key: 'custom_reports', envSuffix: 'CUSTOM_REPORTS', name: 'Pointon — Rapports custom',     m: 1500, y: 15000 },
]

const envLines = []

for (const { key, envSuffix, name, m, y } of ADDONS) {
  const prodKey = `pointon_addon_${key}`
  const product = await stripe('products', {
    name,
    metadata: { pointon_key: prodKey, addon: key },
  }, `prod-test-${prodKey}`)
  console.log(`✓ ${name} → ${product.id}`)

  for (const [cycle, interval, amount] of [['MONTHLY', 'month', m], ['YEARLY', 'year', y]]) {
    const price = await stripe('prices', {
      product: product.id,
      currency: 'eur',
      unit_amount: amount,
      tax_behavior: 'exclusive',
      recurring: { interval },
      metadata: { pointon_key: prodKey, cycle },
    }, `price-test-${prodKey}-${cycle}`)
    envLines.push(`STRIPE_PRICE_ADDON_${envSuffix}_${cycle}=${price.id}`)
    console.log(`    ${cycle.padEnd(7)} ${(amount / 100).toFixed(2)}€ → ${price.id}`)
  }
}

console.log('\n========================================================')
console.log('Colle ces 10 lignes dans ton .env (dev/local) :\n')
console.log(envLines.join('\n'))
console.log('\nPuis : docker-compose -f docker-compose.dev.yml up -d --force-recreate app')
console.log('========================================================')
