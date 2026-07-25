// Capture the church's public Church Center calendar into a committed snapshot.
//
// Church Center moved the calendar to a client-rendered SPA, so a build-time
// CSRF-scrape can no longer obtain the public "organization read token" (the
// adapter that did that has been removed). Here we let their own SPA do the
// token handshake in a real browser, intercept the Bearer token off the request
// it makes to the calendar API, then fetch the same JSON:API it uses
// (same fields/includes/window) and write the raw body to
// src/content/events-snapshot.json. The `snapshot` events source maps it at build
// time — see src/lib/events/adapters/snapshot.ts.
//
// This is a STOPGAP for the dev site until an official Planning Center Calendar
// API key is available (the `pco` source). Run in CI daily (see
// .github/workflows/scrape-events.yml) or locally: `npm run scrape:events`.

import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ORIGIN = 'https://plcc.churchcenter.com'
const API = 'https://api.churchcenter.com/calendar/v2/events'
const API_VERSION = '2020-06-16'
const WINDOW_DAYS = 56
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
const OUT = fileURLToPath(new URL('../src/content/events-snapshot.json', import.meta.url))

function isoUtc(d) {
  return d.toISOString().replace(/\.\d{3}Z$/, '.000Z')
}

// Same query the live adapter used, so the snapshot body is shape-identical.
function buildQuery() {
  const now = new Date()
  const windowStart = isoUtc(new Date(now.getFullYear(), now.getMonth(), now.getDate()))
  const windowEnd = isoUtc(new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000))
  return [
    'include=location,category_tags,event_registration_url',
    'fields[Event]=name,description,starts_at,ends_at,featured,all_day_event,show_page_path,recurring,location,category_tags,event_registration_url',
    'per_page=100',
    `where[starts_at][lte]=${windowEnd}`,
    `where[ends_at][gte]=${windowStart}`,
    'order=starts_at',
  ].join('&')
}

// Drive the SPA just far enough to capture the Bearer read token it sends to the
// calendar API, then throw the browser away.
async function captureReadToken() {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ userAgent: USER_AGENT })
    const tokenReq = page.waitForRequest(
      (req) =>
        req.url().includes('api.churchcenter.com/calendar') &&
        (req.headers()['authorization'] || '').startsWith('Bearer ort_'),
      { timeout: 60_000 }
    )
    await page.goto(`${ORIGIN}/calendar`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const req = await tokenReq
    return req.headers()['authorization'].slice('Bearer '.length)
  } finally {
    await browser.close()
  }
}

const token = await captureReadToken()
if (!token || !token.startsWith('ort_')) throw new Error('did not capture a read token from the calendar SPA')

const res = await fetch(`${API}?${buildQuery()}`, {
  headers: {
    'user-agent': USER_AGENT,
    accept: 'application/json',
    'x-pco-api-version': API_VERSION,
    authorization: `Bearer ${token}`,
  },
})
if (!res.ok) throw new Error(`calendar/v2/events ${res.status}`)
const body = await res.json()

const count = Array.isArray(body?.data) ? body.data.length : 0
if (count === 0) throw new Error('API returned zero events — refusing to overwrite the snapshot with an empty result')

// Wrap the API body with a capture timestamp (the snapshot adapter warns if it
// goes stale). `data`/`included` stay top-level so the mapper reads them directly.
const snapshot = { capturedAt: new Date().toISOString(), ...body }
writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + '\n')
console.log(`Wrote ${count} events to ${OUT}`)
