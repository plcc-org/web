import { describe, it, expect } from 'vitest'
import { formatDay, parseDay } from '../tina/date-field.mjs'

// The CMS date picker shifted dates by a day in Pacific time: it showed a stored Sunday
// as the Saturday before, and saved a clicked Sunday as the Monday after. These hooks
// are the fix, and their whole job is that a day survives the trip through the picker
// unchanged. That has to hold in whatever zone the editor's browser is in — and this
// suite runs in Pacific on a laptop and in UTC on CI, so the round trips below get
// exercised both ways.

describe('date-only CMS field', () => {
  const days = ['2026-09-13', '2026-09-20', '2026-03-08', '2026-11-01', '2026-12-31', '2027-02-28']

  it('shows a stored day as that same day, local time', () => {
    for (const day of days) {
      const shown = new Date(formatDay(day) as string)
      const local = `${shown.getFullYear()}-${String(shown.getMonth() + 1).padStart(2, '0')}-${String(shown.getDate()).padStart(2, '0')}`
      expect(local).toBe(day)
    }
  })

  it('reads GraphQL’s UTC-midnight form as the day it names', () => {
    expect(parseDay(formatDay('2026-09-13T00:00:00.000Z'))).toBe('2026-09-13')
  })

  it('stores the day that was shown, round trip', () => {
    for (const day of days) expect(parseDay(formatDay(day))).toBe(day)
  })

  it('stores the clicked day, not the UTC day of the moment picked', () => {
    // The picker keeps the loaded time of day; from a noon value, any day clicked is
    // noon on that day locally.
    const clicked = new Date(2026, 8, 20, 12).toISOString()
    expect(parseDay(clicked)).toBe('2026-09-20')
  })

  it('leaves an empty or unreadable value alone', () => {
    expect(parseDay('')).toBe('')
    expect(formatDay(undefined)).toBeUndefined()
    expect(parseDay('not a date')).toBe('not a date')
  })
})
