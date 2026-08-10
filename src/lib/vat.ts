/**
 * Normalize a Belgian VAT number to its canonical form: BE + 10 digits.
 *
 * Users copy their VAT number from invoices or official documents, where it is
 * printed with separators (BE 0765.712.060) or without the country prefix
 * (0765712060). Both are valid inputs — only the stored form is canonical.
 *
 * Returns the normalized value, which may still be invalid: callers validate
 * with isValidBelgianVat().
 */
export function normalizeVat(input: string): string {
  const compact = input.replace(/[^0-9a-zA-Z]/g, '').toUpperCase()

  // Bare 10-digit number: the BE prefix is implied.
  if (/^\d{10}$/.test(compact)) {
    return `BE${compact}`
  }

  // Older 9-digit numbers are zero-padded to 10 (pre-2008 format).
  if (/^\d{9}$/.test(compact)) {
    return `BE0${compact}`
  }

  return compact
}

export function isValidBelgianVat(input: string): boolean {
  return /^BE\d{10}$/.test(normalizeVat(input))
}
