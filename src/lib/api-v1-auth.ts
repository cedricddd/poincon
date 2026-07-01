import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey, type VerifiedApiKey } from '@/lib/apikey'
import { companyHasAddon } from '@/lib/plan'
import { rateLimit } from '@/lib/rateLimit'

export async function requireApiKey(
  req: NextRequest
): Promise<{ ok: true; auth: VerifiedApiKey } | { ok: false; response: NextResponse }> {
  const header = req.headers.get('authorization') ?? ''
  const rawKey = header.startsWith('Bearer ') ? header.slice(7).trim() : null

  const verified = await verifyApiKey(rawKey)
  if (!verified) {
    return { ok: false, response: NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 }) }
  }

  if (!(await companyHasAddon(verified.companyId, 'addon_api_access'))) {
    return { ok: false, response: NextResponse.json({ error: 'API access add-on not active' }, { status: 403 }) }
  }

  const { allowed } = rateLimit(`apiKey:${verified.keyId}`, 120, 60_000)
  if (!allowed) {
    return { ok: false, response: NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 }) }
  }

  return { ok: true, auth: verified }
}
