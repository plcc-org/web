import { describe, it, expect } from 'vitest'
import { withBase } from '../src/lib/url'

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
