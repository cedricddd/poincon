import { describe, it, expect, vi } from 'vitest'
import { requestMeta } from '@/lib/audit'

vi.mock('@/lib/prisma', () => ({ prisma: { auditLog: { create: vi.fn() } } }))

function req(headers: Record<string, string>) {
  return { headers: { get: (n: string) => headers[n.toLowerCase()] ?? null } }
}

describe('requestMeta', () => {
  it('takes the first IP of x-forwarded-for', () => {
    expect(requestMeta(req({ 'x-forwarded-for': '77.32.148.27, 10.0.0.1', 'user-agent': 'Firefox' }))).toEqual({
      ipAddress: '77.32.148.27',
      userAgent: 'Firefox',
    })
  })

  it('falls back to x-real-ip', () => {
    expect(requestMeta(req({ 'x-real-ip': '1.2.3.4' })).ipAddress).toBe('1.2.3.4')
  })

  it('returns undefined when no IP/UA headers', () => {
    expect(requestMeta(req({}))).toEqual({ ipAddress: undefined, userAgent: undefined })
  })

  it('truncates an overly long user-agent', () => {
    expect(requestMeta(req({ 'user-agent': 'x'.repeat(600) })).userAgent).toHaveLength(500)
  })
})
