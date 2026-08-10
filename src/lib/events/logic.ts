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
