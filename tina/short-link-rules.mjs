// @ts-check
// The rules a single short link has to satisfy, shared by the two places that check them.
//
// scripts/generate-redirects.mjs is still the authority: it alone sees every entry at
// once, so duplicate addresses and the review-date warnings stay there. What lives here
// is everything decidable from one entry, so tina/config.ts can run the same checks in
// the form. Without that an editor's only feedback is a build they never see failing.
//
// Messages are written for the editor and name their own field, so the build script can
// print them behind a `path/to/file.yaml: ` prefix and they still read correctly.
//
// Plain .mjs for the same reason templates.mjs is: importable from a Node script and
// from the CMS config without a build step.

/**
 * A shortcut is temporary on purpose; `moved` is the one-way door. The status codes are
 * the build script's business, but the set of valid kinds is a per-entry rule.
 */
export const STATUS = { shortcut: 302, moved: 301 }

/** Reserved because a short link that shadows one of these would hide real content. */
export const RESERVED = new Set([
  '_astro',
  '_headers',
  '_redirects',
  'admin',
  'api',
  'robots.txt',
  'sitemap-index.xml',
  'tina-island',
])

/** The comparable form of an old address: lowercased, no leading or trailing slashes. */
/** @type {(from: string) => string} */
export const toPath = (from) => from.toLowerCase().replace(/^\/+/, '').replace(/\/+$/, '')

/**
 * The old address. Explicit rather than taken from the filename because cutover
 * redirects carry several segments ("/connect/about/leadership-team/").
 */
/** @type {(from: unknown) => string | undefined} */
export function checkFrom(from) {
  if (typeof from !== 'string' || !from.startsWith('/')) {
    return 'The old address must start with a slash — "/camp", not "camp".'
  }
  const path = toPath(from)
  if (!/^[a-z0-9][a-z0-9\-/]*$/.test(path)) {
    return `"${from}" can only use lowercase letters, numbers, hyphens and slashes, and must start with a letter or number.`
  }
  if (RESERVED.has(path.split('/')[0])) {
    return `"/${path}" starts with "${path.split('/')[0]}", which the site itself uses — a link here would hide real content.`
  }
  return undefined
}

/** Where the link sends people. Not checked for a link marked "gone for good". */
/** @type {(destination: unknown, kind?: string) => string | undefined} */
export function checkDestination(destination, kind = 'shortcut') {
  if (kind === 'gone') return undefined
  const external = typeof destination === 'string' && /^https?:\/\//i.test(destination)
  if (typeof destination !== 'string' || !(external || destination.startsWith('/'))) {
    return '"Sends people to" needs a full https:// address, or a page on this site written with a leading slash — "/visit/".'
  }
  if (!(kind in STATUS)) {
    return `"What kind of link is this?" must be one of ${[...Object.keys(STATUS), 'gone'].join(', ')}.`
  }
  return undefined
}

/**
 * The review date, or its absence.
 *
 * Tolerant of both shapes the field arrives in: `2026-09-30` from a hand-written YAML
 * file, and a full ISO timestamp from the CMS's datetime picker. Appending the time to
 * the second of those would produce an invalid date, and an invalid date here reads as
 * "no date at all".
 */
/** @type {(expires: unknown) => Date | null} */
export function parseReviewDate(expires) {
  if (typeof expires !== 'string' || !expires) return null
  const date = new Date(expires.includes('T') ? expires : `${expires}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * One or the other, never both. A permanent link carrying a date is two answers to the
 * same question, and whichever a later reader trusts, the other was misleading. And a
 * link with neither is how the list grows a tail nobody owns.
 */
/** @type {(permanent: unknown, expires: unknown) => string | undefined} */
export function checkReview(permanent, expires) {
  if (permanent && expires) {
    return 'This link is marked as never needing review, so it should not also carry a "Review by" date. Clear one or the other.'
  }
  if (!permanent && !parseReviewDate(expires)) {
    return 'This link needs a "Review by" date, or tick "This link never needs reviewing" if it will never need one.'
  }
  return undefined
}
