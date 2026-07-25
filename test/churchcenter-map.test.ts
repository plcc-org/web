import { describe, it, expect } from 'vitest'
import { mapChurchCenterBody, __test } from '../src/lib/events/adapters/churchcenter-map'

const { truncate, stripHtml } = __test

// Church Center descriptions are written for Church Center and routinely
// overrun the card, so every event on /events/ — and every Event node in the
// structured data — depends on this cutting cleanly.
describe('truncate', () => {
  it('leaves short text alone', () => {
    expect(truncate('Short and sweet.', 40)).toBe('Short and sweet.')
  })

  it('leaves text exactly at the limit alone', () => {
    expect(truncate('abcde', 5)).toBe('abcde')
  })

  it('breaks on a word boundary and marks the cut', () => {
    const source = 'Join us for five days of energizing summer fun'
    const out = truncate(source, 30)

    expect(out.endsWith('…')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(31)

    // The property that matters: what's kept is a prefix of the original that
    // stops at a word boundary, so the next character in the source is a
    // space — never the middle of a word.
    const kept = out.slice(0, -1)
    expect(source.startsWith(kept)).toBe(true)
    expect(source[kept.length]).toBe(' ')
  })

  it('does not leave dangling punctuation before the ellipsis', () => {
    expect(truncate('Kindergarten through 5th grade, as well as others', 32)).not.toMatch(/[,\s]…$/)
  })

  it('falls back to a hard cut when one token fills the whole budget', () => {
    const out = truncate('Supercalifragilisticexpialidocious', 12)
    expect(out).toBe('Supercalifra…')
  })
})

describe('mapChurchCenterBody', () => {
  const body = {
    data: [
      {
        type: 'Event',
        id: '1',
        attributes: {
          // Church Center titles routinely carry stray whitespace.
          name: '  High School Mission Trip  ',
          starts_at: '2099-01-01T18:00:00Z',
          ends_at: '2099-01-01T20:00:00Z',
          description: '<p>Bring a friend &amp; a sleeping bag.</p>',
          show_page_path: '/calendar/event/1',
        },
        relationships: { location: { data: { type: 'Location', id: 'L1' } } },
      },
      { type: 'Event', id: '2', attributes: { name: 'Pedalheads Camp', starts_at: '2099-01-02T18:00:00Z' } },
      { type: 'Event', id: '3', attributes: { name: '   ', starts_at: '2099-01-03T18:00:00Z' } },
    ],
    included: [{ type: 'Location', id: 'L1', attributes: { name: ' PLCC Campus ' } }],
  }

  const events = mapChurchCenterBody(body, 'snapshot')

  it('drops excluded rentals and untitled rows', () => {
    expect(events.map((e) => e.id)).toEqual(['1'])
  })

  it('trims whitespace from titles and locations', () => {
    expect(events[0].title).toBe('High School Mission Trip')
    expect(events[0].location).toBe('PLCC Campus')
  })

  it('strips HTML and decodes entities in the summary', () => {
    expect(events[0].summary).toBe('Bring a friend & a sleeping bag.')
  })

  it('records the source it was told', () => {
    expect(events[0].source).toBe('snapshot')
  })
})

describe('stripHtml', () => {
  it('collapses tags and whitespace', () => {
    expect(stripHtml('<p>one</p>\n<p>two</p>')).toBe('one two')
  })

  it('returns empty for nullish input', () => {
    expect(stripHtml(undefined)).toBe('')
    expect(stripHtml(null)).toBe('')
  })
})
