import { describe, it, expect, vi, afterEach } from 'vitest'
import { isIndexableSite, resolveDeployEnv } from '../src/config/site'

// Getting the deploy target wrong has no symptom on the page: staging gets
// indexed and competes with production, or production quietly drops out of
// search. The crawl asserts the built robots.txt; these pin the two decisions.

describe('resolveDeployEnv', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('takes DEPLOY_ENV, case-insensitively', () => {
    vi.stubEnv('DEPLOY_ENV', 'Production')
    expect(resolveDeployEnv()).toBe('production')
    vi.stubEnv('DEPLOY_ENV', 'staging')
    expect(resolveDeployEnv()).toBe('staging')
  })

  it('assumes staging on a Cloudflare build that forgot to set it', () => {
    vi.stubEnv('DEPLOY_ENV', '')
    vi.stubEnv('WORKERS_CI', '1')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveDeployEnv()).toBe('staging')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('is development anywhere else, including an unknown value', () => {
    vi.stubEnv('DEPLOY_ENV', 'prod')
    vi.stubEnv('WORKERS_CI', '')
    vi.stubEnv('CF_PAGES', '')
    expect(resolveDeployEnv()).toBe('development')
  })
})

describe('isIndexableSite', () => {
  it('indexes production only', () => {
    expect(isIndexableSite(new URL('https://plcc.org'))).toBe(true)
    expect(isIndexableSite(new URL('https://plcc.org/'))).toBe(true)
    expect(isIndexableSite(new URL('https://plcc.dev'))).toBe(false)
    expect(isIndexableSite(undefined)).toBe(false)
  })

  it('does not mistake a lookalike host for production', () => {
    expect(isIndexableSite(new URL('https://plcc.org.example.com'))).toBe(false)
    expect(isIndexableSite(new URL('http://plcc.org'))).toBe(false)
  })
})
