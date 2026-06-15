// Event times are absolute instants (often UTC from Church Center); always render
// them in the church's local timezone so the build server's tz (UTC in CI) can't
// shift displayed times. Shared by <EventsBoard> and <EventRow>.

const TZ = 'America/Los_Angeles'

export const fmtDay = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ })
export const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ })
export const fmtTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ })
export const weekLabel = (d: Date) => `Week of ${fmtDate(d)}`
