/**
 * Email addresses are stored and compared in one canonical form: trimmed and
 * lower-cased. Without this, "Name@x.com" saved at signup could not log in as
 * "name@x.com" and never received the password-reset mail.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
