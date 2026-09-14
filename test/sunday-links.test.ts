import { describe, it, expect } from 'vitest'
import {
  checkLinkUrl,
  checkSunday,
  churchToday,
  formatSunday,
  linkKind,
  nextSunday,
  pastWeeks,
  pickWeeks,
  toIsoDate,
} from '../tina/sunday-links.mjs'

// The Sunday links page is what the NFC tags in the building open, and it decides at
// build time which week is live. A wrong answer here doesn't fail anything visibly — it
// just shows last week's links on a Sunday morning — so the date logic is pinned down
// directly, including the evening where UTC (CI's clock) and Pacific disagree.

const PACIFIC = 'America/Los_Angeles'
const weeks = (...sundays: string[]) => sundays.map((sunday) => ({ sunday }))

describe('pickWeeks', () => {
  const all = weeks('2026-09-06', '2026-09-20', '2026-09-13', '2026-09-27')

  it('shows the latest Sunday on or before today, and the next one after it', () => {
    const { live, next } = pickWeeks(all, '2026-09-16')
    expect(live?.sunday).toBe('2026-09-13')
    expect(next?.sunday).toBe('2026-09-20')
  })

  it('switches over on the Sunday itself', () => {
    const { live, next } = pickWeeks(all, '2026-09-20')
    expect(live?.sunday).toBe('2026-09-20')
    expect(next?.sunday).toBe('2026-09-27')
  })

  it('keeps the last week showing when a Sunday was missed', () => {
    const { live, next } = pickWeeks(weeks('2026-09-06'), '2026-09-22')
    expect(live?.sunday).toBe('2026-09-06')
    expect(next).toBeUndefined()
  })

  it('has no live week when everything is still ahead', () => {
    const { live, next } = pickWeeks(weeks('2026-09-20'), '2026-09-14')
    expect(live).toBeUndefined()
    expect(next?.sunday).toBe('2026-09-20')
  })

  it('refuses two entries on the same date rather than guessing', () => {
    expect(() => pickWeeks(weeks('2026-09-13', '2026-09-13'), '2026-09-14')).toThrow(/both dated 2026-09-13/)
  })
})

describe('pastWeeks', () => {
  it('keeps the live week and everything after it', () => {
    const past = pastWeeks(weeks('2026-08-30', '2026-09-06', '2026-09-13', '2026-09-20'), '2026-09-14')
    expect(past.map((w) => w.sunday)).toEqual(['2026-08-30', '2026-09-06'])
  })

  it('deletes nothing when no week is live yet', () => {
    expect(pastWeeks(weeks('2026-09-20'), '2026-09-14')).toEqual([])
  })
})

describe('churchToday', () => {
  it('is still Saturday in Sammamish when UTC has reached Sunday', () => {
    // 06:30 UTC on the 20th is 23:30 PDT on the 19th.
    expect(churchToday(PACIFIC, new Date('2026-09-20T06:30:00Z'))).toBe('2026-09-19')
  })

  it('is Sunday at the nightly build (12:00 UTC, 5am PDT)', () => {
    expect(churchToday(PACIFIC, new Date('2026-09-20T12:00:00Z'))).toBe('2026-09-20')
  })
})

describe('nextSunday', () => {
  it('finds the coming Sunday midweek', () => {
    expect(nextSunday('2026-09-14')).toBe('2026-09-20')
    expect(nextSunday('2026-09-19')).toBe('2026-09-20')
  })

  it('looks a week ahead on a Sunday', () => {
    expect(nextSunday('2026-09-13')).toBe('2026-09-20')
  })

  it('crosses a month and a year', () => {
    expect(nextSunday('2026-12-29')).toBe('2027-01-03')
  })
})

describe('formatSunday', () => {
  it('names the day the way the page shows it, independent of the host zone', () => {
    expect(formatSunday('2026-09-20')).toBe('Sunday, September 20')
  })
})

describe('toIsoDate', () => {
  it('accepts the three shapes a date arrives in', () => {
    expect(toIsoDate('2026-09-20')).toBe('2026-09-20')
    expect(toIsoDate('2026-09-20T07:00:00.000Z')).toBe('2026-09-20')
    expect(toIsoDate(new Date('2026-09-20'))).toBe('2026-09-20')
  })
})

describe('checkSunday', () => {
  it('accepts a Sunday in any of its shapes', () => {
    expect(checkSunday('2026-09-20')).toBeUndefined()
    expect(checkSunday(new Date('2026-09-20'))).toBeUndefined()
  })

  it('names the weekday it got instead', () => {
    expect(checkSunday('2026-09-19')).toMatch(/Saturday/)
  })

  it('rejects an empty or impossible date', () => {
    expect(checkSunday('')).toMatch(/Pick the Sunday/)
    expect(checkSunday('2026-02-30')).toMatch(/isn’t a date/)
  })
})

describe('checkLinkUrl', () => {
  it('accepts websites, emails and pages on this site', () => {
    expect(checkLinkUrl('https://plcc.churchcenter.com/people/forms/1061580')).toBeUndefined()
    expect(checkLinkUrl('mailto:kimw@plcc.org')).toBeUndefined()
    expect(checkLinkUrl('mailto:pastors@plcc.org?subject=Hello')).toBeUndefined()
    expect(checkLinkUrl('/events/')).toBeUndefined()
  })

  it('names the fix for the likely mistakes', () => {
    expect(checkLinkUrl('http://plcc.org')).toMatch(/https:\/\/ version/)
    expect(checkLinkUrl('plcc.churchcenter.com/giving')).toMatch(/https:\/\/plcc\.churchcenter\.com\/giving/)
    expect(checkLinkUrl('kimw@plcc.org')).toMatch(/mailto:kimw@plcc\.org/)
    expect(checkLinkUrl('mailto:')).toMatch(/needs an address/)
    expect(checkLinkUrl('https://plcc.org/a b')).toMatch(/space/)
  })

  it('rejects what is not a link at all', () => {
    expect(checkLinkUrl('')).toBeDefined()
    expect(checkLinkUrl('//cdn.example.org')).toBeDefined()
    expect(checkLinkUrl('#announcements')).toBeDefined()
    expect(checkLinkUrl('tel:+14253928636')).toBeDefined()
  })
})

describe('linkKind', () => {
  it('picks the icon from what the link does', () => {
    expect(linkKind('mailto:office@plcc.org')).toBe('mail')
    expect(linkKind('/events/')).toBe('site')
    expect(linkKind('https://plcc.churchcenter.com/giving')).toBe('web')
  })
})
