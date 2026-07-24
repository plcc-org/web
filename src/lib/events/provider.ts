// Events provider: the single entry point pages use to get events.
//
// Selects an adapter by the EVENTS_SOURCE env var (default 'curated'), normalizes
// the result to an upcoming, sorted list, and falls back to the curated source on
// any failure so "What's On" is never empty. New sources (Church Center
// headless capture, public ICS feed, PCO API) plug in here behind the same
// interface — see docs/events-plan.md.

import { EVENTS_SOURCE } from 'astro:env/server'
import type { CalendarEvent, EventSource } from './types'
import { curatedEvents } from './adapters/curated'
import { churchCenterEvents } from './adapters/churchcenter'
import { snapshotEvents } from './adapters/snapshot'
import { normalizeUpcoming } from './logic'

async function loadFromSource(source: EventSource): Promise<CalendarEvent[]> {
  switch (source) {
    case 'snapshot':
      // Church Center data captured daily by a headless browser (see snapshot.ts).
      return snapshotEvents()
    case 'churchcenter':
      // Live build-time handshake — dead since Church Center went client-rendered;
      // kept for reference. Use 'snapshot' instead.
      return churchCenterEvents()
    case 'ics':
    case 'pco':
      // Not implemented yet; the provider falls back to curated.
      throw new Error(`events source "${source}" is not implemented yet`)
    case 'curated':
    default:
      return curatedEvents()
  }
}

/**
 * Default source: the daily Church Center snapshot for production builds (see
 * snapshot.ts), curated for local dev (fast, offline-friendly, and no snapshot
 * needed in the working copy). Override anytime with EVENTS_SOURCE.
 */
function defaultSource(): EventSource {
  return import.meta.env.PROD ? 'snapshot' : 'curated'
}

// Memoized for the lifetime of the build process so the multiple "What's
// Happening" pages (Everyone + one per category) share a single live fetch.
let cached: Promise<CalendarEvent[]> | null = null

export function getUpcomingEvents(): Promise<CalendarEvent[]> {
  if (!cached) cached = loadUpcomingEvents()
  return cached
}

async function loadUpcomingEvents(): Promise<CalendarEvent[]> {
  const source = EVENTS_SOURCE ?? defaultSource()

  let raw: CalendarEvent[]
  try {
    raw = await loadFromSource(source)
    if (raw.length === 0 && source !== 'curated') {
      throw new Error(`events source "${source}" returned no events`)
    }
  } catch (err) {
    console.warn(`[events] "${source}" unavailable — using curated fallback:`, err instanceof Error ? err.message : err)
    raw = await curatedEvents()
  }

  return normalizeUpcoming(raw)
}
