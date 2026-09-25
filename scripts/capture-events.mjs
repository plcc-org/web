// Capture the church's public calendar from the Planning Center API into a
// committed JSON file, read at build time by the `pco` events source.
//
// Runs out-of-band (daily in CI, see .github/workflows/capture-events.yml)
// rather than during the site build: the Cloudflare adapter prerenders in
// workerd, which has no `node:fs`, so src/data/events-pco.json is imported
// statically and inlined by Vite. Committing it also keeps builds hermetic and
// makes each day's calendar change a reviewable diff.
//
// Local run: `npm run capture:events` with PCO_APP_ID / PCO_SECRET in a
// gitignored .env, or exported in the environment.

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { captureProblem, captureQuery, fetchAllPages } from './pco-capture.mjs'

const BASE = 'https://api.planningcenteronline.com/calendar/v2'
// Pinned, not defaulted: 2020-06-16 serves Event `details` with no `summary`
// field at all, which is the copy the cards render. "Latest" drifts.
const API_VERSION = '2026-06-22'
const USER_AGENT = 'plcc-web (+https://plcc.org)'
const WINDOW_DAYS = 56
const OUT = fileURLToPath(new URL('../src/data/events-pco.json', import.meta.url))

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

const windowStart = pacificStartOfToday()
const windowEnd = new Date(windowStart.getTime() + WINDOW_DAYS * 86_400_000)

const getPage = async (url) => {
  const res = await fetch(url, {
    headers: {
      authorization: `Basic ${Buffer.from(`${PCO_APP_ID}:${PCO_SECRET}`).toString('base64')}`,
      accept: 'application/json',
      'user-agent': USER_AGENT,
      'x-pco-api-version': API_VERSION,
    },
  })
  if (!res.ok) throw new Error(`calendar/v2/event_instances ${res.status}: ${(await res.text()).slice(0, 400)}`)
  return res.json()
}

const body = await fetchAllPages(`${BASE}/event_instances?${captureQuery(windowStart, windowEnd)}`, getPage)
const problem = captureProblem(body)
if (problem) throw new Error(problem)

const capture = { capturedAt: new Date().toISOString(), ...body }
writeFileSync(OUT, JSON.stringify(capture, null, 2) + '\n')
console.log(`Wrote ${body.data.length} public event instances to ${OUT}`)
