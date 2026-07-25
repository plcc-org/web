// Maps a Church Center Calendar JSON:API body ({ data, included }) to our
// CalendarEvent[]. This is the *shape* translation only — fetching is the
// snapshot adapter's job (scripts/scrape-events.mjs captures the payload with a
// headless browser, since Church Center went client-rendered).
//
// Kept separate from the adapter that supplies the payload: the shape is
// Church Center's, but nothing here cares where the bytes came from. A
// Planning Center API adapter would plug in as a sibling and reuse this
// unchanged.

import type { CalendarEvent, EventSource } from '../types'
import { mapCategory } from '../logic'

const ORIGIN = 'https://plcc.churchcenter.com'

/** Longest summary we'll show on a card, in characters. */
const SUMMARY_MAX = 180

// Third-party facility rentals and the like that shouldn't read as PLCC
// programs on "What's On". Curation list — adjust as needed.
const EXCLUDE_TITLE = /pedalheads/i

type JsonApiResource = {
  type: string
  id: string
  attributes?: Record<string, any>
  relationships?: Record<string, { data?: { type: string; id: string } | { type: string; id: string }[] | null }>
}

function stripHtml(html: string | undefined | null): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Trim to length on a word boundary, with an ellipsis.
 *
 * Church Center descriptions are written for Church Center, so they routinely
 * overrun the card. A plain `.slice()` cuts mid-word and gives the reader no
 * signal that anything is missing.
 */
function truncate(text: string, max = SUMMARY_MAX): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  // Only back up to a word boundary if one is reasonably close to the limit;
  // otherwise (a single very long token) take the hard cut.
  const body = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut
  return `${body.replace(/[\s,;:.!?-]+$/, '')}…`
}

export function mapChurchCenterBody(body: any, source: EventSource): CalendarEvent[] {
  const included = new Map<string, JsonApiResource>()
  for (const r of (body.included ?? []) as JsonApiResource[]) included.set(`${r.type}:${r.id}`, r)
  const resolve = (ref?: { type: string; id: string } | null) =>
    ref ? included.get(`${ref.type}:${ref.id}`) : undefined

  const events: CalendarEvent[] = []
  for (const ev of (body.data ?? []) as JsonApiResource[]) {
    const a = ev.attributes ?? {}
    // Church Center titles routinely carry stray leading/trailing whitespace
    // (" High School Mission Trip ", "Blood Drive  "). Untrimmed it reaches
    // both the page and the event JSON-LD.
    const title: string = (a.name ?? '').trim()
    if (!title || !a.starts_at) continue
    if (EXCLUDE_TITLE.test(title)) continue

    const rel = ev.relationships ?? {}
    const location = resolve(rel.location?.data as any)?.attributes
    const catRefs = (rel.category_tags?.data as { type: string; id: string }[] | undefined) ?? []
    const catNames = catRefs.map((d) => resolve(d)?.attributes?.name).filter(Boolean) as string[]
    const regUrl = resolve(rel.event_registration_url?.data as any)?.attributes?.url as string | undefined

    events.push({
      id: ev.id,
      title,
      start: a.starts_at,
      end: a.ends_at ?? undefined,
      allDay: Boolean(a.all_day_event),
      location: ((location?.name as string) ?? '').trim() || undefined,
      summary: truncate(stripHtml(a.description)),
      url: regUrl ?? `${ORIGIN}${a.show_page_path ?? '/calendar'}`,
      category: mapCategory(catNames, title),
      featured: Boolean(a.featured),
      source,
    })
  }

  return events
}

/** Exported for unit tests only. */
export const __test = { truncate, stripHtml }
