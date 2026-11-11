// Curated adapter: a small, hand-maintained source of REAL events.
//
// This is the launch source and the permanent resilience fallback (used whenever
// a live adapter fails or returns nothing). It deliberately contains only events
// we can state with confidence, generated from recurrence rules so it never goes
// stale. Add confirmed one-off events to `fixedEvents` as their real dates and
// Church Center links become available.

import { Temporal } from 'temporal-polyfill'
import type { CalendarEvent, EventCategory } from '../types'
import { church } from '../../../config/church'
import { WEEKDAY_NAMES } from '../logic'

// --- Church-time recurrence -------------------------------------------------
// CI runs in UTC, so every occurrence is built as a wall-clock time in the
// church's zone and only then resolved to an offset, for that date and time.
// That is what keeps 10am at 10am across both DST changes, and what puts an
// early-morning time on the right side of a change made at 02:00 that day.
//
// The polyfill, not a native Temporal: this runs only at build time, and one
// implementation everywhere keeps the output identical across hosts. "Today"
// comes from Date.now(), which is also what lets the tests fake the clock.

/**
 * The next `count` occurrences of `weekday` (0 = Sunday), at the given church-local
 * time, as ISO strings with their offset: `2026-11-01T10:00:00-08:00`. Today counts
 * if it is that weekday. A time the spring-forward skips resolves to the instant
 * after the gap (02:30 becomes 03:30), Temporal's `compatible` reading.
 */
export function upcomingWeekly(weekday: number, hour: number, minute: number, count: number): string[] {
  const timeZone = church.timezone
  const today = Temporal.Instant.fromEpochMilliseconds(Date.now()).toZonedDateTimeISO(timeZone).toPlainDate()
  // Temporal numbers the week 1 (Monday) to 7 (Sunday).
  const first = today.add({ days: ((weekday || 7) - today.dayOfWeek + 7) % 7 })
  const time = new Temporal.PlainTime(hour, minute)

  return Array.from({ length: count }, (_, i) =>
    first.add({ weeks: i }).toZonedDateTime({ timeZone, plainTime: time }).toString({ timeZoneName: 'never' })
  )
}

// --- Recurring rhythms (confirmed) ----------------------------------------

type WeeklyRhythm = {
  idPrefix: string
  title: string
  weekday: number // 0 = Sunday
  hour: number
  minute: number
  durationMins: number
  summary: string
  url: string
  category: EventCategory
  /** How many upcoming instances to surface. */
  instances: number
}

const WEEKLY_RHYTHMS: WeeklyRhythm[] = [
  {
    idPrefix: 'sunday-gathering',
    title: 'Sunday Gathering',
    weekday: 0,
    hour: 10,
    minute: 0,
    durationMins: 75,
    summary: 'Worship, teaching, and programs for kids and youth.',
    url: '/visit/',
    category: 'Everyone',
    instances: 6,
  },
  {
    idPrefix: 'youth-tuesday',
    title: 'Pine Lake Youth',
    weekday: 2,
    hour: 18,
    minute: 0,
    durationMins: 120,
    summary: 'Dinner at 6pm, then connection time, worship, teaching, and small groups for middle & high school.',
    url: '/youth/',
    category: 'Youth',
    instances: 4,
  },
]

// --- Confirmed one-off events ---------------------------------------------
// Add real, dated events here as they're confirmed (with real Church Center
// links). Leave empty rather than inventing dates.
const fixedEvents: CalendarEvent[] = []

export async function curatedEvents(): Promise<CalendarEvent[]> {
  const recurring: CalendarEvent[] = WEEKLY_RHYTHMS.flatMap((r) =>
    upcomingWeekly(r.weekday, r.hour, r.minute, r.instances).map((start) => {
      const end = new Date(new Date(start).getTime() + r.durationMins * 60_000).toISOString()
      return {
        id: `${r.idPrefix}-${start.slice(0, 10)}`,
        // The prefix is already the stable per-series key these ids are built from.
        seriesId: r.idPrefix,
        cadence: `Every ${WEEKDAY_NAMES[r.weekday]}`,
        title: r.title,
        start,
        end,
        // No `location`: everything curated is on campus, and an absent location
        // is what both the display layer and the schema.org graph read as "here".
        // Spelling out the street address made it print on every single row.
        summary: r.summary,
        url: r.url,
        category: r.category,
        source: 'curated' as const,
      }
    })
  )

  return [...recurring, ...fixedEvents]
}
