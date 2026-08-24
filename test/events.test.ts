import { describe, it, expect, afterEach, vi } from 'vitest'
import { buildSections, groupIntoSeries, mapCategory, normalizeUpcoming } from '../src/lib/events/logic'
import type { CalendarEvent } from '../src/lib/events/types'

describe('mapCategory', () => {
  it('routes youth signals (incl. confirmation, middle/high school)', () => {
    expect(mapCategory([], 'Pine Lake Youth')).toBe('Youth')
    expect(mapCategory(['Confirmation'], 'Class')).toBe('Youth')
    expect(mapCategory([], 'Middle School Retreat')).toBe('Youth')
  })

  it('routes care/support to Groups and serving to Serve', () => {
    expect(mapCategory(['Support Group'], 'Grief')).toBe('Groups')
    expect(mapCategory([], 'Community Meal Packaging')).toBe('Serve')
  })

  it('routes family/kids signals to Families', () => {
    expect(mapCategory([], 'Sports Camp')).toBe('Families')
    expect(mapCategory(['MomCo'], 'Gathering')).toBe('Families')
  })

  it('falls back to Everyone', () => {
    expect(mapCategory([], 'Sunday Gathering')).toBe('Everyone')
  })

  it('prioritizes Youth over family signals when both appear', () => {
    expect(mapCategory(['Families'], 'Youth Family Night')).toBe('Youth')
  })
})

describe('normalizeUpcoming', () => {
  const iso = (offsetDays: number) => {
    const d = new Date()
    d.setDate(d.getDate() + offsetDays)
    return d.toISOString()
  }
  const ev = (id: string, start: string): CalendarEvent => ({
    id,
    seriesId: id,
    title: id,
    start,
    summary: '',
    url: '/',
    category: 'Everyone',
    source: 'curated',
  })

  it('drops events before today', () => {
    const out = normalizeUpcoming([ev('past', iso(-3)), ev('future', iso(3))])
    expect(out.map((e) => e.id)).toEqual(['future'])
  })

  it('de-duplicates by id, keeping first seen', () => {
    const out = normalizeUpcoming([ev('dup', iso(2)), ev('dup', iso(5))])
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('dup')
  })

  it('sorts ascending by start', () => {
    const out = normalizeUpcoming([ev('c', iso(9)), ev('a', iso(1)), ev('b', iso(5))])
    expect(out.map((e) => e.id)).toEqual(['a', 'b', 'c'])
  })

  // "Past" is a question about church-local days. The scrape workflow runs at
  // 12:00 UTC — 5am Pacific — which is where a host-local floor goes wrong: it
  // lands on UTC midnight, i.e. 5pm Pacific *yesterday*, and keeps last night's
  // events on the page for an extra day.
  describe('measures "past" in church time, not the host timezone', () => {
    afterEach(() => vi.useRealTimers())

    /** 2026-08-09T12:00:00Z — 05:00 Pacific on Sunday 9 August. */
    const atFiveAmPacific = () => vi.useFakeTimers({ now: new Date('2026-08-09T12:00:00Z') })

    it('drops an event from yesterday evening Pacific', () => {
      atFiveAmPacific()
      // 6pm Saturday Pacific — but 01:00Z Sunday, so a UTC floor would keep it.
      const out = normalizeUpcoming([ev('last-night', '2026-08-08T18:00:00-07:00')])
      expect(out).toHaveLength(0)
    })

    it('keeps an event later today Pacific', () => {
      atFiveAmPacific()
      const out = normalizeUpcoming([ev('this-morning', '2026-08-09T10:00:00-07:00')])
      expect(out.map((e) => e.id)).toEqual(['this-morning'])
    })

    it('keeps an event earlier today Pacific, before "now"', () => {
      vi.useFakeTimers({ now: new Date('2026-08-09T21:00:00Z') }) // 2pm Pacific
      const out = normalizeUpcoming([ev('this-morning', '2026-08-09T09:00:00-07:00')])
      expect(out.map((e) => e.id)).toEqual(['this-morning'])
    })

    // The offset changes on 1 November 2026; comparing calendar dates means
    // there is no offset to choose, so the boundary needs no special handling.
    it('holds across the autumn DST boundary', () => {
      vi.useFakeTimers({ now: new Date('2026-11-01T09:30:00Z') }) // 01:30 PDT, pre-switch
      const out = normalizeUpcoming([
        ev('halloween', '2026-10-31T19:00:00-07:00'),
        ev('all-saints', '2026-11-01T10:00:00-08:00'),
      ])
      expect(out.map((e) => e.id)).toEqual(['all-saints'])
    })
  })
})

describe('groupIntoSeries', () => {
  const inst = (id: string, seriesId: string, start: string, cadence?: string): CalendarEvent => ({
    id,
    seriesId,
    cadence,
    title: seriesId,
    start,
    summary: '',
    url: '/',
    category: 'Everyone',
    source: 'pco',
  })

  it('collapses every occurrence of a series into one entry', () => {
    const out = groupIntoSeries([
      inst('a1', 'sunday', '2026-09-06T17:00:00Z', 'Every Sunday'),
      inst('a2', 'sunday', '2026-09-13T17:00:00Z', 'Every Sunday'),
      inst('a3', 'sunday', '2026-09-20T17:00:00Z', 'Every Sunday'),
    ])
    expect(out).toHaveLength(1)
    expect(out[0].instances).toHaveLength(3)
    expect(out[0].next.id).toBe('a1')
  })

  it('keeps two same-titled series apart when they are different series', () => {
    // The church runs two "Summer Meetup"s — a Sunday one at Met Market and a
    // Wednesday one at the farmers' market. Keying on title would fuse them.
    const out = groupIntoSeries([
      inst('s1', 'summer-sun', '2026-08-23T18:45:00Z', 'Every Sunday'),
      inst('s2', 'summer-wed', '2026-08-26T00:30:00Z', 'Every Wednesday'),
    ])
    expect(out).toHaveLength(2)
  })

  it('orders series by their soonest occurrence', () => {
    const out = groupIntoSeries([
      inst('b1', 'later', '2026-09-20T17:00:00Z'),
      inst('a1', 'sooner', '2026-09-06T17:00:00Z'),
    ])
    expect(out.map((s) => s.seriesId)).toEqual(['sooner', 'later'])
  })

  describe('recurrence', () => {
    it('trusts the cadence over the number of occurrences', () => {
      const once = groupIntoSeries([inst('x', 'one-off', '2026-09-02T15:00:00Z', 'Does not repeat')])
      expect(once[0].recurring).toBe(false)

      const monthly = groupIntoSeries([
        inst('y', 'monthly', '2026-09-09T20:30:00Z', 'The second Wednesday of every month'),
      ])
      // One occurrence in the window, but it is emphatically a rhythm.
      expect(monthly[0].recurring).toBe(true)
    })

    it('does not mistake a multi-day camp for a weekly rhythm', () => {
      // A three-day camp arrives as three one-day occurrences of one event, so
      // counting occurrences would file it as recurring. The cadence says no.
      const camp = groupIntoSeries([
        inst('c1', 'camp', '2027-03-13T07:00:00Z', 'Does not repeat'),
        inst('c2', 'camp', '2027-03-14T07:00:00Z', 'Does not repeat'),
        inst('c3', 'camp', '2027-03-15T07:00:00Z', 'Does not repeat'),
      ])
      expect(camp[0].recurring).toBe(false)
    })

    it('falls back to the span, not the count, when a source gives no cadence', () => {
      const camp = groupIntoSeries([
        inst('c1', 'camp', '2027-03-13T07:00:00Z'),
        inst('c2', 'camp', '2027-03-14T07:00:00Z'),
        inst('c3', 'camp', '2027-03-15T07:00:00Z'),
      ])
      expect(camp[0].recurring).toBe(false)

      const weekly = groupIntoSeries([
        inst('w1', 'weekly', '2027-03-07T17:00:00Z'),
        inst('w2', 'weekly', '2027-04-04T17:00:00Z'),
      ])
      expect(weekly[0].recurring).toBe(true)
    })
  })
})

describe('buildSections', () => {
  const at = (offsetDays: number, hour = 12) => {
    const d = new Date()
    d.setDate(d.getDate() + offsetDays)
    d.setHours(hour, 0, 0, 0)
    return d.toISOString()
  }
  const ev = (id: string, seriesId: string, start: string, cadence?: string): CalendarEvent => ({
    id,
    seriesId,
    cadence,
    title: seriesId,
    start,
    summary: '',
    url: '/',
    category: 'Everyone',
    source: 'pco',
  })

  it('does not show a one-off twice when it falls this week', () => {
    const { thisWeek, oneOffs } = buildSections([ev('o1', 'brunch', at(2), 'Does not repeat')])
    expect(thisWeek.map((e) => e.id)).toEqual(['o1'])
    expect(oneOffs).toHaveLength(0)
  })

  it('shows a one-off beyond the window under "coming up" only', () => {
    const { thisWeek, oneOffs } = buildSections([ev('o2', 'fair', at(20), 'Does not repeat')])
    expect(thisWeek).toHaveLength(0)
    expect(oneOffs.map((s) => s.seriesId)).toEqual(['fair'])
  })

  it('keeps a recurring series in the rhythms even when it also falls this week', () => {
    // Otherwise the weekly service would vanish from the rhythm list every week
    // that it happens, which is every week.
    const { thisWeek, rhythms } = buildSections([
      ev('r1', 'sunday', at(1), 'Every Sunday'),
      ev('r2', 'sunday', at(8), 'Every Sunday'),
    ])
    expect(thisWeek.map((e) => e.id)).toEqual(['r1'])
    expect(rhythms.map((s) => s.seriesId)).toEqual(['sunday'])
  })

  it('renders each event at most once for the structured-data graph', () => {
    const { rendered } = buildSections([
      ev('r1', 'sunday', at(1), 'Every Sunday'),
      ev('r2', 'sunday', at(8), 'Every Sunday'),
      ev('r3', 'sunday', at(15), 'Every Sunday'),
      ev('o1', 'fair', at(20), 'Does not repeat'),
    ])
    // The page shows one dated occurrence plus one series entry plus the one-off;
    // it must not advertise the two occurrences it collapsed away.
    expect(rendered.map((e) => e.id).sort()).toEqual(['o1', 'r1'])
  })
})
