import { describe, it, expect, afterEach, vi } from 'vitest'
import { mapCategory, normalizeUpcoming } from '../src/lib/events/logic'
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
