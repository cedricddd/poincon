/**
 * Formats decimal hours as "XhMM" (e.g. 1.1667 → "1h10", 8 → "8h").
 * Rounds to the nearest minute first so 1.999 gives "2h", never "1h60".
 */
export function formatHours(hours: number): string {
  const total = Math.round(Math.abs(Number(hours) || 0) * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  const sign = hours < 0 && total > 0 ? '-' : ''
  return m > 0 ? `${sign}${h}h${String(m).padStart(2, '0')}` : `${sign}${h}h`
}
