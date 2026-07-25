// The church's real-world facts, in one place.
//
// These are the "NAP" details (name / address / phone) that have to stay
// byte-identical wherever they appear — footer, contact page, and the
// schema.org graph — because search engines treat inconsistent NAP data across
// a site as a signal that the listing is unreliable. Keeping them here means a
// move or a number change is a one-line edit, not a grep.
//
// Deployment concerns (origin, base path, indexability) live in ./site.ts;
// this file is only about the organisation itself.

/**
 * The two brand colours that have to exist outside CSS.
 *
 * `<meta name="theme-color">` and the web manifest can't read a custom
 * property, so these values were hard-coded in two files and drifted out of
 * anyone's view. They must stay in step with --color-moss and --color-stone in
 * src/styles/tokens.css; there is no mechanism that enforces it, so the comment
 * is the mechanism.
 */
export const brand = {
  /** = --color-moss */
  theme: '#6a9529',
  /** = --color-stone */
  background: '#f2eee6',
} as const

export const church = {
  name: 'Pine Lake Covenant Church',
  /** Used where the full name is too long for the line — e.g. schema alternateName. */
  shortName: 'Pine Lake',
  description: 'A church in Sammamish, discovering life with Jesus together.',
  email: 'office@plcc.org',
  telephone: '+1-425-392-8636',
  /** As dialled/displayed locally. */
  telephoneDisplay: '(425) 392-8636',
  address: {
    street: '1715 228th Ave SE',
    locality: 'Sammamish',
    region: 'WA',
    postalCode: '98075',
    country: 'US',
  },
  /** Single line, for the footer and any prose that needs the whole address. */
  addressLine: '1715 228th Ave SE, Sammamish, WA 98075',
  /** Apple Maps short link — the canonical "get directions" target. */
  mapUrl: 'https://maps.apple/p/1EFyth--T~mePq',
  /** Approximate; used for the schema.org geo hint only. */
  geo: { latitude: 47.5852, longitude: -122.0405 },
  social: {
    instagram: 'https://www.instagram.com/pinelakecov/',
    youtube: 'https://www.youtube.com/@PineLkCovChurch',
  },
  /**
   * The weekly gathering. `durationMinutes` matches the "about 75 minutes"
   * promise on /visit/ — if the service length changes, change it in both
   * places (the copy is deliberately prose, not generated from this).
   */
  service: {
    day: 'Sunday',
    /** 24-hour, church-local time. */
    opens: '10:00',
    durationMinutes: 75,
  },
} as const

/** Service end time, derived so it can't drift from `opens` + `durationMinutes`. */
export function serviceCloses(): string {
  const [h, m] = church.service.opens.split(':').map(Number)
  const total = h * 60 + m + church.service.durationMinutes
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
