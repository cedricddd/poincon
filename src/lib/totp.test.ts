import { describe, it, expect, vi, afterEach } from 'vitest'
import crypto from 'crypto'
import { generateSecret, verifyTOTP } from '@/lib/totp'

// RFC 6238 Appendix B test secret: ASCII "12345678901234567890" in base32
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

afterEach(() => vi.useRealTimers())

describe('generateSecret', () => {
  it('returns 32 base32 characters (160-bit secret)', () => {
    const secret = generateSecret()
    expect(secret).toMatch(/^[A-Z2-7]{32}$/)
  })

  it('encodes all 20 random bytes', () => {
    const bytes = Buffer.from('12345678901234567890')
    vi.spyOn(crypto, 'randomBytes').mockImplementationOnce(() => bytes as never)
    expect(generateSecret()).toBe(RFC_SECRET)
  })
})

describe('verifyTOTP', () => {
  it('matches the RFC 6238 SHA1 vector at T=59', () => {
    vi.useFakeTimers()
    vi.setSystemTime(59_000)
    // RFC value is 94287082 (8 digits) → last 6 digits
    expect(verifyTOTP('287082', RFC_SECRET)).toBe(true)
    expect(verifyTOTP('000000', RFC_SECRET)).toBe(false)
  })

  it('rejects malformed codes', () => {
    expect(verifyTOTP('abc', RFC_SECRET)).toBe(false)
  })
})
