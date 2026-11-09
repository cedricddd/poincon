import { describe, it, expect, beforeAll } from 'vitest'
import { createTrustToken, isTrustTokenValid, trustTokenFromCookieHeader, TRUST_DURATION_MS } from './two-factor-trust'

beforeAll(() => { process.env.AUTH_SECRET = 'test-secret' })

const NOW = Date.UTC(2026, 10, 9, 12)

describe('device trust token', () => {
  it('is valid for the same user and 2FA secret during 30 days', () => {
    const token = createTrustToken('u1', 'SECRETA', NOW)
    expect(isTrustTokenValid(token, 'u1', 'SECRETA', NOW + 1000)).toBe(true)
    expect(isTrustTokenValid(token, 'u1', 'SECRETA', NOW + TRUST_DURATION_MS + 1)).toBe(false)
  })
  it('is refused for another user', () => {
    expect(isTrustTokenValid(createTrustToken('u1', 'SECRETA', NOW), 'u2', 'SECRETA', NOW)).toBe(false)
  })
  it('is refused once a new device (new secret) is set up', () => {
    expect(isTrustTokenValid(createTrustToken('u1', 'SECRETA', NOW), 'u1', 'SECRETB', NOW)).toBe(false)
  })
  it('is refused without 2FA secret, tampered or malformed', () => {
    const token = createTrustToken('u1', 'SECRETA', NOW)
    expect(isTrustTokenValid(token, 'u1', null, NOW)).toBe(false)
    const [u, , mac] = token.split('.')
    expect(isTrustTokenValid(`${u}.${NOW + TRUST_DURATION_MS * 10}.${mac}`, 'u1', 'SECRETA', NOW)).toBe(false)
    expect(isTrustTokenValid('garbage', 'u1', 'SECRETA', NOW)).toBe(false)
    expect(isTrustTokenValid(undefined, 'u1', 'SECRETA', NOW)).toBe(false)
  })
  it('reads the cookie from a raw Cookie header', () => {
    expect(trustTokenFromCookieHeader('a=1; pp_2fa_trust=u1.123.abc; b=2')).toBe('u1.123.abc')
    expect(trustTokenFromCookieHeader('a=1')).toBeNull()
    expect(trustTokenFromCookieHeader(null)).toBeNull()
  })
})
