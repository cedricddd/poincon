import { describe, it, expect } from 'vitest'
import { clientIp } from './client-ip'

const h = (headers: Record<string, string>) => ({ get: (n: string) => headers[n.toLowerCase()] ?? null })

describe('clientIp', () => {
  it('trusts X-Real-IP, set by the proxy', () => {
    expect(clientIp(h({ 'x-real-ip': '77.32.148.27', 'x-forwarded-for': '1.1.1.1, 77.32.148.27' }))).toBe('77.32.148.27')
  })

  it('ignores a forged first X-Forwarded-For entry', () => {
    // NPM appends the real address: "<forged>, <real>"
    expect(clientIp(h({ 'x-forwarded-for': '6.6.6.6, 77.32.148.27' }))).toBe('77.32.148.27')
  })

  it('a different forged value gives the same key (no rate-limit bypass)', () => {
    const a = clientIp(h({ 'x-real-ip': '77.32.148.27', 'x-forwarded-for': '6.6.6.6, 77.32.148.27' }))
    const b = clientIp(h({ 'x-real-ip': '77.32.148.27', 'x-forwarded-for': '7.7.7.7, 77.32.148.27' }))
    expect(a).toBe(b)
  })

  it('takes a single X-Forwarded-For value as is', () => {
    expect(clientIp(h({ 'x-forwarded-for': ' 1.2.3.4 ' }))).toBe('1.2.3.4')
  })

  it('is undefined without any header (dev server reached directly)', () => {
    expect(clientIp(h({}))).toBeUndefined()
    expect(clientIp(h({ 'x-forwarded-for': ' , ' }))).toBeUndefined()
  })
})
