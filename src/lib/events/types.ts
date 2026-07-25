// Canonical event domain types. Every events adapter (curated, snapshot, and
// later ICS or the PCO API) normalizes into CalendarEvent so the pages never
// depend on the source.

export type EventCategory = 'Everyone' | 'Families' | 'Youth' | 'Groups' | 'Serve'

export type EventSource = 'curated' | 'snapshot' | 'ics' | 'pco'

export type CalendarEvent = {
  /** Stable id from the source — used for dedupe and as a render key. */
  id: string
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
  featured?: boolean
  source: EventSource
}
