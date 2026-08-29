// Canonical event domain types. Every events adapter (curated, the Planning
// Center capture) normalizes into CalendarEvent so the pages never depend on
// the source. A new source (a public ICS feed, say) earns its value here when
// it exists — a declared-but-unimplemented one only ever threw into the
// fallback.

export type EventCategory = 'Everyone' | 'Families' | 'Youth' | 'Groups' | 'Serve'

export type EventSource = 'curated' | 'pco'

export type CalendarEvent = {
  /** Stable id from the source — used for dedupe and as a render key. */
  id: string
  /**
   * The series this instance belongs to — stable across every occurrence.
   *
   * `id` identifies one *occurrence*, so it can't collapse a recurrence: a
   * weekly service is eight ids over an eight-week window. Grouping on
   * `seriesId` is what lets the page show "Every Sunday" once instead of
   * eight dated rows.
   */
  seriesId: string
  /**
   * How often the series repeats, in the source's own words — "Every Sunday",
   * "The second Wednesday of every month", "Does not repeat". Rendered as-is;
   * never parsed.
   */
  cadence?: string
  title: string
  /** ISO datetime with timezone offset. */
  start: string
  /** ISO datetime with timezone offset. */
  end?: string
  allDay?: boolean
  location?: string
  summary: string
  /** Church Center / registration link, or an internal page path. */
  url: string
  category: EventCategory
  source: EventSource
}
