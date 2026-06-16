// Events provider: the single entry point pages use to get events.
//
// Selects an adapter by the EVENTS_SOURCE env var (default 'curated'), normalizes
// the result to an upcoming, sorted list, and falls back to the curated source on
// any failure so "What's Happening" is never empty. New sources (Church Center
// headless capture, public ICS feed, PCO API) plug in here behind the same
// interface — see docs/events-plan.md.

import { EVENTS_SOURCE } from 'astro:env/server'
import type { CalendarEvent, EventSource } from './types'
import { curatedEvents } from './adapters/curated'
import { churchCenterEvents } from './adapters/churchcenter'
import { normalizeUpcoming } from './logic'

async function loadFromSource(source: EventSource): Promise<CalendarEvent[]> {
  switch (source) {
    case 'churchcenter':
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
 * Default source: live Church Center data for production builds, curated for
 * local dev (fast, offline-friendly, and avoids hitting their API on every
 * reload). Override anytime with EVENTS_SOURCE.
 */
function defaultSource(): EventSource {
  return import.meta.env.PROD ? 'churchcenter' : 'curated'
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
