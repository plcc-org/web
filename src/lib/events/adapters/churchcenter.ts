// Church Center adapter — reads the church's PUBLIC calendar via the same
// JSON:API the Church Center web app uses. No API key and no headless browser:
// the public calendar is served with a short-lived, public "organization read
// token" that we obtain at build time with a three-step handshake:
//
//   1. GET  https://plcc.churchcenter.com/calendar   → session cookie + CSRF meta
//   2. POST https://plcc.churchcenter.com/sessions/tokens  (cookie + CSRF)
//        → { data: { attributes: { token: "ort_…", expires_at } } }
//   3. GET  https://api.churchcenter.com/calendar/v2/events  (Bearer ort_…)
//
// This is a stopgap until either a public iCal feed URL or an official Planning
// Center API token is available (see docs/events-plan.md); both would plug in as
// sibling adapters behind the same interface. If anything here fails, the
// provider falls back to the curated source, so the page is never empty.

import type { CalendarEvent, EventCategory, EventTag } from '../types'

const ORIGIN = 'https://plcc.churchcenter.com'
const API = 'https://api.churchcenter.com/calendar/v2/events'
const API_VERSION = '2020-06-16'
const USER_AGENT = 'Mozilla/5.0 (compatible; plcc-web/1.0; +https://plcc.org)'

/** How far ahead to pull events. */
const WINDOW_DAYS = 56

// Third-party facility rentals and the like that shouldn't read as PLCC
// programs on "What's Happening". Curation list — adjust as needed.
const EXCLUDE_TITLE = /pedalheads/i

function isoUtc(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, '.000Z')
}

async function getReadToken(): Promise<string> {
  const pageRes = await fetch(`${ORIGIN}/calendar`, {
    headers: { 'user-agent': USER_AGENT, accept: 'text/html' },
  })
  if (!pageRes.ok) throw new Error(`calendar page ${pageRes.status}`)
  const html = await pageRes.text()

  const csrf = html.match(/<meta name="csrf-token" content="([^"]+)"/)?.[1]
  if (!csrf) throw new Error('csrf token not found on calendar page')

  const setCookies = pageRes.headers.getSetCookie?.() ?? []
  const cookie = setCookies.map((c) => c.split(';')[0]).join('; ')
  if (!cookie) throw new Error('no session cookie from calendar page')

  const tokenRes = await fetch(`${ORIGIN}/sessions/tokens`, {
    method: 'POST',
    headers: {
      'user-agent': USER_AGENT,
      accept: 'application/json',
      referer: `${ORIGIN}/calendar`,
      'x-csrf-token': csrf,
      cookie,
    },
  })
  if (!tokenRes.ok) throw new Error(`sessions/tokens ${tokenRes.status}`)
  const token = (await tokenRes.json())?.data?.attributes?.token
  if (typeof token !== 'string' || !token.startsWith('ort_')) throw new Error('read token missing in response')
  return token
}

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

function mapCategory(catNames: string[], title: string): EventCategory {
  const hay = `${catNames.join(' ')} ${title}`.toLowerCase()
  if (/youth|club 45|confirmation|middle school|high school/.test(hay)) return 'Youth'
  if (/support group|grief|alzheimer|dementia|recovery|care\b/.test(hay)) return 'Groups'
  if (/serve|serving|volunteer|food bank|mission|blood drive|packaging/.test(hay)) return 'Serve'
  if (/kid|child|family|families|playgroup|momco|mom community|sports camp|vbs|nursery/.test(hay)) return 'Families'
  return 'Everyone'
}

export async function churchCenterEvents(): Promise<CalendarEvent[]> {
  const token = await getReadToken()

  const now = new Date()
  const windowStart = isoUtc(new Date(now.getFullYear(), now.getMonth(), now.getDate()))
  const windowEnd = isoUtc(new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000))

  // Brackets are intentionally left literal to match the API's filter syntax.
  const query = [
    'include=location,category_tags,event_registration_url',
    'fields[Event]=name,description,starts_at,ends_at,featured,all_day_event,show_page_path,recurring,location,category_tags,event_registration_url',
    'per_page=100',
    `where[starts_at][lte]=${windowEnd}`,
    `where[ends_at][gte]=${windowStart}`,
    'order=starts_at',
  ].join('&')

  const res = await fetch(`${API}?${query}`, {
    headers: {
      'user-agent': USER_AGENT,
      accept: 'application/json',
      'x-pco-api-version': API_VERSION,
      authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) throw new Error(`calendar/v2/events ${res.status}`)
  const body = await res.json()

  const included = new Map<string, JsonApiResource>()
  for (const r of (body.included ?? []) as JsonApiResource[]) included.set(`${r.type}:${r.id}`, r)
  const resolve = (ref?: { type: string; id: string } | null) => (ref ? included.get(`${ref.type}:${ref.id}`) : undefined)

  const events: CalendarEvent[] = []
  for (const ev of (body.data ?? []) as JsonApiResource[]) {
    const a = ev.attributes ?? {}
    const title: string = (a.name ?? '').trim()
    if (!title || !a.starts_at) continue
    if (EXCLUDE_TITLE.test(title)) continue

    const rel = ev.relationships ?? {}
    const location = resolve(rel.location?.data as any)?.attributes
    const catRefs = (rel.category_tags?.data as { type: string; id: string }[] | undefined) ?? []
    const catNames = catRefs.map((d) => resolve(d)?.attributes?.name).filter(Boolean) as string[]
    const regUrl = resolve(rel.event_registration_url?.data as any)?.attributes?.url as string | undefined

    const tags: EventTag[] = []
    if (a.recurring) tags.push('Weekly')

    events.push({
      id: ev.id,
      title,
      start: a.starts_at,
      end: a.ends_at ?? undefined,
      allDay: Boolean(a.all_day_event),
      location: (location?.name as string) ?? undefined,
      summary: stripHtml(a.description).slice(0, 180),
      url: regUrl ?? `${ORIGIN}${a.show_page_path ?? '/calendar'}`,
      category: mapCategory(catNames, title),
      tags: tags.length ? tags : undefined,
      featured: Boolean(a.featured),
      source: 'churchcenter',
    })
  }

  return events
}
