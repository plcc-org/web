// The dependency-free half of scripts/capture-events.mjs: the query it sends, the
// paging it follows, and the visibility check it makes before writing. Split out
// so each can be tested without credentials (test/pco-capture.test.ts) — the
// script itself is all side effects.

// `kind` is opt-in: Planning Center omits it unless fields[EventInstance] names
// it, and the mapper drops blockout rows on it.
const INSTANCE_FIELDS =
  'name,starts_at,ends_at,published_starts_at,published_ends_at,all_day_event,location,church_center_url,kind,recurrence,compact_recurrence_description,event,tags'
const EVENT_FIELDS = 'name,summary,description,registration_url,visible_in_church_center,image_url,tags'

const iso = (d) => d.toISOString().replace(/\.\d{3}Z$/, 'Z')

/**
 * The event_instances query string for a window.
 * @param {Date} windowStart
 * @param {Date} windowEnd
 */
export function captureQuery(windowStart, windowEnd) {
  return [
    `where[starts_at][gte]=${iso(windowStart)}`,
    `where[starts_at][lte]=${iso(windowEnd)}`,
    // WARNING: this filter is silently ignored unless `include=event` is also
    // present — without it the API returns 200 and the ENTIRE internal calendar,
    // staff meetings and outside-hirer bookings included. Never send one without
    // the other. src/lib/events/adapters/pco-map.ts re-checks every row.
    'where[event][visible_in_church_center]=true',
    'include=event,tags',
    `fields[EventInstance]=${INSTANCE_FIELDS}`,
    `fields[Event]=${EVENT_FIELDS}`,
    'order=starts_at',
    'per_page=100',
  ].join('&')
}

/**
 * Every page of a JSON:API collection, merged into one body shaped like the first
 * page: `data` concatenated, `included` de-duplicated (an Event with instances on
 * two pages arrives on both). Follows `links.next` until there is none, so the
 * window can outgrow one page without silently losing its tail.
 *
 * @param {string} url the first page
 * @param {(url: string) => Promise<any>} getPage fetches and parses one page
 */
export async function fetchAllPages(url, getPage) {
  const first = await getPage(url)
  const data = [...(first?.data ?? [])]
  const included = new Map((first?.included ?? []).map((r) => [`${r.type}:${r.id}`, r]))
  let next = first?.links?.next
  const seen = new Set([url])
  while (next) {
    if (seen.has(next)) throw new Error(`pagination loops back to ${next}`)
    seen.add(next)
    const page = await getPage(next)
    data.push(...(page?.data ?? []))
    for (const r of page?.included ?? []) included.set(`${r.type}:${r.id}`, r)
    next = page?.links?.next
  }
  const merged = { ...first, data, included: [...included.values()] }
  if (first?.links) merged.links = { self: first.links.self }
  return merged
}

/**
 * Why a merged capture must not be written, or undefined when it's fine.
 * Checks the three failures that would otherwise ship without a symptom: an empty
 * result, a short one, and rows whose parent Event isn't public.
 */
export function captureProblem(body) {
  const count = Array.isArray(body?.data) ? body.data.length : 0
  // A transient failure that returns 200 with no data would otherwise silently
  // empty the calendar on the next deploy.
  if (count === 0) return 'API returned zero events — refusing to overwrite the capture with an empty result'

  const total = body?.meta?.total_count
  if (typeof total === 'number' && total !== count) {
    return `API reports ${total} instances but ${count} arrived — refusing to write a partial calendar`
  }

  // Belt and braces: prove the visibility filter actually applied before writing.
  // If `include=event` were ever dropped from the query the count would balloon
  // and every row would arrive unverifiable; fail loudly instead of shipping it.
  const parents = new Map((body.included ?? []).filter((r) => r.type === 'Event').map((r) => [r.id, r]))
  const leaked = body.data.filter((inst) => {
    const parent = parents.get(inst.relationships?.event?.data?.id)
    return parent?.attributes?.visible_in_church_center !== true
  })
  if (leaked.length) {
    return (
      `${leaked.length}/${count} instances are not public (or have no resolvable parent Event) — ` +
      'the visibility filter did not apply. Refusing to write.'
    )
  }
  return undefined
}
