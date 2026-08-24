// Maps a Planning Center Calendar JSON:API body ({ data, included }) to our
// CalendarEvent[]. Shape translation only — capturing the payload is
// scripts/capture-events.mjs's job. Nothing here cares where the bytes came
// from, which is what keeps the source swappable without touching the pages.
//
// Rows are EventInstances; the parent Event (relationships.event) carries the
// title, summary, registration URL and public visibility. `location` is a plain
// string on the instance, and tags hang off the instance too.
//
// THE VISIBILITY CHECK BELOW IS THE AUTHORITY, not a second line of defence.
// Planning Center's API serves the *internal* calendar — 680 of the church's
// 874 events are staff meetings, room blockouts and outside-hirer bookings. The
// `where[event][visible_in_church_center]` query filter is silently ignored
// unless `include=event` is also present (it returns 200 and the full,
// unfiltered set), so nothing upstream of here can be trusted to have applied
// it. Anything whose parent Event is missing or not explicitly public is
// dropped.

import type { CalendarEvent } from '../types'
import { resolveCategory } from '../logic'
import { stripHtml, truncate } from '../text'

type JsonApiResource = {
  type: string
  id: string
  attributes?: Record<string, any>
  relationships?: Record<string, { data?: { type: string; id: string } | { type: string; id: string }[] | null }>
}

/** Last-resort link target when an instance carries no Church Center URL. */
const CALENDAR_URL = 'https://plcc.churchcenter.com/calendar'

/** Instances Planning Center marks as anything other than a real event. */
const DROPPED_KINDS = new Set(['blockout'])

export function mapPcoBody(body: any): CalendarEvent[] {
  const included = new Map<string, JsonApiResource>()
  for (const r of (body.included ?? []) as JsonApiResource[]) included.set(`${r.type}:${r.id}`, r)

  const events: CalendarEvent[] = []
  for (const inst of (body.data ?? []) as JsonApiResource[]) {
    const a = inst.attributes ?? {}
    const rel = inst.relationships ?? {}

    // Fail closed: no resolvable parent means no way to check visibility.
    const parentRef = rel.event?.data as { type: string; id: string } | undefined
    const parent = parentRef ? included.get(`Event:${parentRef.id}`) : undefined
    if (!parent?.attributes) continue
    const p = parent.attributes
    if (p.visible_in_church_center !== true) continue

    // `kind` is an opt-in attribute — present only when the capture names it in
    // fields[EventInstance]. Absent means "not a blockout", so only an explicit
    // dropped kind excludes the row.
    if (a.kind && DROPPED_KINDS.has(a.kind)) continue

    // The instance name overrides the series name when set (Planning Center
    // leaves it blank for most recurrences); both arrive with stray whitespace.
    const title: string = (a.name ?? '').trim() || (p.name ?? '').trim()
    if (!title || !(a.published_starts_at ?? a.starts_at)) continue

    // `summary` is purpose-written short copy and is set on most public events;
    // `description` is long-form HTML and needs stripping and truncating.
    const summary = (p.summary ?? '').trim() || truncate(stripHtml(p.description))

    const tagRefs = (rel.tags?.data as { type: string; id: string }[] | undefined) ?? []
    const tagNames = tagRefs.map((t) => included.get(`Tag:${t.id}`)?.attributes?.name).filter(Boolean) as string[]

    events.push({
      id: inst.id,
      // The resolved parent, not the reference: the guard above narrows it, and
      // the two ids are the same value.
      seriesId: parent.id,
      // Planning Center's own phrasing. `recurrence` is also captured but is too
      // coarse to use: it labels the fortnightly MomCo meetup "Weekly", and only
      // the compact description keeps the distinction.
      cadence: (a.compact_recurrence_description as string | undefined)?.trim() || undefined,
      title,
      // `starts_at` is the internal booking, which includes any setup/teardown
      // buffer the event carries; `published_starts_at` is the public time
      // Church Center advertises. Five of the church's recurring events reserve
      // an hour of setup, so mapping `starts_at` would put the playgroup and
      // the support group on the site an hour before they actually begin.
      start: a.published_starts_at ?? a.starts_at,
      end: a.published_ends_at ?? a.ends_at ?? undefined,
      allDay: Boolean(a.all_day_event),
      location: ((a.location as string) ?? '').trim() || undefined,
      summary,
      url: (p.registration_url as string) || (a.church_center_url as string) || CALENDAR_URL,
      category: resolveCategory(tagNames, title),
      source: 'pco',
    })
  }

  return events
}
