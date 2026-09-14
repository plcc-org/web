// @ts-check
// A date-only CMS field that shows the same day it stores, in any timezone. Used by
// Sunday links' "Sunday" and short links' "Review by". The form holds a bare
// `YYYY-MM-DD`; Tina's datalayer writes it to the file as UTC midnight of that day
// (`2026-09-27T00:00:00.000Z`), and every reader takes the date part, so either form on
// disk names the same day.
//
// Tina's date field doesn't do this on its own, in two ways that compound:
//
//   - It displays `new Date(value)` in the browser's zone. GraphQL hands a stored
//     `2026-09-13` back as `2026-09-13T00:00:00.000Z`, which in Pacific is 5pm on the
//     12th — so the field shows the day before the one on file.
//   - Picking a day keeps the time of the value already there and saves toISOString().
//     Pick the 20th while that 5pm is loaded and it saves `2026-09-21T00:00:00.000Z`, so
//     trimming the time off stores the day after the one clicked.
//
// So `format` presents a stored day as noon local time (a day can't slip off noon in any
// zone), and `parse` reads a picked instant back as the calendar day in the editor's own
// zone — the day they actually clicked.

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})/

/** @type {(n: number) => string} */
const pad = (n) => String(n).padStart(2, '0')

/**
 * Stored value → what the picker shows: the stored day at local noon.
 * @param {unknown} value a bare day, or GraphQL's UTC-midnight timestamp of one
 */
export function formatDay(value) {
  const match = typeof value === 'string' ? value.match(ISO_DAY) : null
  if (!match) return value
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12).toISOString()
}

/**
 * Picked instant → what gets stored: that instant's calendar day where the editor is.
 * @param {unknown} value
 */
export function parseDay(value) {
  if (typeof value !== 'string' || !value) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** The `ui` settings for a date-only field. Spread in beside `validate`. */
export const dateOnly = { dateFormat: 'YYYY-MM-DD', format: formatDay, parse: parseDay }
