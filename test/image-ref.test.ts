import { describe, it, expect } from 'vitest'
import { imageKey } from '../src/lib/images'

// Guards the one function that has to understand both shapes the CMS stores a
// photo reference in. It cost every hero image on the deployed site once:
//
//   local build      "../../assets/images/visit/hero/image.jpg"  (raw file value)
//   TinaCloud        "/visit/hero/image.jpg"                     (relative to mediaRoot)
//
// The second missed the catalog entirely, so <PageHero> fell through to its
// text-only header on every CMS page in production while rendering perfectly in
// dev. Nothing failed; the photos were simply gone. This is a unit test because
// the failure only appears against a hosted backend, which no local build has.

describe('imageKey', () => {
  const key = 'visit/hero/image.jpg'

  it('accepts the relative path a local build reads from the file', () => {
    expect(imageKey('../../assets/images/visit/hero/image.jpg')).toBe(key)
    expect(imageKey('../assets/images/visit/hero/image.jpg')).toBe(key)
  })

  it('accepts the mediaRoot-relative path TinaCloud returns', () => {
    expect(imageKey('/visit/hero/image.jpg')).toBe(key)
  })

  it('accepts the absolute and bare forms', () => {
    expect(imageKey('/assets/images/visit/hero/image.jpg')).toBe(key)
    expect(imageKey('src/assets/images/visit/hero/image.jpg')).toBe(key)
    expect(imageKey('visit/hero/image.jpg')).toBe(key)
  })

  it('leaves a top-level filename alone', () => {
    expect(imageKey('hero.jpg')).toBe('hero.jpg')
    expect(imageKey('/hero.jpg')).toBe('hero.jpg')
  })
})
