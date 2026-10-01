import { describe, it, expect } from 'vitest'
import { isStreamLive } from '../src/lib/livestream'
import { church } from '../src/config/church'
import { checkNoticeLink, checkNoticeMessage } from '../tina/site-notice.mjs'

// The homepage's "Live now" banner decides in the visitor's browser, from their clock,
// whether it's Sunday-service time at the church. A wrong answer shows the link to an
// empty stream or hides it while the service is on, and nothing fails visibly — so the
// window is pinned down here, in UTC instants, across both DST changes.

const window = {
  timeZone: church.timezone,
  day: church.service.day,
  opens: church.service.opens,
  ...church.service.stream,
}
const live = (iso: string) => isStreamLive(new Date(iso), window)

describe('isStreamLive', () => {
  // 2026-09-27 is a Sunday in PDT (UTC−7).
  it('opens ten minutes before the service', () => {
    expect(live('2026-09-27T09:49:00-07:00')).toBe(false)
    expect(live('2026-09-27T09:50:00-07:00')).toBe(true)
  })

  it('closes at 11:30', () => {
    expect(live('2026-09-27T11:29:00-07:00')).toBe(true)
    expect(live('2026-09-27T11:30:00-07:00')).toBe(false)
  })

  it('stays off at service time on other days', () => {
    expect(live('2026-09-26T10:00:00-07:00')).toBe(false)
    expect(live('2026-09-28T10:00:00-07:00')).toBe(false)
  })

  it('goes by church time, not UTC', () => {
    // 17:00Z on Sunday is 10:00 at the church.
    expect(live('2026-09-27T17:00:00Z')).toBe(true)
    // 10:00Z on Sunday is 3am at the church.
    expect(live('2026-09-27T10:00:00Z')).toBe(false)
    // 17:00Z on Monday is Monday at the church too.
    expect(live('2026-09-28T17:00:00Z')).toBe(false)
  })

  it('follows the clocks across both DST changes', () => {
    // 2026-11-01: clocks go back at 2am, so the service is 10:00 PST (UTC−8).
    expect(live('2026-11-01T18:00:00Z')).toBe(true)
    expect(live('2026-11-01T17:45:00Z')).toBe(false)
    // 2027-03-14: clocks go forward at 2am, so the service is 10:00 PDT (UTC−7).
    expect(live('2027-03-14T17:00:00Z')).toBe(true)
    expect(live('2027-03-14T18:30:00Z')).toBe(false)
  })
})

describe('site notice rules', () => {
  it('needs a message only when switched on', () => {
    expect(checkNoticeMessage('', false)).toBeUndefined()
    expect(checkNoticeMessage('  ', true)).toBeTruthy()
    expect(checkNoticeMessage('Service canceled for snow.', true)).toBeUndefined()
  })

  it('treats the link as optional but checks one when given', () => {
    expect(checkNoticeLink('')).toBeUndefined()
    expect(checkNoticeLink('/events/')).toBeUndefined()
    expect(checkNoticeLink('plcc.org')).toBeTruthy()
  })
})
