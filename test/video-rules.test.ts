import { describe, it, expect } from 'vitest'
import { embedFrom, checkVideoUrl } from '../tina/video-rules.mjs'

// The Video block renders a placeholder when embedFrom returns undefined, so a
// parse regression is a blank box on the page, not a build error. And the embed
// hosts are the privacy-friendly ones on purpose: a plain youtube.com/embed URL
// would set tracking cookies on every visitor to the page.

const YT = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'

describe('embedFrom', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ?si=abc',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.youtube.com/live/dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
  ])('turns %s into the no-cookie embed', (url) => {
    expect(embedFrom(url)).toBe(YT)
  })

  it.each([
    'https://vimeo.com/123456789',
    'https://player.vimeo.com/video/123456789',
    'https://www.vimeo.com/123456789',
  ])('turns %s into the do-not-track Vimeo player', (url) => {
    expect(embedFrom(url)).toBe('https://player.vimeo.com/video/123456789?dnt=1')
  })

  it.each([
    undefined,
    '',
    'not a url',
    'https://example.org/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/',
    'https://www.youtube.com/@pinelake',
    'https://youtu.be/',
    'https://vimeo.com/channels',
  ])('returns undefined for %s', (url) => {
    expect(embedFrom(url)).toBeUndefined()
  })

  it('never produces a tracking embed host', () => {
    const outputs = ['https://youtube.com/watch?v=a1', 'https://youtu.be/a1', 'https://vimeo.com/1'].map(embedFrom)
    for (const out of outputs) {
      expect(out).toMatch(/^https:\/\/(www\.youtube-nocookie\.com\/embed\/|player\.vimeo\.com\/video\/\d+\?dnt=1$)/)
    }
  })
})

describe('checkVideoUrl', () => {
  it('leaves an empty field to `required`', () => {
    expect(checkVideoUrl('')).toBeUndefined()
    expect(checkVideoUrl(undefined)).toBeUndefined()
  })

  it('agrees with embedFrom', () => {
    expect(checkVideoUrl('https://youtu.be/dQw4w9WgXcQ')).toBeUndefined()
    expect(checkVideoUrl('https://example.org/video')).toMatch(/YouTube or Vimeo/)
  })
})
