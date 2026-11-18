import { describe, expect, it } from 'vitest'
import { normalizeEmail } from './email'

describe('normalizeEmail', () => {
  it('lower-cases the whole address', () => {
    expect(normalizeEmail('Nukagamesshop@Gmail.COM')).toBe('nukagamesshop@gmail.com')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeEmail('  someone@example.be \n')).toBe('someone@example.be')
  })

  it('leaves an already canonical address unchanged', () => {
    expect(normalizeEmail('admin@pointon.be')).toBe('admin@pointon.be')
  })
})
