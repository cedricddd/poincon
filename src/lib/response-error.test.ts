import { describe, it, expect } from 'vitest'
import { readErrorMessage } from './response-error'

describe('readErrorMessage', () => {
  it('returns the error field of a JSON body', async () => {
    const res = new Response(JSON.stringify({ error: 'Champs requis' }), { status: 400 })
    expect(await readErrorMessage(res, 'fallback')).toBe('Champs requis')
  })

  it('falls back on an empty body (405 without content)', async () => {
    expect(await readErrorMessage(new Response(null, { status: 405 }), 'fallback')).toBe('fallback')
  })

  it('falls back on an HTML error page', async () => {
    expect(await readErrorMessage(new Response('<html>502</html>', { status: 502 }), 'fallback')).toBe('fallback')
  })

  it('falls back when the JSON has no error string', async () => {
    expect(await readErrorMessage(new Response('{"code":"X"}', { status: 400 }), 'fallback')).toBe('fallback')
  })
})
