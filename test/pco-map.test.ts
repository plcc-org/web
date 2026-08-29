import { describe, it, expect } from 'vitest'
import { mapPcoBody } from '../src/lib/events/adapters/pco-map'
import capture from '../src/data/events-pco.json'

/** Build a Planning Center-shaped body from a compact spec. */
function body(
  instances: Array<{
    id: string
    name?: string
    starts_at?: string
    ends_at?: string
    published_starts_at?: string
    published_ends_at?: string
    all_day_event?: boolean
    location?: string
    church_center_url?: string
    kind?: string
    cadence?: string
    event?: string
    tags?: string[]
  }>,
  events: Array<{
    id: string
    name?: string
    summary?: string
    description?: string
    registration_url?: string | null
    visible_in_church_center?: boolean
  }>,
  tags: Array<{ id: string; name: string }> = []
) {
  return {
    data: instances.map((i) => ({
      type: 'EventInstance',
      id: i.id,
      attributes: {
        name: i.name ?? null,
        starts_at: i.starts_at ?? '2026-09-01T17:00:00Z',
        ends_at: i.ends_at,
        published_starts_at: i.published_starts_at ?? null,
        published_ends_at: i.published_ends_at ?? null,
        all_day_event: i.all_day_event ?? false,
        location: i.location,
        church_center_url: i.church_center_url,
        ...(i.kind ? { kind: i.kind } : {}),
        ...(i.cadence ? { compact_recurrence_description: i.cadence } : {}),
      },
      relationships: {
        ...(i.event ? { event: { data: { type: 'Event', id: i.event } } } : {}),
        tags: { data: (i.tags ?? []).map((t) => ({ type: 'Tag', id: t })) },
      },
    })),
    included: [
      ...events.map((e) => ({
        type: 'Event',
        id: e.id,
        attributes: {
          name: e.name ?? 'Parent',
          summary: e.summary ?? '',
          description: e.description ?? '',
          registration_url: e.registration_url ?? null,
          visible_in_church_center: e.visible_in_church_center ?? true,
        },
      })),
      ...tags.map((t) => ({ type: 'Tag', id: t.id, attributes: { name: t.name } })),
    ],
  }
}

describe('mapPcoBody visibility — the authority, not a second line of defence', () => {
  it('drops instances whose parent Event is not public', () => {
    const out = mapPcoBody(
      body(
        [
          { id: '1', name: 'Public', event: 'e1' },
          { id: '2', name: 'Staff Meeting', event: 'e2' },
        ],
        [
          { id: 'e1', visible_in_church_center: true },
          { id: 'e2', visible_in_church_center: false },
        ]
      )
    )
    expect(out.map((e) => e.title)).toEqual(['Public'])
  })

  it('fails closed when the parent Event is missing from `included`', () => {
    // The query filter is silently ignored without include=event; if the
    // linkage is ever stripped, every row must drop rather than publish.
    const out = mapPcoBody(body([{ id: '1', name: 'Unverifiable', event: 'e-missing' }], []))
    expect(out).toEqual([])
  })

  it('fails closed when the instance carries no event relationship at all', () => {
    const out = mapPcoBody(body([{ id: '1', name: 'No parent' }], [{ id: 'e1' }]))
    expect(out).toEqual([])
  })

  it('treats a missing visibility flag as not public', () => {
    const raw = body([{ id: '1', name: 'Unknown', event: 'e1' }], [{ id: 'e1' }])
    delete (raw.included[0] as any).attributes.visible_in_church_center
    expect(mapPcoBody(raw)).toEqual([])
  })

  it('drops blockout instances', () => {
    const out = mapPcoBody(
      body(
        [
          { id: '1', name: 'Real', event: 'e1' },
          { id: '2', name: 'Room hold', event: 'e1', kind: 'blockout' },
        ],
        [{ id: 'e1' }]
      )
    )
    expect(out.map((e) => e.title)).toEqual(['Real'])
  })
})

describe('mapPcoBody field mapping', () => {
  it('prefers the instance name, falls back to the parent, and trims both', () => {
    const out = mapPcoBody(
      body(
        [
          { id: '1', name: '  Special Edition  ', event: 'e1' },
          { id: '2', event: 'e1' },
        ],
        [{ id: 'e1', name: '  Sunday Service  ' }]
      )
    )
    expect(out.map((e) => e.title)).toEqual(['Special Edition', 'Sunday Service'])
  })

  it('prefers summary over description, and strips + truncates description', () => {
    const out = mapPcoBody(
      body(
        [
          { id: '1', event: 'e1' },
          { id: '2', event: 'e2' },
        ],
        [
          { id: 'e1', summary: 'Short purpose-written copy.', description: '<p>Long HTML</p>' },
          { id: 'e2', summary: '', description: `<p>${'word '.repeat(80)}</p>` },
        ]
      )
    )
    expect(out[0].summary).toBe('Short purpose-written copy.')
    expect(out[1].summary).not.toContain('<p>')
    expect(out[1].summary.endsWith('…')).toBe(true)
    expect(out[1].summary.length).toBeLessThanOrEqual(181)
  })

  it('links to registration when present, else the Church Center instance URL', () => {
    const out = mapPcoBody(
      body(
        [
          { id: '1', event: 'e1', church_center_url: 'https://plcc.churchcenter.com/calendar/event/1' },
          { id: '2', event: 'e2', church_center_url: 'https://plcc.churchcenter.com/calendar/event/2' },
        ],
        [
          { id: 'e1', registration_url: 'https://plcc.churchcenter.com/registrations/events/3743770' },
          { id: 'e2', registration_url: null },
        ]
      )
    )
    expect(out[0].url).toBe('https://plcc.churchcenter.com/registrations/events/3743770')
    expect(out[1].url).toBe('https://plcc.churchcenter.com/calendar/event/2')
  })

  it('reads location from the instance attribute as a plain string', () => {
    const out = mapPcoBody(
      body([{ id: '1', event: 'e1', location: ' PLCC Campus - 1715 228th Ave SE ' }], [{ id: 'e1' }])
    )
    expect(out[0].location).toBe('PLCC Campus - 1715 228th Ave SE')
  })

  it('publishes the public time, not the internal booking with setup buffer', () => {
    // Five of the church's recurring events reserve an hour of setup, so
    // starts_at runs an hour before the event the public is invited to.
    const out = mapPcoBody(
      body(
        [
          {
            id: '1',
            event: 'e1',
            starts_at: '2026-09-14T15:45:00Z',
            ends_at: '2026-09-14T18:00:00Z',
            published_starts_at: '2026-09-14T16:45:00Z',
            published_ends_at: '2026-09-14T17:45:00Z',
          },
        ],
        [{ id: 'e1', name: 'MomCo Meetup' }]
      )
    )
    expect(out[0].start).toBe('2026-09-14T16:45:00Z')
    expect(out[0].end).toBe('2026-09-14T17:45:00Z')
  })

  it('falls back to starts_at when no published time is set', () => {
    const out = mapPcoBody(
      body([{ id: '1', event: 'e1', starts_at: '2026-09-06T17:00:00Z' }], [{ id: 'e1', name: 'Sunday Service' }])
    )
    expect(out[0].start).toBe('2026-09-06T17:00:00Z')
  })

  it('carries the parent event id as the series key', () => {
    // The instance id is unique per occurrence, so only this can collapse a
    // recurrence into one entry on the page.
    const out = mapPcoBody(
      body(
        [
          { id: 'i1', event: 'e1' },
          { id: 'i2', event: 'e1' },
        ],
        [{ id: 'e1', name: 'Sunday Service' }]
      )
    )
    expect(out.map((e) => e.id)).toEqual(['i1', 'i2'])
    expect(out.map((e) => e.seriesId)).toEqual(['e1', 'e1'])
  })

  it('carries the cadence through verbatim, and omits it when absent', () => {
    const out = mapPcoBody(
      body(
        [
          { id: '1', event: 'e1', cadence: 'The second Wednesday of every month' },
          { id: '2', event: 'e1' },
        ],
        [{ id: 'e1' }]
      )
    )
    expect(out[0].cadence).toBe('The second Wednesday of every month')
    expect(out[1].cadence).toBeUndefined()
  })

  it('carries all-day through and tags every event with the pco source', () => {
    const out = mapPcoBody(body([{ id: '1', event: 'e1', all_day_event: true }], [{ id: 'e1' }]))
    expect(out[0].allDay).toBe(true)
    expect(out[0].source).toBe('pco')
  })
})

describe('mapPcoBody categories — tags first, title ladder underneath', () => {
  const T = [
    { id: 't-cf', name: 'Children & Families' },
    { id: 't-cc', name: 'Congregational Care' },
    { id: 't-ce', name: 'Community Event' },
    { id: 't-y', name: 'Youth' },
  ]

  it('routes on a specific tag when one is present', () => {
    const out = mapPcoBody(
      body(
        [
          { id: '1', event: 'e1', tags: ['t-cf'] },
          { id: '2', event: 'e2', tags: ['t-cc'] },
        ],
        [
          { id: 'e1', name: 'Community Playgroup' },
          { id: 'e2', name: "Dementia/Alzheimer's Family Support Group" },
        ],
        T
      )
    )
    expect(out.map((e) => e.category)).toEqual(['Families', 'Groups'])
  })

  it('falls through to the title ladder when tags carry no specific signal', () => {
    // "Blood Drive" is tagged only `Community Event` in Planning Center, which
    // would misfile it as Everyone if tags were treated as authoritative.
    const out = mapPcoBody(body([{ id: '1', event: 'e1', tags: ['t-ce'] }], [{ id: 'e1', name: 'Blood Drive' }], T))
    expect(out[0].category).toBe('Serve')
  })

  it('falls back to Everyone when there are no tags and no title signal', () => {
    const out = mapPcoBody(body([{ id: '1', event: 'e1', tags: [] }], [{ id: 'e1', name: 'Newcomers Brunch' }], T))
    expect(out[0].category).toBe('Everyone')
  })

  it('prefers Youth when an event is tagged both Youth and Children & Families', () => {
    const out = mapPcoBody(
      body([{ id: '1', event: 'e1', tags: ['t-cf', 't-y'] }], [{ id: 'e1', name: 'Confirmation' }], T)
    )
    expect(out[0].category).toBe('Youth')
  })
})

describe('the committed capture', () => {
  const mapped = mapPcoBody(capture)

  it('is non-empty and fully public', () => {
    expect(mapped.length).toBeGreaterThan(0)
    // Every row survived the mapper's visibility check by construction; this
    // asserts the capture itself didn't arrive empty or unverifiable.
    expect(mapped.length).toBe((capture as any).data.length)
  })

  it('is fresh', () => {
    // The nightly workflow recommits the capture every run, so a capture more
    // than a week old means the pipeline is dead — most likely GitHub disabling
    // the cron after 60 days without repo activity. This assertion runs on every
    // PR and is the only repo-side detector for that silent failure.
    const capturedAt = new Date((capture as { capturedAt: string }).capturedAt).getTime()
    const ageDays = (Date.now() - capturedAt) / 86_400_000
    expect(ageDays).toBeLessThan(7)
  })

  it('yields a usable event for every row', () => {
    for (const e of mapped) {
      expect(e.title).toBeTruthy()
      expect(Number.isNaN(Date.parse(e.start))).toBe(false)
      expect(e.url).toMatch(/^https:\/\//)
      expect(['Everyone', 'Families', 'Youth', 'Groups', 'Serve']).toContain(e.category)
    }
  })
})
