// Pure event helpers (no astro: imports), so they can be unit tested directly.
// Used by the provider and the Church Center adapter.

import type { CalendarEvent, EventCategory } from './types'
import { church } from '../../config/church'

/** Weekday names in week order — shared by the curated adapter and WeekRhythm. */
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

// The church is in Pacific time and CI is not, so every date decision here
// pins the zone rather than trusting the host.
const PACIFIC_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: church.timezone,
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
export function pacificDay(d: Date): string {
  return PACIFIC_DAY.format(d)
}

/**
 * Events falling within the next `days` church-local days, today included.
 *
 * The window is measured in calendar *days*, not a rolling 24h × n instants, so
 * "this week" means what a reader means by it. Comparing `YYYY-MM-DD` strings
 * sidesteps DST for the same reason `normalizeUpcoming` does — and it matters
 * here because CI builds at 12:00 UTC, which is the previous evening in Pacific.
 */
export function withinDays(events: CalendarEvent[], days: number): CalendarEvent[] {
  const today = new Date()
  const last = new Date(today.getTime() + (days - 1) * 86_400_000)
  const from = pacificDay(today)
  const to = pacificDay(last)
  return events.filter((e) => {
    const day = pacificDay(new Date(e.start))
    return day >= from && day <= to
  })
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

/** A recurring event collapsed to one entry, plus the occurrences behind it. */
export type EventSeries = {
  seriesId: string
  title: string
  cadence?: string
  category: EventCategory
  summary: string
  url: string
  location?: string
  /** Soonest upcoming occurrence — supplies the weekday and time shown. */
  next: CalendarEvent
  instances: CalendarEvent[]
  /** True when this happens again, i.e. it's a rhythm rather than a one-off. */
  recurring: boolean
}

/**
 * Does this series happen again, or is it a dated one-off?
 *
 * The source's own cadence is the authority, because it states the recurrence
 * *rule* and so can't be misled by what the capture window happens to contain —
 * a monthly group shows up twice in eight weeks, a weekly one gets cut off at
 * the window edge.
 *
 * The span fallback is only for a source with no cadence at all, and it's a span
 * rather than a count on purpose: a five-day summer camp arrives as five
 * separate one-day instances of one parent event, so counting instances would
 * file the camp as a weekly rhythm. Fourteen days is comfortably longer than any
 * single run of consecutive dates but shorter than two cycles of anything real.
 */
function isRecurring(cadence: string | undefined, instances: CalendarEvent[]): boolean {
  if (cadence) return !/^does not repeat$/i.test(cadence)
  const first = new Date(instances[0].start).getTime()
  const last = new Date(instances[instances.length - 1].start).getTime()
  return (last - first) / 86_400_000 > 14
}

/**
 * Collapse occurrences into series, keyed on `seriesId` and ordered by the
 * soonest occurrence.
 *
 * Keyed on the id and never on the title: the church runs two different Summer
 * Meetups — a Sunday one at Met Market and a Wednesday one at the farmers
 * market — and merging them would invent an event that doesn't exist.
 *
 * Assumes `events` is already normalized (past dropped, sorted ascending), which
 * is what makes the first occurrence seen the soonest one.
 */
export function groupIntoSeries(events: CalendarEvent[]): EventSeries[] {
  const byId = new Map<string, EventSeries>()
  for (const e of events) {
    const existing = byId.get(e.seriesId)
    if (existing) {
      existing.instances.push(e)
      continue
    }
    byId.set(e.seriesId, {
      seriesId: e.seriesId,
      title: e.title,
      cadence: e.cadence,
      category: e.category,
      summary: e.summary,
      url: e.url,
      location: e.location,
      next: e,
      instances: [e],
      recurring: false,
    })
  }

  return [...byId.values()]
    .map((s) => ({ ...s, recurring: isRecurring(s.cadence, s.instances) }))
    .sort((a, b) => new Date(a.next.start).getTime() - new Date(b.next.start).getTime())
}

/** The three sections of "What's On", plus everything they actually render. */
export type BoardSections = {
  /** Every occurrence in the next week — one-off or recurring, undifferentiated. */
  thisWeek: CalendarEvent[]
  /** Non-recurring events starting after the this-week window. */
  oneOffs: EventSeries[]
  /** Every recurring series, once, regardless of when its next occurrence falls. */
  rhythms: EventSeries[]
  /** Deduped occurrences actually on the page — what the schema.org graph may claim. */
  rendered: CalendarEvent[]
}

/**
 * Split normalized events into the page's three sections.
 *
 * The overlap rules are the part that would otherwise drift, so they live here
 * where a test can hold them:
 *
 * - A one-off already listed in "this week" is dropped from "coming up". Showing
 *   the same dated thing twice on one screen reads as a mistake.
 * - A recurring series is deliberately in both. The dated occurrence and the
 *   standing pattern answer different questions, and suppressing the rhythm
 *   whenever it happens to fall this week would hide the weekly service every
 *   week — which is every week.
 */
export function buildSections(events: CalendarEvent[], windowDays = 7): BoardSections {
  const thisWeek = withinDays(events, windowDays)
  const series = groupIntoSeries(events)

  const thisWeekIds = new Set(thisWeek.map((e) => e.id))
  const oneOffs = series.filter((s) => !s.recurring && !thisWeekIds.has(s.next.id))
  const rhythms = series.filter((s) => s.recurring)

  // Only what a reader can see. Structured data that describes occurrences the
  // page collapsed away is markup for absent content, which is a policy problem
  // and not merely untidy.
  const rendered = [...thisWeek]
  const seen = new Set(thisWeekIds)
  for (const s of [...oneOffs, ...rhythms]) {
    if (seen.has(s.next.id)) continue
    seen.add(s.next.id)
    rendered.push(s.next)
  }

  return { thisWeek, oneOffs, rhythms, rendered }
}
