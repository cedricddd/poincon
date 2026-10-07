import { describe, it, expect } from 'vitest'
import { isDisposableEmail } from '@/lib/disposable-email'

describe('isDisposableEmail', () => {
  it('rejects yopmail and its alias domains', () => {
    expect(isDisposableEmail('alice99@yopmail.com')).toBe(true)
    expect(isDisposableEmail('bob@YopMail.FR')).toBe(true)
    expect(isDisposableEmail('x@jetable.fr.nf')).toBe(true)
  })

  it('rejects subdomains of listed domains', () => {
    expect(isDisposableEmail('x@foo.mailinator.com')).toBe(true)
  })

  it('accepts regular providers and company domains', () => {
    expect(isDisposableEmail('someone@gmail.com')).toBe(false)
    expect(isDisposableEmail('rh@entreprise.be')).toBe(false)
    expect(isDisposableEmail('x@notyopmail.com')).toBe(false)
  })

  it('handles malformed input without throwing', () => {
    expect(isDisposableEmail('')).toBe(false)
    expect(isDisposableEmail('no-at-sign')).toBe(false)
  })
})
