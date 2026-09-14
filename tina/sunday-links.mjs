// @ts-check
// Sunday links (/links/): the rules one link has to satisfy, and the date logic that
// decides which Sunday the page shows. Shared by every place that needs an answer —
// tina/config.ts (form validation), src/content.config.ts (build validation), the page
// (which week is live), and scripts/prune-sunday-links.mjs (which weeks are past) — so
// the form, the build, the page and the cleanup can't disagree about what "this Sunday"
// means.
//
// Every date here is a church-local calendar day written `YYYY-MM-DD`. Those compare
// correctly as strings and carry no UTC offset, so there is no offset to get wrong on
// the two days a year DST changes — the same approach as pacificDay in
// src/lib/events/logic.ts.
//
// Plain .mjs for the same reason short-link-rules.mjs is: importable from a Node script
// and from the CMS config without a build step.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Noon UTC on a calendar day: far enough from midnight that no timezone moves it. */
/** @type {(date: string) => Date} */
const atNoon = (date) => new Date(`${date}T12:00:00Z`)

/** @type {(date: string) => boolean} */
const isRealDate = (date) => {
  if (!ISO_DATE.test(date)) return false
  const d = atNoon(date)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date
}

/**
 * A day as `YYYY-MM-DD`, from whichever form it arrived in. The CMS date picker hands
 * over a full ISO timestamp, and Astro's YAML loader (js-yaml) reads an unquoted
 * `2026-09-20` as a Date at UTC midnight.
 * @param {unknown} value
 * @returns {string}
 */
export function toIsoDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10)
  return typeof value === 'string' ? value.trim().split('T')[0] : ''
}

/**
 * Today in the church's timezone. CI runs in UTC, where Saturday evening in Sammamish
 * is already Sunday, so the host's own date can't be used.
 * @param {string} timeZone IANA zone — pass church.timezone
 * @param {Date} [now]
 */
export function churchToday(timeZone, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/**
 * The Sunday after `today` — a week on when today is itself a Sunday, since that is the
 * list an editor is preparing by then.
 * @param {string} today YYYY-MM-DD
 */
export function nextSunday(today) {
  const d = atNoon(today)
  d.setUTCDate(d.getUTCDate() + (7 - d.getUTCDay()))
  return d.toISOString().slice(0, 10)
}

/**
 * "Sunday, September 20" — how the page and the preview banner name a week.
 * @param {string} date YYYY-MM-DD
 */
export function formatSunday(date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(
    atNoon(date)
  )
}

/**
 * The week's date must be a real Sunday.
 * @param {unknown} value
 * @returns {string | undefined} a message for the editor, or undefined when valid
 */
export function checkSunday(value) {
  const date = toIsoDate(value)
  if (!date) return 'Pick the Sunday these links are for.'
  if (!isRealDate(date)) return `“${date}” isn’t a date. Pick one from the calendar.`
  const day = atNoon(date).getUTCDay()
  if (day !== 0) return `That’s a ${WEEKDAYS[day]}. Pick the Sunday these links are for.`
  return undefined
}

/**
 * A link opens a website (https), an email (mailto), or a page on this site (/events/).
 * Each rejection names the fix, because the likeliest mistakes — a pasted bare domain,
 * an email address without "mailto:" — are one edit away from working.
 * @param {unknown} value
 * @returns {string | undefined}
 */
export function checkLinkUrl(value) {
  const url = typeof value === 'string' ? value.trim() : ''
  if (!url) return 'Add the address this link opens.'
  if (/\s/.test(url)) return 'The address has a space in it. Copy it again from the browser’s address bar.'
  if (/^mailto:/i.test(url)) {
    const address = url.slice('mailto:'.length).split('?')[0]
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)
      ? undefined
      : 'An email link needs an address after “mailto:”, like mailto:office@plcc.org.'
  }
  if (/^https:\/\/[^/]+\.[^/]+/i.test(url)) return undefined
  if (/^http:\/\//i.test(url)) return 'Use the https:// version of the address.'
  if (/^\/(?!\/)/.test(url)) return undefined
  if (/^[^@\s/:]+@[^@\s]+\.[^@\s]+$/.test(url)) return `For an email link, put “mailto:” in front: mailto:${url}`
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(url)) return `Start the address with https://, like https://${url}`
  return 'Start with https:// for a website, mailto: for an email, or / for a page on this site (/events/).'
}

/**
 * What following a link does, which picks its icon: leave for another site, open an
 * email, or stay on this one.
 * @param {string} url
 * @returns {'mail' | 'site' | 'web'}
 */
export function linkKind(url) {
  if (/^mailto:/i.test(url)) return 'mail'
  return /^\/(?!\/)/.test(url) ? 'site' : 'web'
}

/**
 * Which week is live and which comes next. Live is the latest Sunday on or before
 * today — so a week stays up until the following Sunday replaces it, and a missed week
 * leaves the last one showing rather than an empty page. Next is the earliest Sunday
 * after today.
 *
 * Two entries on the same date throw: nothing can tell which one the editor meant,
 * and silently picking one would publish the wrong links with no sign anything is off.
 * @template {{ sunday: string }} W
 * @param {W[]} weeks
 * @param {string} today YYYY-MM-DD
 * @returns {{ live: W | undefined, next: W | undefined }}
 */
export function pickWeeks(weeks, today) {
  const sorted = [...weeks].sort((a, b) => a.sunday.localeCompare(b.sunday))
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].sunday === sorted[i - 1].sunday) {
      throw new Error(
        `Two Sunday links entries are both dated ${sorted[i].sunday}. Change the date on one of them (or delete it) in the CMS.`
      )
    }
  }
  return {
    live: sorted.filter((w) => w.sunday <= today).at(-1),
    next: sorted.find((w) => w.sunday > today),
  }
}

/**
 * Weeks the page will never show again: everything dated before the live week. The
 * live week itself stays, because it's what an editor duplicates to start the next one.
 * @template {{ sunday: string }} W
 * @param {W[]} weeks
 * @param {string} today YYYY-MM-DD
 * @returns {W[]}
 */
export function pastWeeks(weeks, today) {
  const { live } = pickWeeks(weeks, today)
  return live ? weeks.filter((w) => w.sunday < live.sunday) : []
}

/**
 * The label + address pair both CMS collections build their link lists from, with the
 * same rule in the form that the build applies.
 * @param {string} description
 */
export function linkListField(description) {
  return {
    name: 'links',
    label: 'Links',
    type: 'object',
    list: true,
    openFormOnCreate: true,
    description,
    // Rows show in the order they appear on the page — drag to reorder.
    ui: { itemProps: (/** @type {{ label?: string }} */ item) => ({ label: item?.label || 'New link' }) },
    fields: [
      {
        name: 'label',
        label: 'Label',
        type: 'string',
        required: true,
        description:
          'What people tap — “Today’s Scripture”, “Sign up for Supper Club”. Short enough for one line on a phone.',
      },
      {
        name: 'url',
        label: 'Opens',
        type: 'string',
        required: true,
        ui: { validate: (/** @type {unknown} */ value) => checkLinkUrl(value) },
        description:
          'A website starting https:// (paste it from the address bar), an email written mailto:name@plcc.org, ' +
          'or a page on this site starting with a slash, like /events/.',
      },
    ],
  }
}
