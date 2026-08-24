// Capture the church's public calendar from the Planning Center API into a
// committed JSON file, read at build time by the `pco` events source.
//
// Runs out-of-band (daily in CI, see .github/workflows/capture-events.yml)
// rather than during the site build: the Cloudflare adapter prerenders in
// workerd, which has no `node:fs`, so src/content/events-pco.json is imported
// statically and inlined by Vite. Committing it also keeps builds hermetic and
// makes each day's calendar change a reviewable diff.
//
// Local run: `npm run capture:events` with PCO_APP_ID / PCO_SECRET in a
// gitignored .env, or exported in the environment.

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const BASE = 'https://api.planningcenteronline.com/calendar/v2'
// Pinned, not defaulted: 2020-06-16 serves Event `details` with no `summary`
// field at all, which is the copy the cards render. "Latest" drifts.
const API_VERSION = '2026-06-22'
const USER_AGENT = 'plcc-web (+https://plcc.org)'
const WINDOW_DAYS = 56
const OUT = fileURLToPath(new URL('../src/content/events-pco.json', import.meta.url))

const { PCO_APP_ID, PCO_SECRET } = process.env
if (!PCO_APP_ID || !PCO_SECRET) {
  throw new Error('PCO_APP_ID and PCO_SECRET must be set (see the usage note at the top of this file)')
}

/**
 * Midnight today in church time, as an instant.
 *
 * CI runs in UTC and the church is in Pacific, so the window boundary is
 * resolved through Intl rather than the host clock — otherwise the job would
 * start the window on the wrong day for the 7-8 hours either side of midnight.
 */
function pacificStartOfToday() {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())
  // Resolve the real offset for that date rather than assuming PST or PDT.
  const offset =
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', timeZoneName: 'longOffset' })
      .formatToParts(new Date(`${ymd}T12:00:00Z`))
      .find((p) => p.type === 'timeZoneName')
      ?.value.replace('GMT', '') || '-08:00'
  return new Date(`${ymd}T00:00:00${offset}`)
}

const iso = (d) => d.toISOString().replace(/\.\d{3}Z$/, 'Z')
const windowStart = pacificStartOfToday()
const windowEnd = new Date(windowStart.getTime() + WINDOW_DAYS * 86_400_000)

// `kind` is opt-in: Planning Center omits it unless fields[EventInstance] names
// it, and the mapper drops blockout rows on it.
const QUERY = [
  `where[starts_at][gte]=${iso(windowStart)}`,
  `where[starts_at][lte]=${iso(windowEnd)}`,
  // WARNING: this filter is silently ignored unless `include=event` is also
  // present — without it the API returns 200 and the ENTIRE internal calendar,
  // staff meetings and outside-hirer bookings included. Never send one without
  // the other. src/lib/events/adapters/pco-map.ts re-checks every row.
  'where[event][visible_in_church_center]=true',
  'include=event,tags',
  'fields[EventInstance]=name,starts_at,ends_at,published_starts_at,published_ends_at,all_day_event,location,church_center_url,kind,recurrence,compact_recurrence_description,event,tags',
  'fields[Event]=name,summary,description,registration_url,visible_in_church_center,image_url,tags',
  'order=starts_at',
  'per_page=100',
].join('&')

const res = await fetch(`${BASE}/event_instances?${QUERY}`, {
  headers: {
    authorization: `Basic ${Buffer.from(`${PCO_APP_ID}:${PCO_SECRET}`).toString('base64')}`,
    accept: 'application/json',
    'user-agent': USER_AGENT,
    'x-pco-api-version': API_VERSION,
  },
})
if (!res.ok) throw new Error(`calendar/v2/event_instances ${res.status}: ${(await res.text()).slice(0, 400)}`)
const body = await res.json()

const count = Array.isArray(body?.data) ? body.data.length : 0
if (count === 0) {
  // A transient failure that returns 200 with no data would otherwise silently
  // empty the calendar on the next deploy.
  throw new Error('API returned zero events — refusing to overwrite the capture with an empty result')
}

// Belt and braces: prove the visibility filter actually applied before writing.
// If `include=event` were ever dropped from the query the count would balloon
// and every row would arrive unverifiable; fail loudly instead of shipping it.
const parents = new Map((body.included ?? []).filter((r) => r.type === 'Event').map((r) => [r.id, r]))
const leaked = body.data.filter((inst) => {
  const parent = parents.get(inst.relationships?.event?.data?.id)
  return parent?.attributes?.visible_in_church_center !== true
})
if (leaked.length) {
  throw new Error(
    `${leaked.length}/${count} instances are not public (or have no resolvable parent Event) — ` +
      'the visibility filter did not apply. Refusing to write.'
  )
}

const capture = { capturedAt: new Date().toISOString(), ...body }
writeFileSync(OUT, JSON.stringify(capture, null, 2) + '\n')
console.log(`Wrote ${count} public event instances to ${OUT}`)
