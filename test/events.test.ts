import { describe, it, expect } from 'vitest'
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
})
