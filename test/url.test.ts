import { describe, it, expect } from 'vitest'
import { withBase, resolveHref } from '../src/lib/url'

// withBase prefixes the configured base path. We assert behavior relative to the
// resolved BASE_URL so the test holds for both root ('/') and sub-path deploys.
const BASE = import.meta.env.BASE_URL

describe('withBase', () => {
  it('prefixes a relative path with the base', () => {
    expect(withBase('about/')).toBe(`${BASE}about/`)
  })

  it('strips a single leading slash so input form does not matter', () => {
    expect(withBase('/about/')).toBe(withBase('about/'))
  })

  it('returns the bare base for no argument', () => {
    expect(withBase()).toBe(BASE)
  })

  it('keeps nested paths intact', () => {
    expect(withBase('neighbors/serve/')).toBe(`${BASE}neighbors/serve/`)
  })
})

// resolveHref decides whether an editor-supplied href is ours to prefix. It
// replaces four copy-pasted regexes, one of which had drifted: only PageHero
// handled `tel:`, so a phone number in a Cta or CardRow link became
// `/tel:+1425…`. The crawler skips tel: hrefs, so nothing caught it.
describe('resolveHref', () => {
  it('base-prefixes internal paths', () => {
    expect(resolveHref('visit/')).toBe(`${BASE}visit/`)
    expect(resolveHref('/visit/')).toBe(`${BASE}visit/`)
  })

  it('passes absolute URLs through untouched', () => {
    expect(resolveHref('https://plcc.churchcenter.com/giving')).toBe('https://plcc.churchcenter.com/giving')
    expect(resolveHref('http://example.org')).toBe('http://example.org')
    expect(resolveHref('//cdn.example.org/x.png')).toBe('//cdn.example.org/x.png')
  })

  it('passes the link schemes editors type through untouched', () => {
    expect(resolveHref('mailto:office@plcc.org')).toBe('mailto:office@plcc.org')
    expect(resolveHref('tel:+14253928636')).toBe('tel:+14253928636')
  })

  it('passes in-page anchors through untouched', () => {
    expect(resolveHref('#main-content')).toBe('#main-content')
  })

  it('does not mistake a path segment containing a colon for a scheme', () => {
    expect(resolveHref('events/families/')).toBe(`${BASE}events/families/`)
  })
})
