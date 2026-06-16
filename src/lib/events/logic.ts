// Pure, dependency-free event helpers (no astro: imports), so they can be unit
// tested directly. Used by the provider and the Church Center adapter.

import type { CalendarEvent, EventCategory } from './types'

/** Build-time "now" as the start of today (used to drop past events). */
export function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** Drop past events, de-duplicate by id, and sort ascending by start. */
export function normalizeUpcoming(events: CalendarEvent[]): CalendarEvent[] {
  const floor = startOfToday()
  const seen = new Set<string>()
  return events
    .filter((e) => new Date(e.start) >= floor)
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
