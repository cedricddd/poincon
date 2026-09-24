import { routing } from '@/i18n/routing'

/**
 * Pages whose content only exists in French (hard-coded copy, no translations
 * yet). Their /nl, /en and /de URLs render the same French text, so they must
 * not be advertised as translations — Google flags them as duplicates.
 * Remove a path from here once the page is translated.
 */
const FR_ONLY_PATHS = [
  '/comparaison',
  '/legal/compliance',
  '/legal/privacy',
  '/legal/terms',
  '/legal/security',
]

/** Locales in which a path (without locale prefix) has real content. */
export function localesForPath(pathWithoutLocale: string): readonly string[] {
  return FR_ONLY_PATHS.includes(pathWithoutLocale) ? ['fr'] : routing.locales
}
