// Snapshot adapter — Church Center calendar data captured out-of-band by a
// headless browser (scripts/scrape-events.mjs, run daily in CI) and committed to
// src/content/events-snapshot.json. This is the production default: Church Center
// moved its calendar to a client-rendered SPA, so a build-time fetch can no
// longer obtain the CSRF token it needs. The scraper lets the SPA obtain the
// token, then fetches the same JSON:API — so the snapshot has the shape
// churchcenter-map.ts already knows how to read.
//
// The snapshot is imported statically so Vite inlines it into the build: the
// Cloudflare adapter prerenders in workerd, which has no `node:fs`, so we can't
// read the file at runtime.
//
// STOPGAP: replace with the official Planning Center Calendar API (`pco` source)
// once an API key is available. See provider.ts.

import snapshot from '../../../content/events-snapshot.json'
import type { CalendarEvent } from '../types'
import { mapChurchCenterBody } from './churchcenter-map'

export async function snapshotEvents(): Promise<CalendarEvent[]> {
  const capturedAt = (snapshot as { capturedAt?: string })?.capturedAt
  if (capturedAt) {
    const ageDays = (Date.now() - new Date(capturedAt).getTime()) / 86_400_000
    // Not fatal — normalizeUpcoming still drops past events — but worth surfacing
    // if the daily scrape has quietly stopped updating the snapshot.
    if (ageDays > 3)
      console.warn(`[events] snapshot is ${ageDays.toFixed(1)} days old — is the scrape workflow running?`)
  }

  return mapChurchCenterBody(snapshot, 'snapshot')
}
