// Events provider: the single entry point pages use to get events.
//
// Selects an adapter by the EVENTS_SOURCE env var (default 'curated'), normalizes
// the result to an upcoming, sorted list, and falls back to the curated source on
// any failure so "What's Happening" is never empty. New sources (Church Center
// headless capture, public ICS feed, PCO API) plug in here behind the same
// interface — see docs/events-plan.md.

import type { CalendarEvent, EventSource } from './types'
import { curatedEvents } from './adapters/curated'
import { churchCenterEvents } from './adapters/churchcenter'

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
  return process.env.NODE_ENV === 'production' ? 'churchcenter' : 'curated'
}

/** Build-time "now" as the start of today (used to drop past events). */
function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function normalizeUpcoming(events: CalendarEvent[]): CalendarEvent[] {
  const floor = startOfToday()
  const seen = new Set<string>()
  return events
    .filter((e) => new Date(e.start) >= floor)
    .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}

export async function getUpcomingEvents(): Promise<CalendarEvent[]> {
  const source = (process.env.EVENTS_SOURCE as EventSource | undefined) ?? defaultSource()

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
