// Events provider: the single entry point pages use to get events.
//
// Selects an adapter by the EVENTS_SOURCE env var, normalizes the result to an
// upcoming, sorted list, and falls back to the curated source on any failure so
// "What's On" is never empty. New sources (a public ICS feed, say) plug in here
// behind the same interface.

import { EVENTS_SOURCE } from 'astro:env/server'
import type { CalendarEvent, EventSource } from './types'
import { curatedEvents } from './adapters/curated'
import { pcoEvents } from './adapters/pco'
import { normalizeUpcoming } from './logic'

async function loadFromSource(source: EventSource): Promise<CalendarEvent[]> {
  switch (source) {
    case 'pco':
      // Planning Center Calendar data captured daily by CI (see pco.ts).
      return pcoEvents()
    case 'ics':
      // Not implemented; the provider falls back to curated.
      throw new Error(`events source "${source}" is not implemented yet`)
    case 'curated':
    default:
      return curatedEvents()
  }
}

/**
 * Default source: the daily Planning Center capture for production builds (see
 * pco.ts), curated for local dev (fast, offline-friendly, and no fresh capture
 * needed in the working copy). Override anytime with EVENTS_SOURCE.
 */
function defaultSource(): EventSource {
  return import.meta.env.PROD ? 'pco' : 'curated'
}

// Memoized for the lifetime of the build process so every page that renders
// events shares a single load.
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
