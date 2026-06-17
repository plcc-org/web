// Event times are absolute instants (often UTC from Church Center); always render
// them in the church's local timezone so the build server's tz (UTC in CI) can't
// shift displayed times. Shared by <EventsBoard> and <EventRow>.

const TZ = 'America/Los_Angeles'

export const fmtDay = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ })
export const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ })
export const fmtTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ })

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// The Sunday that begins the church-local week containing `d`, as a UTC-midnight
// Date so it can be formatted back (with timeZone: 'UTC') without a tz shift.
// Events in the same week share this anchor, so they batch under one label.
const weekStart = (d: Date): Date => {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d) // e.g. "2026-06-16"
  const weekday = WEEKDAYS.indexOf(d.toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ }))
  const sunday = new Date(`${ymd}T00:00:00Z`)
  sunday.setUTCDate(sunday.getUTCDate() - weekday)
  return sunday
}

export const weekLabel = (d: Date) =>
  `Week of ${weekStart(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`
