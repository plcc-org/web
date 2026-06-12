// Canonical event domain types. Every events adapter (curated, Church Center,
// ICS, PCO API) normalizes into CalendarEvent so the pages never depend on the
// source. See docs/events-plan.md for the architecture.

export type EventCategory = 'Everyone' | 'Families' | 'Youth' | 'Groups' | 'Serve'

export type EventTag =
  | 'Drop-in'
  | 'Register'
  | 'Childcare'
  | 'Newcomers'
  | 'Weekly'
  | 'Monthly'
  | 'Serving'
  | 'Community'
  | 'Families'
  | 'Support'

export type EventSource = 'curated' | 'churchcenter' | 'ics' | 'pco'

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
  tags?: EventTag[]
  featured?: boolean
  source: EventSource
}
