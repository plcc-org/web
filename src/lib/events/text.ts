// Text cleanup shared by the calendar mappers. Pure and dependency-free (no
// astro: imports), so it unit tests directly.

/** Longest summary we'll show on a card, in characters. */
export const SUMMARY_MAX = 180

export function stripHtml(html: string | undefined | null): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Trim to length on a word boundary, with an ellipsis.
 *
 * Imported descriptions are written for Church Center, so they routinely
 * overrun the card. A plain `.slice()` cuts mid-word and gives the reader no
 * signal that anything is missing.
 */
export function truncate(text: string, max = SUMMARY_MAX): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  // Only back up to a word boundary if one is reasonably close to the limit;
  // otherwise (a single very long token) take the hard cut.
  const body = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut
  return `${body.replace(/[\s,;:.!?-]+$/, '')}…`
}
