// Event times are absolute instants (often UTC from Church Center); always render
// them in the church's local timezone so the build server's tz (UTC in CI) can't
// shift displayed times. Shared by <EventsBoard> and <EventRow>.

import { church } from '../../config/church'

const TZ = church.timezone

export const fmtDay = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ })
export const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ })
export const fmtTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ })

/** Full weekday name — "Sunday". The rhythm list groups on this. */
export const fmtWeekdayLong = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', timeZone: TZ })

/**
 * Church-local wall-clock time as "HH:MM", for ordering only — never displayed.
 *
 * Series in the rhythm list have their next occurrence on different dates, so
 * sorting them by instant would order them by which week they fall in rather
 * than by time of day.
 */
export const fmtTime24 = (d: Date) =>
  d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ })
