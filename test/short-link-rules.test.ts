import { describe, it, expect } from 'vitest'
import { checkFrom, checkDestination, checkReview, parseReviewDate, toPath } from '../tina/short-link-rules.mjs'

// These rules run in the CMS form (ui.validate) and in scripts/generate-redirects.mjs.
// Too strict and an editor can't save a legitimate link; too loose and a short link
// can hide a real page, since Cloudflare resolves _redirects before static assets.

describe('toPath', () => {
  it('lowercases and trims slashes at both ends', () => {
    expect(toPath('/Camp/')).toBe('camp')
    expect(toPath('//connect/about/leadership-team//')).toBe('connect/about/leadership-team')
  })
})

describe('checkFrom', () => {
  it.each(['/camp', '/camp/', '/connect/about/leadership-team/', '/2026-retreat'])('accepts %s', (from) => {
    expect(checkFrom(from)).toBeUndefined()
  })

  it('accepts uppercase, which is compared lowercased', () => {
    expect(checkFrom('/Camp')).toBeUndefined()
  })

  it.each([undefined, '', 'camp'])('requires a leading slash (%s)', (from) => {
    expect(checkFrom(from)).toMatch(/start with a slash/)
  })

  it.each(['/camp here', '/camp?x=1', '/café', '/-camp', '/'])('rejects characters outside the set (%s)', (from) => {
    expect(checkFrom(from)).toMatch(/lowercase letters/)
  })

  it.each(['/admin', '/admin/login', '/_astro/x', '/tina-island', '/robots.txt', '/sitemap-index.xml'])(
    'refuses the reserved prefix %s',
    (from) => {
      // robots.txt and sitemap-index.xml fail the character set first; either
      // message stops the save, which is what matters.
      expect(checkFrom(from)).toBeDefined()
    }
  )

  it('names the reserved segment', () => {
    expect(checkFrom('/admin/login')).toMatch(/starts with "admin"/)
  })

  it('reserves whole segments, not prefixes of them', () => {
    expect(checkFrom('/administration')).toBeUndefined()
  })
})

describe('checkDestination', () => {
  it.each(['/visit/', 'https://example.org/x', 'HTTP://example.org'])('accepts %s', (destination) => {
    expect(checkDestination(destination)).toBeUndefined()
  })

  it.each([undefined, '', 'visit/', 'www.example.org', 'mailto:office@example.org'])('rejects %s', (destination) => {
    expect(checkDestination(destination)).toMatch(/Sends people to/)
  })

  it('skips the destination for a link that is gone', () => {
    expect(checkDestination(undefined, 'gone')).toBeUndefined()
  })

  it('accepts both redirect kinds and rejects anything else', () => {
    expect(checkDestination('/visit/', 'moved')).toBeUndefined()
    expect(checkDestination('/visit/', 'shortcut')).toBeUndefined()
    expect(checkDestination('/visit/', 'forever')).toMatch(/shortcut, moved, gone/)
  })
})

describe('parseReviewDate', () => {
  it('reads the hand-written date form as UTC midnight', () => {
    expect(parseReviewDate('2026-09-30')?.toISOString()).toBe('2026-09-30T00:00:00.000Z')
  })

  it('reads the full timestamp the CMS picker writes', () => {
    expect(parseReviewDate('2026-09-30T07:00:00.000Z')?.toISOString()).toBe('2026-09-30T07:00:00.000Z')
  })

  it.each([undefined, '', 'soon', 42])('treats %s as no date', (value) => {
    expect(parseReviewDate(value)).toBeNull()
  })
})

describe('checkReview', () => {
  it('accepts a review date, or permanent, alone', () => {
    expect(checkReview(false, '2026-09-30')).toBeUndefined()
    expect(checkReview(true, undefined)).toBeUndefined()
  })

  it('refuses both at once', () => {
    expect(checkReview(true, '2026-09-30')).toMatch(/Clear one or the other/)
  })

  it('refuses neither, including an unreadable date', () => {
    expect(checkReview(false, undefined)).toMatch(/needs a "Review by" date/)
    expect(checkReview(false, 'next spring')).toMatch(/needs a "Review by" date/)
  })
})
