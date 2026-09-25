import { describe, it, expect } from 'vitest'
import { captureQuery, fetchAllPages, captureProblem } from '../scripts/pco-capture.mjs'

const params = (query: string) => query.split('&')

describe('captureQuery', () => {
  const query = captureQuery(new Date('2026-09-24T07:00:00Z'), new Date('2026-11-19T07:00:00Z'))

  it('never sends the visibility filter without include=event', () => {
    // Without include=event, Planning Center ignores the filter and returns the
    // whole internal calendar. The two only work as a pair.
    expect(params(query)).toContain('where[event][visible_in_church_center]=true')
    const include = params(query).find((p) => p.startsWith('include='))
    expect(include?.slice('include='.length).split(',')).toContain('event')
  })

  it('asks for the fields the mapper reads, including the opt-in ones', () => {
    const instance = params(query).find((p) => p.startsWith('fields[EventInstance]='))!
    for (const field of ['kind', 'published_starts_at', 'published_ends_at', 'event', 'tags']) {
      expect(instance.split('=')[1].split(',')).toContain(field)
    }
    const event = params(query).find((p) => p.startsWith('fields[Event]='))!
    for (const field of ['summary', 'visible_in_church_center']) {
      expect(event.split('=')[1].split(',')).toContain(field)
    }
  })

  it('bounds the window with second-precision UTC instants', () => {
    expect(params(query)).toContain('where[starts_at][gte]=2026-09-24T07:00:00Z')
    expect(params(query)).toContain('where[starts_at][lte]=2026-11-19T07:00:00Z')
  })
})

const event = (id: string, visible = true) => ({ type: 'Event', id, attributes: { visible_in_church_center: visible } })
const instance = (id: string, eventId: string) => ({
  type: 'EventInstance',
  id,
  relationships: { event: { data: { type: 'Event', id: eventId } } },
})

describe('fetchAllPages', () => {
  it('follows links.next and merges every page', async () => {
    const pages: Record<string, unknown> = {
      p1: {
        links: { self: 'p1', next: 'p2' },
        data: [instance('1', 'a'), instance('2', 'b')],
        included: [event('a'), event('b')],
        meta: { total_count: 3 },
      },
      p2: { links: { self: 'p2' }, data: [instance('3', 'a')], included: [event('a')] },
    }
    const requested: string[] = []
    const body = await fetchAllPages('p1', async (url: string) => {
      requested.push(url)
      return pages[url]
    })
    expect(requested).toEqual(['p1', 'p2'])
    expect(body.data.map((d: { id: string }) => d.id)).toEqual(['1', '2', '3'])
    // An Event with instances on both pages is kept once.
    expect(body.included.map((r: { id: string }) => r.id)).toEqual(['a', 'b'])
    // The merged body describes the whole result, not a page that points onward.
    expect(body.links).toEqual({ self: 'p1' })
    expect(body.meta).toEqual({ total_count: 3 })
    expect(captureProblem(body)).toBeUndefined()
  })

  it('leaves a single page unchanged', async () => {
    const page = { links: { self: 'p1' }, data: [instance('1', 'a')], included: [event('a')], meta: { total_count: 1 } }
    expect(await fetchAllPages('p1', async () => page)).toEqual(page)
  })

  it('refuses a pagination loop', async () => {
    const loop = { links: { self: 'p1', next: 'p1' }, data: [] }
    await expect(fetchAllPages('p1', async () => loop)).rejects.toThrow(/loops/)
  })
})

describe('captureProblem', () => {
  it('rejects an empty result', () => {
    expect(captureProblem({ data: [] })).toMatch(/zero events/)
  })

  it('rejects a result shorter than the reported total', () => {
    // What a single-page fetch would have written once the window passed 100.
    expect(captureProblem({ data: [instance('1', 'a')], included: [event('a')], meta: { total_count: 101 } })).toMatch(
      /partial/
    )
  })

  it('rejects rows whose parent Event is not public, or is missing', () => {
    expect(captureProblem({ data: [instance('1', 'a')], included: [event('a', false)] })).toMatch(/not public/)
    expect(captureProblem({ data: [instance('1', 'a')], included: [] })).toMatch(/not public/)
  })
})
