// Canonical event domain types. Every events adapter (curated, the Planning
// Center capture, and later ICS) normalizes into CalendarEvent so the pages
// never depend on the source.

export type EventCategory = 'Everyone' | 'Families' | 'Youth' | 'Groups' | 'Serve'

export type EventSource = 'curated' | 'pco' | 'ics'

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
