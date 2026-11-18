import { describe, it, expect } from 'vitest'
import {
  currentStep,
  stepExpiresAt,
  qrCode,
  verifyQrCode,
  qrScanUrl,
  safeInterval,
  isDynamicQrMode,
  generateQrPublicId,
  generateQrSecret,
} from './kiosk-qr'

const SECRET = 'test-secret-0123456789abcdef'
const PUBLIC_ID = 'pub-terminal-1'
const T0 = new Date('2026-11-18T15:00:00.000Z') // exact multiple of 30 s and 60 s

const codeAt = (date: Date, interval = 30, publicId = PUBLIC_ID) =>
  qrCode(SECRET, publicId, currentStep(date, interval))
const plus = (date: Date, seconds: number) => new Date(date.getTime() + seconds * 1000)

describe('qrCode', () => {
  it('is 12 url-safe characters and stable for a given step', () => {
    const code = codeAt(T0)
    expect(code).toMatch(/^[A-Za-z0-9_-]{12}$/)
    expect(codeAt(plus(T0, 29))).toBe(code)
  })

  it('changes with the step, the terminal and the secret', () => {
    const code = codeAt(T0)
    expect(codeAt(plus(T0, 30))).not.toBe(code)
    expect(codeAt(T0, 30, 'other-terminal')).not.toBe(code)
    expect(qrCode('another-secret', PUBLIC_ID, currentStep(T0, 30))).not.toBe(code)
  })
})

describe('verifyQrCode', () => {
  it('accepts the code of the current step', () => {
    expect(verifyQrCode(SECRET, PUBLIC_ID, codeAt(T0), plus(T0, 10), 30)).toBe(true)
  })

  it('accepts the code of the previous step (scan just before the change)', () => {
    expect(verifyQrCode(SECRET, PUBLIC_ID, codeAt(T0), plus(T0, 59), 30)).toBe(true)
  })

  it('refuses a code two steps old (photo of the screen)', () => {
    expect(verifyQrCode(SECRET, PUBLIC_ID, codeAt(T0), plus(T0, 60), 30)).toBe(false)
    expect(verifyQrCode(SECRET, PUBLIC_ID, codeAt(T0, 60), plus(T0, 120), 60)).toBe(false)
  })

  it('refuses a future code', () => {
    expect(verifyQrCode(SECRET, PUBLIC_ID, codeAt(plus(T0, 30)), T0, 30)).toBe(false)
  })

  it('refuses a code of another terminal', () => {
    expect(verifyQrCode(SECRET, PUBLIC_ID, codeAt(T0, 30, 'other-terminal'), T0, 30)).toBe(false)
  })

  it('refuses malformed or forged codes', () => {
    for (const bad of [undefined, null, 42, '', 'short', 'x'.repeat(13), 'abc def ghij', 'AAAAAAAAAAAA']) {
      expect(verifyQrCode(SECRET, PUBLIC_ID, bad, T0, 30)).toBe(false)
    }
  })
})

describe('helpers', () => {
  it('stepExpiresAt is the start of the next step', () => {
    expect(stepExpiresAt(plus(T0, 12), 30).toISOString()).toBe(plus(T0, 30).toISOString())
    expect(stepExpiresAt(T0, 60).toISOString()).toBe(plus(T0, 60).toISOString())
  })

  it('safeInterval only keeps 30 or 60 seconds', () => {
    expect(safeInterval(30)).toBe(30)
    expect(safeInterval(60)).toBe(60)
    expect(safeInterval(5)).toBe(30)
    expect(safeInterval(null)).toBe(30)
  })

  it('isDynamicQrMode', () => {
    expect(isDynamicQrMode('qr')).toBe(true)
    expect(isDynamicQrMode('qr_pin')).toBe(true)
    expect(isDynamicQrMode('pin')).toBe(false)
    expect(isDynamicQrMode(undefined)).toBe(false)
  })

  it('qrScanUrl builds the scan link without a double slash', () => {
    expect(qrScanUrl('https://pointon.be/', 'abc', 'Code_123-xyz')).toBe('https://pointon.be/qr/t/abc?c=Code_123-xyz')
  })

  it('generated ids and secrets are random and url-safe', () => {
    expect(generateQrPublicId()).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(generateQrSecret()).not.toBe(generateQrSecret())
  })
})
