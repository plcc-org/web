// Planning Center adapter — calendar data captured out-of-band by
// scripts/capture-events.mjs (run daily in CI) and committed to
// src/content/events-pco.json.
//
// The capture runs out-of-band rather than during the site build for the same
// reason the Church Center snapshot did: the Cloudflare adapter prerenders in
// workerd, which has no `node:fs`, so the JSON is imported *statically* and
// Vite inlines it into the bundle. Committing it also keeps the build hermetic
// (a Planning Center outage can't fail a deploy), keeps the API token in GitHub
// Actions rather than Cloudflare's build environment, and makes each day's
// calendar change a reviewable diff.

import capture from '../../../content/events-pco.json'
import type { CalendarEvent } from '../types'
import { mapPcoBody } from './pco-map'

export async function pcoEvents(): Promise<CalendarEvent[]> {
  const capturedAt = (capture as { capturedAt?: string })?.capturedAt
  if (capturedAt) {
    const ageDays = (Date.now() - new Date(capturedAt).getTime()) / 86_400_000
    // Not fatal — normalizeUpcoming still drops past events — but worth
    // surfacing if the daily capture has quietly stopped updating the file.
    if (ageDays > 3)
      console.warn(`[events] capture is ${ageDays.toFixed(1)} days old — is the capture workflow running?`)
  }

  return mapPcoBody(capture)
}
