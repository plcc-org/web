import { describe, it, expect } from 'vitest'
import { fmtDay, fmtDate, fmtTime, fmtTime24, fmtWeekdayLong } from '../src/lib/events/format'

// These helpers exist for one reason: the church is in Pacific and nothing else
// is. CI builds in UTC and this file runs wherever the developer happens to be,
// so every case below picks an instant where the host's answer and the church's
// answer differ. A test that passes only in Sammamish is worse than none.

describe('church-local formatting', () => {
  // 02:00 UTC Monday is 7:00 PM the previous Sunday in Pacific.
  const sundayEvening = new Date('2026-08-24T02:00:00Z')

  it('reports the church-local day, not the host or UTC day', () => {
    expect(sundayEvening.toISOString().slice(0, 10)).toBe('2026-08-24') // UTC says Monday
    expect(fmtDay(sundayEvening)).toBe('Sun')
    expect(fmtDate(sundayEvening)).toBe('Aug 23')
    expect(fmtWeekdayLong(sundayEvening)).toBe('Sunday')
  })

  it('reports the church-local time', () => {
    expect(fmtTime(sundayEvening)).toBe('7:00 PM')
    expect(fmtTime24(sundayEvening)).toBe('19:00')
  })
})

describe('daylight saving', () => {
  it('reads an instant during PDT at the summer offset', () => {
    // Second Sunday in March 2026: 10:00 UTC is 3:00 AM PDT, not 2:00 AM.
    expect(fmtTime(new Date('2026-03-08T10:00:00Z'))).toBe('3:00 AM')
  })

  it('reads an instant during PST at the winter offset', () => {
    // First Sunday in November 2026, after the clocks go back.
    expect(fmtTime(new Date('2026-11-01T09:30:00Z'))).toBe('1:30 AM')
  })

  it('keeps the same wall-clock time either side of the change', () => {
    // Both are 10:00 AM in Sammamish despite being an hour apart as instants.
    expect(fmtTime(new Date('2026-10-25T17:00:00Z'))).toBe('10:00 AM')
    expect(fmtTime(new Date('2026-11-08T18:00:00Z'))).toBe('10:00 AM')
  })
})

describe('fmtTime24', () => {
  it('sorts by time of day rather than by instant', () => {
    // Two rhythms a week apart: the later instant is the earlier meeting.
    const mondayMorning = new Date('2026-09-14T16:45:00Z') // 9:45 AM Pacific
    const sundayEvening = new Date('2026-09-06T01:00:00Z') // 6:00 PM Pacific, Sat
    expect(fmtTime24(mondayMorning) < fmtTime24(sundayEvening)).toBe(true)
  })

  it('zero-pads so string comparison orders correctly', () => {
    expect(fmtTime24(new Date('2026-08-23T16:00:00Z'))).toBe('09:00')
  })
})
