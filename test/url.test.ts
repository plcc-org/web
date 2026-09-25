import { describe, it, expect, vi, afterEach } from 'vitest'
import { withBase, resolveHref, isWebUrl } from '../src/lib/url'

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

// resolveHref decides whether an editor-supplied href is ours to prefix.
// check-site.mjs skips mailto:/tel:/# hrefs, so a mangled one reaches
// production silently — these cases are the only guard.
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

  it('does not mistake a colon after the first segment for a scheme', () => {
    expect(resolveHref('events/10:30/')).toBe(`${BASE}events/10:30/`)
    expect(resolveHref('/events/10:30/')).toBe(`${BASE}events/10:30/`)
  })
})

// Every environment serves from '/', so the sub-path branch never runs in a
// build. Load the module afresh under a stubbed base to prove it would work.
describe('under a sub-path base', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('prefixes internal paths once, and leaves external ones alone', async () => {
    vi.stubEnv('BASE_URL', '/preview/')
    vi.resetModules()
    const url = await import('../src/lib/url')
    expect(url.withBase('/about/')).toBe('/preview/about/')
    expect(url.withBase()).toBe('/preview/')
    expect(url.resolveHref('visit/')).toBe('/preview/visit/')
    expect(url.resolveHref('https://example.org/')).toBe('https://example.org/')
    expect(url.resolveHref('#top')).toBe('#top')
  })
})

describe('isWebUrl', () => {
  it('is true only for absolute http(s) URLs', () => {
    expect(isWebUrl('https://plcc.churchcenter.com/giving')).toBe(true)
    expect(isWebUrl('HTTP://example.org')).toBe(true)
    for (const href of [
      '/visit/',
      'visit/',
      'mailto:office@plcc.org',
      'tel:+14253928636',
      '#top',
      '//cdn.example.org',
    ]) {
      expect(isWebUrl(href)).toBe(false)
    }
  })
})
