import { describe, it, expect } from 'vitest'
import { church, serviceCloses } from '../src/config/church'
import { churchGraph, eventGraph, jsonLdDocument } from '../src/lib/structured-data'
import type { CalendarEvent } from '../src/lib/events/types'

const ORIGIN = 'https://plcc.org'

describe('serviceCloses', () => {
  it('is the opening time plus the service length, as HH:MM', () => {
    const [h, m] = church.service.opens.split(':').map(Number)
    const [ch, cm] = serviceCloses().split(':').map(Number)
    expect(serviceCloses()).toMatch(/^\d{2}:\d{2}$/)
    expect(ch * 60 + cm - (h * 60 + m)).toBe(church.service.durationMinutes)
  })
})

describe('churchGraph', () => {
  const [org, place] = churchGraph(ORIGIN, { logo: `${ORIGIN}/logo.png`, image: `${ORIGIN}/social.jpg` })

  it('emits the Church and the Place it meets in, under stable ids', () => {
    expect(org['@type']).toBe('Church')
    expect(org['@id']).toBe(`${ORIGIN}/#church`)
    expect(place['@type']).toBe('Place')
    expect(place['@id']).toBe(`${ORIGIN}/#place`)
  })

  it('states the service hours from the church config', () => {
    expect(org.openingHoursSpecification).toEqual([
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${church.service.day}`,
        opens: church.service.opens,
        closes: serviceCloses(),
      },
    ])
  })

  it('keeps the logo and the representative image separate', () => {
    // One 1200x630 card for both would fail the logo aspect-ratio guidance.
    expect(org.logo).toBe(`${ORIGIN}/logo.png`)
    expect(org.image).toBe(`${ORIGIN}/social.jpg`)
    const [bare] = churchGraph(ORIGIN)
    expect(bare).not.toHaveProperty('logo')
    expect(bare).not.toHaveProperty('image')
  })
})

describe('eventGraph', () => {
  const event: CalendarEvent = {
    id: 'e1',
    seriesId: 'e1',
    title: 'Trunk or Treat',
    start: '2026-10-31T17:00:00-07:00',
    end: '2026-10-31T19:00:00-07:00',
    url: 'https://example.org/e1',
    summary: 'Costumes welcome.',
    category: 'Families',
    source: 'pco',
  }

  it('points each event at the church as organiser', () => {
    const [node] = eventGraph(ORIGIN, [event])
    expect(node.organizer).toEqual({ '@id': `${ORIGIN}/#church` })
    expect(node.startDate).toBe(event.start)
  })

  it('carries endDate and url only when the event has them', () => {
    const [full] = eventGraph(ORIGIN, [event])
    expect(full.endDate).toBe(event.end)
    expect(full.url).toBe(event.url)
    const [bare] = eventGraph(ORIGIN, [{ ...event, end: undefined, url: '' }])
    expect(bare).not.toHaveProperty('endDate')
    expect(bare).not.toHaveProperty('url')
  })
})

describe('jsonLdDocument', () => {
  it('wraps nodes in one @graph', () => {
    expect(JSON.parse(jsonLdDocument([{ '@type': 'Thing' }]))).toEqual({
      '@context': 'https://schema.org',
      '@graph': [{ '@type': 'Thing' }],
    })
  })

  it('cannot end its own <script> element', () => {
    // Rendered with set:html inside <script type="application/ld+json">.
    const doc = jsonLdDocument([{ description: 'a </script><img src=x onerror=alert(1)> b' }])
    expect(doc).not.toContain('</script')
    expect(doc).not.toContain('<')
    expect(JSON.parse(doc)['@graph'][0].description).toBe('a </script><img src=x onerror=alert(1)> b')
  })
})
