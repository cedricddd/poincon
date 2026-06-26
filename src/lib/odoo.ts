// Odoo XML-RPC client — native fetch, no extra dependencies
// Env vars: ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function toXmlValue(val: unknown): string {
  if (val === null || val === undefined) return '<value><nil/></value>'
  if (typeof val === 'boolean') return `<value><boolean>${val ? 1 : 0}</boolean></value>`
  if (typeof val === 'number') {
    return Number.isInteger(val)
      ? `<value><int>${val}</int></value>`
      : `<value><double>${val}</double></value>`
  }
  if (typeof val === 'string') return `<value><string>${xmlEscape(val)}</string></value>`
  if (Array.isArray(val)) {
    return `<value><array><data>${val.map(toXmlValue).join('')}</data></array></value>`
  }
  if (typeof val === 'object') {
    const members = Object.entries(val as Record<string, unknown>)
      .map(([k, v]) => `<member><name>${xmlEscape(k)}</name>${toXmlValue(v)}</member>`)
      .join('')
    return `<value><struct>${members}</struct></value>`
  }
  return `<value><string>${xmlEscape(String(val))}</string></value>`
}

function buildCall(method: string, params: unknown[]): string {
  const args = params.map(p => `<param>${toXmlValue(p)}</param>`).join('')
  return `<?xml version="1.0"?><methodCall><methodName>${method}</methodName><params>${args}</params></methodCall>`
}

async function xmlRpc(endpoint: string, method: string, params: unknown[]): Promise<string> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml', Accept: 'text/xml' },
    body: buildCall(method, params),
  })
  if (!res.ok) throw new Error(`Odoo HTTP ${res.status}`)
  return res.text()
}

function assertNoFault(xml: string): void {
  if (!xml.includes('<fault>')) return
  const msg = xml.match(/<name>faultString<\/name>\s*<value>\s*<string>([^<]*)<\/string>/)?.[1]
  throw new Error(`Odoo fault: ${msg ?? xml.slice(0, 300)}`)
}

function extractInt(xml: string): number {
  assertNoFault(xml)
  const m = xml.match(/<(?:int|i4)>([-\d]+)<\/(?:int|i4)>/)
  if (!m) throw new Error('Odoo: expected int in response')
  return parseInt(m[1], 10)
}

function extractStructArray(xml: string): Array<Record<string, number | string>> {
  assertNoFault(xml)
  const results: Array<Record<string, number | string>> = []
  const structRx = /<struct>([\s\S]*?)<\/struct>/g
  let sm: RegExpExecArray | null
  while ((sm = structRx.exec(xml)) !== null) {
    const obj: Record<string, number | string> = {}
    const intRx = /<member>\s*<name>([^<]+)<\/name>\s*<value>\s*<(?:int|i4)>([-\d]+)<\/(?:int|i4)>\s*<\/value>\s*<\/member>/g
    const strRx = /<member>\s*<name>([^<]+)<\/name>\s*<value>\s*<string>([\s\S]*?)<\/string>\s*<\/value>\s*<\/member>/g
    let mm: RegExpExecArray | null
    while ((mm = intRx.exec(sm[1])) !== null) obj[mm[1]] = parseInt(mm[2], 10)
    while ((mm = strRx.exec(sm[1])) !== null) obj[mm[1]] = mm[2]
    results.push(obj)
  }
  return results
}

async function authenticate(): Promise<number> {
  const url = process.env.ODOO_URL!
  const xml = await xmlRpc(`${url}/xmlrpc/2/common`, 'authenticate', [
    process.env.ODOO_DB,
    process.env.ODOO_USERNAME,
    process.env.ODOO_PASSWORD,
    {},
  ])
  const uid = extractInt(xml)
  if (uid <= 0) throw new Error('Odoo authentication failed')
  return uid
}

async function odooExecute(
  uid: number,
  model: string,
  method: string,
  args: unknown[],
  kwargs: unknown = {}
): Promise<string> {
  const url = process.env.ODOO_URL!
  return xmlRpc(`${url}/xmlrpc/2/object`, 'execute_kw', [
    process.env.ODOO_DB,
    uid,
    process.env.ODOO_PASSWORD,
    model,
    method,
    args,
    kwargs,
  ])
}

export function isOdooConfigured(): boolean {
  return !!(process.env.ODOO_URL && process.env.ODOO_DB && process.env.ODOO_PASSWORD)
}

export async function syncInvoiceToOdoo(params: {
  stripeInvoiceId: string
  customerEmail: string
  customerName: string
  vatNumber: string | null
  amountHtva: number    // centimes HTVA
  taxAmount: number     // centimes TVA collectée par Stripe (0 = pas de TVA Stripe)
  plan: string
  billingCycle: string
  invoiceDate: string   // YYYY-MM-DD
  billingAddress?: {
    line1?: string | null
    city?: string | null
    postal_code?: string | null
    country?: string | null  // ISO 2-letter code
  } | null
  customerPhone?: string | null
}): Promise<number> {
  const uid = await authenticate()

  // Lookup country ID if billing address has a country
  let countryId: number | null = null
  if (params.billingAddress?.country) {
    const countryXml = await odooExecute(uid, 'res.country', 'search_read',
      [[['code', '=', params.billingAddress.country.toUpperCase()]]],
      { fields: ['id'], limit: 1 }
    )
    const countries = extractStructArray(countryXml)
    countryId = countries.length > 0 ? (countries[0].id as number) : null
  }

  // Lookup TVA 21% sale tax if Stripe collected tax on this invoice
  let taxId: number | null = null
  if (params.taxAmount > 0) {
    const taxXml = await odooExecute(uid, 'account.tax', 'search_read',
      [[['amount', '=', 21], ['type_tax_use', '=', 'sale'], ['active', '=', true]]],
      { fields: ['id'], limit: 1 }
    )
    const taxes = extractStructArray(taxXml)
    taxId = taxes.length > 0 ? (taxes[0].id as number) : null
  }

  // Build partner payload from available Stripe data
  const partnerData: Record<string, unknown> = {
    name: params.customerName,
    email: params.customerEmail,
    customer_rank: 1,
    ...(params.vatNumber ? { vat: params.vatNumber } : {}),
    ...(params.customerPhone ? { phone: params.customerPhone } : {}),
    ...(params.billingAddress?.line1 ? { street: params.billingAddress.line1 } : {}),
    ...(params.billingAddress?.city ? { city: params.billingAddress.city } : {}),
    ...(params.billingAddress?.postal_code ? { zip: params.billingAddress.postal_code } : {}),
    ...(countryId !== null ? { country_id: countryId } : {}),
  }

  // Find or create res.partner — always update with latest Stripe billing info
  const searchXml = await odooExecute(
    uid,
    'res.partner',
    'search_read',
    [[['email', '=', params.customerEmail]]],
    { fields: ['id'], limit: 1 }
  )
  const existing = extractStructArray(searchXml)

  let partnerId: number
  if (existing.length > 0) {
    partnerId = existing[0].id as number
    await odooExecute(uid, 'res.partner', 'write', [[partnerId], partnerData])
  } else {
    const createXml = await odooExecute(uid, 'res.partner', 'create', [partnerData])
    partnerId = extractInt(createXml)
  }

  const cycle = params.billingCycle === 'yearly' ? 'annuel' : 'mensuel'
  const description = `Pointon ${params.plan} — abonnement ${cycle}`

  // Create draft invoice
  // tax_ids: apply TVA 21% when Stripe collected it; otherwise clear (B2B reverse charge or no tax)
  const createInvXml = await odooExecute(uid, 'account.move', 'create', [{
    move_type: 'out_invoice',
    partner_id: partnerId,
    invoice_date: params.invoiceDate,
    ref: `Stripe ${params.stripeInvoiceId}`,
    invoice_line_ids: [[0, 0, {
      name: description,
      quantity: 1.0,
      price_unit: params.amountHtva / 100,
      tax_ids: taxId ? [[6, 0, [taxId]]] : [[5, 0, 0]],
    }]],
  }])
  const invoiceId = extractInt(createInvXml)

  // Post (validate) the invoice
  await odooExecute(uid, 'account.move', 'action_post', [[invoiceId]])

  return invoiceId
}
