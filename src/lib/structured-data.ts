// schema.org structured data (JSON-LD).
//
// Everything here is derived from data the site already holds — src/config/church.ts
// for the organisation, the events provider for the calendar — so the graph can't
// drift from what's rendered on the page.
//
// Emitted as a single `@graph` from BaseLayout rather than several sibling
// <script> tags: one graph lets the nodes cross-reference each other by `@id`
// (every Event points at the Church as its `location`/`organizer`), which is
// what tells a crawler these are the same real-world entity rather than
// coincidentally similar names.

import { church, serviceCloses } from '../config/church'
import type { CalendarEvent } from './events/types'

/** Stable `@id` fragments. Absolute so nodes can be referenced across pages. */
const ID = {
  church: (origin: string) => `${origin}/#church`,
  place: (origin: string) => `${origin}/#place`,
}

type JsonLdNode = Record<string, unknown>

function postalAddress(): JsonLdNode {
  return {
    '@type': 'PostalAddress',
    streetAddress: church.address.street,
    addressLocality: church.address.locality,
    addressRegion: church.address.region,
    postalCode: church.address.postalCode,
    addressCountry: church.address.country,
  }
}

/**
 * The Church node, plus the Place it meets in.
 *
 * `Church` is a schema.org subtype of `PlaceOfWorship` → `CivicStructure` →
 * `Place`, so it is *both* the organisation and the location. We still emit a
 * separate Place node with the same address: events reference the Place, and
 * keeping them distinct avoids an Event whose `location` is an Organization
 * (which validators flag).
 *
 * `openingHoursSpecification` is the part that earns its keep — it's how a
 * "church near me / service times" query gets an answer without a crawler
 * having to parse the hero copy.
 */
export function churchGraph(origin: string, images: { logo?: string; image?: string } = {}): JsonLdNode[] {
  const place: JsonLdNode = {
    '@type': 'Place',
    '@id': ID.place(origin),
    name: church.name,
    address: postalAddress(),
    geo: {
      '@type': 'GeoCoordinates',
      latitude: church.geo.latitude,
      longitude: church.geo.longitude,
    },
    hasMap: church.mapUrl,
  }

  const org: JsonLdNode = {
    '@type': 'Church',
    '@id': ID.church(origin),
    name: church.name,
    alternateName: church.shortName,
    description: church.description,
    url: `${origin}/`,
    email: church.email,
    telephone: church.telephone,
    address: postalAddress(),
    geo: place.geo,
    hasMap: church.mapUrl,
    sameAs: [church.social.instagram, church.social.youtube],
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${church.service.day}`,
        opens: church.service.opens,
        closes: serviceCloses(),
      },
    ],
  }

  // `logo` wants a square mark; `image` wants something representative of the
  // place. Feeding the 1200x630 social card to both would fail Google's logo
  // aspect-ratio guidance, so they're supplied separately.
  if (images.logo) org.logo = images.logo
  if (images.image) org.image = images.image

  return [org, place]
}

/**
 * Event nodes for the calendar.
 *
 * Emitted on the "Everyone" board only, never on the four category pages —
 * the same event appearing under five URLs would read as five separate
 * entities. Category pages still carry the Church node from BaseLayout.
 */
export function eventGraph(origin: string, events: CalendarEvent[]): JsonLdNode[] {
  return events.map((e) => {
    const node: JsonLdNode = {
      '@type': 'Event',
      name: e.title,
      startDate: e.start,
      description: e.summary,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      organizer: { '@id': ID.church(origin) },
      // Most events are at the building; anything else (the Met Market meetup,
      // the farmers' market) gets a bare named Place, since we don't hold
      // addresses for third-party venues.
      location: isOnCampus(e.location) ? { '@id': ID.place(origin) } : { '@type': 'Place', name: e.location },
    }
    if (e.end) node.endDate = e.end
    if (e.url) node.url = e.url
    return node
  })
}

/** Church Center labels the building "PLCC Campus"; treat a missing location as on-site too. */
function isOnCampus(location?: string): boolean {
  return !location || /plcc/i.test(location)
}

/** Wrap nodes in the single `@graph` document BaseLayout renders. */
export function jsonLdDocument(nodes: JsonLdNode[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes })
}
