import { describe, it, expect } from 'vitest'
import { isOnCampus, venueLabel } from '../src/lib/events/place'
import { eventGraph } from '../src/lib/structured-data'
import type { CalendarEvent } from '../src/lib/events/types'

// The three location strings below are the only ones the live calendar contains;
// 35 of 38 events carry the first.
const CAMPUS = 'PLCC Campus - 1715 228th Ave SE, Sammamish, Washington 98075'
const MET = 'Met Market - 301 228th Ave SE, Sammamish, WA 98074, USA'
const FARMERS = 'Sammamish Farmers Market, Upper Sammamish Commons - 801 228th Ave SE, Sammamish, WA 98074, USA'

describe('isOnCampus', () => {
  it('recognises the campus by its Church Center label', () => {
    expect(isOnCampus(CAMPUS)).toBe(true)
  })

  it('treats a missing location as on campus', () => {
    // What the curated source means by leaving it off, and the safe reading for
    // the schema.org graph, which would otherwise emit a Place with no name.
    expect(isOnCampus(undefined)).toBe(true)
  })

  it('recognises an off-campus venue', () => {
    expect(isOnCampus(MET)).toBe(false)
    expect(isOnCampus(FARMERS)).toBe(false)
  })
})

describe('venueLabel', () => {
  it('says nothing when the event is at the church', () => {
    expect(venueLabel(CAMPUS)).toBeUndefined()
    expect(venueLabel(undefined)).toBeUndefined()
  })

  it('keeps the venue name and drops the postal address', () => {
    expect(venueLabel(MET)).toBe('Met Market')
    expect(venueLabel(FARMERS)).toBe('Sammamish Farmers Market')
  })

  it('says nothing rather than passing off an address fragment as a place', () => {
    // A blind split would render this as "301 228th Ave SE" or, worse, a bare
    // "Sammamish" — a city presented as the name of a venue.
    expect(venueLabel('301 228th Ave SE, Sammamish, WA 98074')).toBeUndefined()
  })
})

describe('the structured-data graph still gets the full location', () => {
  const ev = (location: string | undefined): CalendarEvent => ({
    id: '1',
    seriesId: 's',
    title: 'Event',
    start: '2026-09-06T17:00:00Z',
    summary: '',
    url: 'https://example.test/e',
    category: 'Everyone',
    location,
    source: 'pco',
  })

  it('points an on-campus event at the church Place node', () => {
    const [node] = eventGraph('https://plcc.org', [ev(CAMPUS)])
    expect(node.location).toEqual({ '@id': 'https://plcc.org/#place' })
  })

  it('gives an off-campus event the RAW location, not the shortened label', () => {
    // The page wants the shortest name it can print; the graph wants the fullest
    // identifier it has. Swapping venueLabel() in here would be a one-character
    // change that nothing else would catch.
    const [node] = eventGraph('https://plcc.org', [ev(MET)])
    expect(node.location).toEqual({ '@type': 'Place', name: MET })
  })
})
