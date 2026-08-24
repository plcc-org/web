// Where an event happens — and, more often, whether that's worth saying.
//
// Planning Center stamps the full campus address onto nearly every event
// ("PLCC Campus - 1715 228th Ave SE, Sammamish, Washington 98075"), so printing
// `location` verbatim repeats the church's own address down the whole page. The
// address is worth stating once; on a row it's noise that crowds out the thing
// a reader actually needs, which is the handful of events that are somewhere else.

/**
 * Is this event at the church?
 *
 * A missing location counts as on-campus: that's what the curated source means
 * by omitting it, and it's the safe reading for the schema.org graph, which
 * would otherwise emit a Place with no name.
 */
export function isOnCampus(location?: string): boolean {
  return !location || /plcc/i.test(location)
}

/**
 * A short venue name worth printing, or `undefined` when the event is at the
 * church and the location should simply be left off.
 *
 * Planning Center venue strings are "Name - street, city, state, country". The
 * reader needs the name; the rest is for a map app, and the event's own Church
 * Center page carries it.
 *
 *   "Met Market - 301 228th Ave SE, Sammamish, WA 98074, USA" → "Met Market"
 *   "Sammamish Farmers Market, Upper Sammamish Commons - 801 …" → "Sammamish Farmers Market"
 */
export function venueLabel(location?: string): string | undefined {
  if (isOnCampus(location)) return undefined
  const name = location!
    .split(/\s+[-–—]\s+/)[0]
    .split(',')[0]
    .trim()
  // A location that is only an address has no name to show. Returning the first
  // fragment anyway would print "301 228th Ave SE", or worse "Sammamish" — a
  // city passed off as a venue.
  return !name || ADDRESSY.test(name) ? undefined : name
}

/** Looks like part of a postal address rather than the name of a place. */
const ADDRESSY = /^\d|^(usa|united states)$|^[a-z]{2}\s+\d{5}$/i
