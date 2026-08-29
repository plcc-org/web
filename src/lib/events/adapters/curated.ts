// Curated adapter: a small, hand-maintained source of REAL events.
//
// This is the launch source and the permanent resilience fallback (used whenever
// a live adapter fails or returns nothing). It deliberately contains only events
// we can state with confidence, generated from recurrence rules so it never goes
// stale. Add confirmed one-off events to `fixedEvents` as their real dates and
// Church Center links become available.

import type { CalendarEvent, EventCategory } from '../types'
import { church } from '../../../config/church'
import { pacificDay, WEEKDAY_NAMES } from '../logic'

// --- Pacific-time helpers --------------------------------------------------
// CI runs in UTC, so we compute Pacific wall-clock dates explicitly (DST-aware
// via Intl) rather than relying on the host timezone.

function pacificToday(): { y: number; m: number; d: number } {
  const [y, m, d] = pacificDay(new Date()).split('-').map(Number)
  return { y, m: m - 1, d }
}

/** Offset string ("-07:00" / "-08:00") for the church timezone on a given date. */
function pacificOffset(y: number, m: number, d: number, hour: number): string {
  const probe = new Date(Date.UTC(y, m, d, hour))
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: church.timezone,
    timeZoneName: 'longOffset',
  })
    .formatToParts(probe)
    .find((p) => p.type === 'timeZoneName')?.value
  const match = name?.match(/GMT([+-]\d{2}:\d{2})/)
  return match ? match[1] : '-08:00'
}

function pacificIso(y: number, m: number, d: number, hour: number, minute: number): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const offset = pacificOffset(y, m, d, hour)
  return `${y}-${pad(m + 1)}-${pad(d)}T${pad(hour)}:${pad(minute)}:00${offset}`
}

/** The next `count` occurrences of `weekday` (0 = Sunday), at the given Pacific time. */
function upcomingWeekly(weekday: number, hour: number, minute: number, count: number): string[] {
  const { y, m, d } = pacificToday()
  const cursor = new Date(Date.UTC(y, m, d)) // UTC midnight as a pure calendar carrier
  while (cursor.getUTCDay() !== weekday) cursor.setUTCDate(cursor.getUTCDate() + 1)

  const out: string[] = []
  for (let i = 0; i < count; i++) {
    out.push(pacificIso(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate(), hour, minute))
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }
  return out
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
