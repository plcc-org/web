import { describe, it, expect } from 'vitest'
import { pageDescription } from '../src/lib/tina/page-meta'

type Page = Parameters<typeof pageDescription>[0]
const page = (fields: Record<string, unknown>) => fields as unknown as Page

describe('pageDescription', () => {
  it('uses the SEO description when one is written', () => {
    expect(pageDescription(page({ seoDescription: 'Written for search.', hero: { lede: 'The lede.' } }))).toBe(
      'Written for search.'
    )
  })

  it('falls back to the lede when the SEO description is empty, not just missing', () => {
    // The CMS saves an untouched field as ''. `??` kept it, and /families/ shipped
    // with no description at all.
    expect(pageDescription(page({ seoDescription: '', hero: { lede: 'The lede.' } }))).toBe('The lede.')
    expect(pageDescription(page({ seoDescription: null, hero: { lede: 'The lede.' } }))).toBe('The lede.')
  })

  it('strips Markdown from a lede reused as the description', () => {
    expect(pageDescription(page({ hero: { lede: 'Sometimes _exhausting_, always [welcome](/visit/).' } }))).toBe(
      'Sometimes exhausting, always welcome.'
    )
  })

  it('is empty for a cinematic hero with no SEO description, which carries no lede', () => {
    // The crawl fails the build on a missing description, so this has to be
    // visible rather than papered over.
    expect(pageDescription(page({ hero: { variant: 'cinematic', subhead: 'Over the photos' } }))).toBe('')
    expect(pageDescription(page({}))).toBe('')
  })
})
