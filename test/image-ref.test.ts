import { describe, it, expect } from 'vitest'
import { imageKey } from '../src/lib/images'

// Guards the function that turns a stored photo reference into a catalog key.
//
// It has cost the deployed site its photos once already. The CMS returns a
// different shape depending on which client the build used, and TinaCloud rewrites
// every reference to its own CDN — where our photos do not exist, because they live
// in src/assets/images for Astro's image pipeline. Nothing errors when a lookup
// misses: <Photo> is optional almost everywhere and PageHero quietly renders its
// text-only header, so the photos simply vanish.
//
// The TinaCloud strings below are copied verbatim from a Cloudflare build log,
// including the missing slash after the client ID. A unit test because the failing
// shapes only occur against a hosted backend, which no local build has.

describe('imageKey', () => {
  const ID = '445fdc97-3a8b-43a2-9a96-78e618e3b209'

  it('undoes the CDN rewrite TinaCloud applies', () => {
    expect(imageKey(`https://assets.tina.io/${ID}../../ecc.png`)).toBe('ecc.png')
    expect(imageKey(`https://assets.tina.io/${ID}../../688099949_18204342151338056_3539234897453255183_n.jpg`)).toBe(
      '688099949_18204342151338056_3539234897453255183_n.jpg'
    )
  })

  it('keeps the sub-directory a CMS upload lands in', () => {
    expect(
      imageKey(`https://assets.tina.io/${ID}../../church-life/474748731_1030392515795404_2521947271930024728_n.jpg`)
    ).toBe('church-life/474748731_1030392515795404_2521947271930024728_n.jpg')
  })

  // The shape a photo uploaded through the *deployed* editor would take: a real
  // CDN URL, no `../` glued on. It resolves to a catalog key here, but the file
  // only exists in TinaCloud's media store — see the media note in docs/cms.md.
  it('strips the CDN prefix even without a relative path attached', () => {
    expect(imageKey(`https://assets.tina.io/${ID}/church-life/sunset.jpg`)).toBe('church-life/sunset.jpg')
  })

  it('accepts the relative path a local build reads from the file', () => {
    expect(imageKey('../../assets/images/visit/hero/image.jpg')).toBe('visit/hero/image.jpg')
    expect(imageKey('../assets/images/visit/hero/image.jpg')).toBe('visit/hero/image.jpg')
  })

  it('accepts the absolute, mediaRoot-relative and bare forms', () => {
    expect(imageKey('/assets/images/visit/hero/image.jpg')).toBe('visit/hero/image.jpg')
    expect(imageKey('src/assets/images/visit/hero/image.jpg')).toBe('visit/hero/image.jpg')
    expect(imageKey('/visit/hero/image.jpg')).toBe('visit/hero/image.jpg')
    expect(imageKey('visit/hero/image.jpg')).toBe('visit/hero/image.jpg')
  })

  it('leaves a top-level filename alone', () => {
    expect(imageKey('hero.jpg')).toBe('hero.jpg')
    expect(imageKey('/hero.jpg')).toBe('hero.jpg')
  })
})
