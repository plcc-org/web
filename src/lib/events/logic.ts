// Pure, dependency-free event helpers (no astro: imports), so they can be unit
// tested directly. Used by the provider and the Church Center adapter.

import type { CalendarEvent, EventCategory } from './types'

// The church is in Pacific time and CI is not, so every date decision here
// pins the zone rather than trusting the host.
const PACIFIC_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * The calendar date in church time, as `YYYY-MM-DD`.
 *
 * "Is this event past?" is a question about church-local *days*, not instants,
 * so it's answered by comparing calendar dates. That sidesteps DST completely —
 * there is no UTC offset to pick, and so none to get wrong on the two days a
 * year it changes — and `YYYY-MM-DD` already sorts lexicographically.
 */
function pacificDay(d: Date): string {
  return PACIFIC_DAY.format(d)
}

/** Drop past events, de-duplicate by id, and sort ascending by start. */
export function normalizeUpcoming(events: CalendarEvent[]): CalendarEvent[] {
  const today = pacificDay(new Date())
  const seen = new Set<string>()
  return events
    .filter((e) => pacificDay(new Date(e.start)) >= today)
    .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}

/** Map Church Center category tags + title to one of our coarse categories. */
export function mapCategory(catNames: string[], title: string): EventCategory {
  const hay = `${catNames.join(' ')} ${title}`.toLowerCase()
  if (/youth|club 45|confirmation|middle school|high school/.test(hay)) return 'Youth'
  if (/support group|grief|alzheimer|dementia|recovery|care\b/.test(hay)) return 'Groups'
  if (/serve|serving|volunteer|food bank|mission|blood drive|packaging/.test(hay)) return 'Serve'
  if (/kid|child|family|families|playgroup|momco|mom community|sports camp|vbs|nursery/.test(hay)) return 'Families'
  return 'Everyone'
}

/**
 * Planning Center tags that name one of our four specific categories.
 *
 * Only the specific four are listed. Tags that would resolve to `Everyone`
 * (`Worship`, `Community Event`, `Meeting`, `Adults`, …) are deliberately
 * absent: they're the *absence* of a signal, not a signal, and treating them
 * as one would shadow the title ladder below. "Blood Drive" carries only
 * `Community Event` but belongs in Serve, and the ladder is what finds it.
 *
 * Keyed lowercased; tag names come from the Ministry, Ministry Area and
 * Organization tag groups in Planning Center.
 */
const TAG_CATEGORY: ReadonlyArray<readonly [RegExp, EventCategory]> = [
  [/^youth$/, 'Youth'],
  [/^(care & recovery|congregational care|griefshare|divorcecare|stephen ministry)$/, 'Groups'],
  [/^(life group|growth group|social group)$/, 'Groups'],
  [/^missions? \/ service$/, 'Serve'],
  [/^(children & families|community playgroup|momco)/, 'Families'],
]

/**
 * The category a tag set names outright, or `null` when the tags carry no
 * specific signal and the caller should fall back to the title ladder.
 *
 * Order matches `mapCategory`'s precedence: an event tagged both `Youth` and
 * `Children & Families` is Youth.
 */
export function categoryFromTags(tagNames: string[]): EventCategory | null {
  const tags = tagNames.map((t) => t.trim().toLowerCase())
  for (const [pattern, category] of TAG_CATEGORY) {
    if (tags.some((t) => pattern.test(t))) return category
  }
  return null
}

/**
 * Category for a Planning Center event: real tags first, then the title ladder.
 *
 * Tags are authoritative when they say something specific, but Planning Center
 * tagging is inconsistent — "Newcomers Brunch" carries no tags at all — so the
 * ladder stays underneath as the fallback rather than being replaced by it.
 */
export function resolveCategory(tagNames: string[], title: string): EventCategory {
  return categoryFromTags(tagNames) ?? mapCategory(tagNames, title)
}
