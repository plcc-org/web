import { describe, it, expect, afterEach, vi } from 'vitest'
import { curatedEvents, upcomingWeekly } from '../src/lib/events/adapters/curated'

// The curated calendar is the permanent fallback: it's what the site shows when
// Planning Center is unreachable. It's generated from weekly rules, so the thing
// that can go wrong is the arithmetic — an hour off across DST, or a Sunday that
// lands on Saturday because the build host runs in UTC.

afterEach(() => {
  vi.useRealTimers()
})

const sundays = async () => (await curatedEvents()).filter((e) => e.seriesId === 'sunday-gathering')

describe('curatedEvents', () => {
  it('starts at the coming Sunday in church time, even when UTC is already there', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-25T06:30:00Z') }) // Saturday 24 Oct, 23:30 PDT
    const [first] = await sundays()
    expect(first.start).toBe('2026-10-25T10:00:00-07:00')
  })

  it('includes today when today is Sunday', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-25T20:00:00Z') }) // Sunday 13:00 PDT
    const [first] = await sundays()
    expect(first.start.slice(0, 10)).toBe('2026-10-25')
  })

  it('keeps 10am local on both sides of the fall-back', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-20T19:00:00Z') })
    const starts = (await sundays()).map((e) => e.start)
    expect(starts.slice(0, 3)).toEqual([
      '2026-10-25T10:00:00-07:00',
      '2026-11-01T10:00:00-08:00', // the switch itself happens at 02:00 that morning
      '2026-11-08T10:00:00-08:00',
    ])
  })

  it('keeps 10am local on both sides of the spring-forward', async () => {
    vi.useFakeTimers({ now: new Date('2026-03-02T19:00:00Z') })
    const starts = (await sundays()).map((e) => e.start)
    expect(starts.slice(0, 2)).toEqual(['2026-03-08T10:00:00-07:00', '2026-03-15T10:00:00-07:00'])
    // 1 March is the Sunday before; this run starts after it.
    expect(starts[0] > '2026-03-02').toBe(true)
  })

  it('ends each occurrence after its duration, as an instant', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-20T19:00:00Z') })
    const [first] = await sundays()
    expect(new Date(first.end!).getTime() - new Date(first.start).getTime()).toBe(75 * 60_000)
  })

  it('gives every occurrence a stable id under one series, with its cadence', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-20T19:00:00Z') })
    const events = await curatedEvents()
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length)
    const youth = events.filter((e) => e.seriesId === 'youth-tuesday')
    expect(youth.map((e) => e.id)).toEqual([
      'youth-tuesday-2026-10-20',
      'youth-tuesday-2026-10-27',
      'youth-tuesday-2026-11-03',
      'youth-tuesday-2026-11-10',
    ])
    expect(youth[2].start).toBe('2026-11-03T18:00:00-08:00')
    expect(new Set(events.map((e) => e.cadence))).toEqual(new Set(['Every Sunday', 'Every Tuesday']))
    expect(events.every((e) => e.source === 'curated' && e.location === undefined)).toBe(true)
  })
})

// The rhythms above are mid-morning and evening, which the offset arithmetic
// happens to get right on a changeover day. An early-morning time is the case
// that isn't: the clocks change at 02:00 local, so anything that looks up the
// offset at the wrong moment of the day lands on the wrong side of it.
describe('upcomingWeekly', () => {
  it('uses the post-change offset for an early-morning time on fall-back day', () => {
    vi.useFakeTimers({ now: new Date('2026-10-28T19:00:00Z') })
    expect(upcomingWeekly(0, 7, 0, 2)).toEqual(['2026-11-01T07:00:00-08:00', '2026-11-08T07:00:00-08:00'])
  })

  it('uses the post-change offset for an early-morning time on spring-forward day', () => {
    vi.useFakeTimers({ now: new Date('2026-03-04T19:00:00Z') })
    expect(upcomingWeekly(0, 7, 0, 2)).toEqual(['2026-03-08T07:00:00-07:00', '2026-03-15T07:00:00-07:00'])
  })

  it('resolves a time the spring-forward skips to the instant after the gap', () => {
    vi.useFakeTimers({ now: new Date('2026-03-04T19:00:00Z') })
    // 02:30 doesn't exist on 8 March; the compatible reading is 03:30 PDT.
    expect(upcomingWeekly(0, 2, 30, 1)).toEqual(['2026-03-08T03:30:00-07:00'])
  })
})
