import { describe, it, expect } from 'vitest'
import { extractSundayServicesFromFeed } from '../src/lib/messages'

// The messages page renders whatever this parses from the channel feed, and falls
// back to a hard-coded list when it parses nothing — so a parse regression doesn't
// fail anything; the page just quietly stops updating.

const entry = (fields: { title: string; id?: string; link?: string; published?: string }) => `
  <entry>
    <id>yt:video:${fields.id ?? ''}</id>
    <yt:videoId>${fields.id ?? ''}</yt:videoId>
    <title>${fields.title}</title>
    ${fields.link ? `<link rel="alternate" href="${fields.link}"/>` : ''}
    <published>${fields.published ?? '2026-09-20T18:00:00+00:00'}</published>
  </entry>`

const feed = (...entries: string[]) =>
  `<?xml version="1.0"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"><title>Pine Lake</title>${entries.join('')}</feed>`

describe('extractSundayServicesFromFeed', () => {
  it('keeps Sunday services, in feed order, with their links derived from the id', () => {
    const services = extractSundayServicesFromFeed(
      feed(
        entry({
          title: 'Sunday Service - September 20, 2026',
          id: 'abc123',
          link: 'https://www.youtube.com/watch?v=abc123',
        }),
        entry({ title: 'Sunday Service - September 13, 2026', id: 'def456' })
      )
    )
    expect(services.map((s) => s.videoId)).toEqual(['abc123', 'def456'])
    expect(services[0]).toMatchObject({
      dateLabel: 'September 20, 2026',
      watchUrl: 'https://www.youtube.com/watch?v=abc123',
      embedUrl: 'https://www.youtube.com/embed/abc123',
      thumbnailUrl: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
    })
    // No alternate link: the watch URL is built from the id.
    expect(services[1].watchUrl).toBe('https://www.youtube.com/watch?v=def456')
  })

  it('drops everything that is not a Sunday service, and entries with no video id', () => {
    const services = extractSundayServicesFromFeed(
      feed(
        entry({ title: 'Youth Camp Highlights', id: 'x1' }),
        entry({ title: 'Sunday Service - September 20, 2026' }),
        entry({ title: 'Sunday Service - September 13, 2026', id: 'ok' })
      )
    )
    expect(services.map((s) => s.videoId)).toEqual(['ok'])
  })

  it('decodes entities in titles and links', () => {
    const [service] = extractSundayServicesFromFeed(
      feed(
        entry({
          title: 'Sunday Service - Palm Sunday &amp; Communion',
          id: 'p1',
          link: 'https://www.youtube.com/watch?v=p1&amp;t=5',
        })
      )
    )
    expect(service.title).toBe('Sunday Service - Palm Sunday & Communion')
    expect(service.dateLabel).toBe('Palm Sunday & Communion')
    expect(service.watchUrl).toBe('https://www.youtube.com/watch?v=p1&t=5')
  })

  it('falls back to the published date, in church time, when the title carries none', () => {
    // 03:00 UTC Monday is still Sunday evening in Sammamish.
    const [service] = extractSundayServicesFromFeed(
      feed(entry({ title: 'Sunday Service', id: 'n1', published: '2026-09-21T03:00:00+00:00' }))
    )
    expect(service.dateLabel).toBe('September 20, 2026')
  })

  it('returns nothing for a feed with no entries', () => {
    expect(extractSundayServicesFromFeed(feed())).toEqual([])
    expect(extractSundayServicesFromFeed('')).toEqual([])
  })
})
