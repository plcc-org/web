import { describe, it, expect } from 'vitest'
import { checkClosingBanner, checkPhotoAlt, siblingValue } from '../tina/block-rules.mjs'

describe('siblingValue', () => {
  const doc = {
    hero: { image: '/assets/images/hero.jpg', photos: [{ image: '/assets/images/a.jpg' }] },
    blocks: [{ _template: 'Section' }, { _template: 'Split', image: '/assets/images/b.jpg' }],
  }

  it('finds the field beside this one, at any depth', () => {
    expect(siblingValue(doc, 'hero.alt', 'image')).toBe('/assets/images/hero.jpg')
    expect(siblingValue(doc, 'hero.photos.0.alt', 'image')).toBe('/assets/images/a.jpg')
    expect(siblingValue(doc, 'blocks.1.alt', 'image')).toBe('/assets/images/b.jpg')
  })

  it('gives up quietly on a path that leads nowhere', () => {
    expect(siblingValue(doc, 'blocks.0.alt', 'image')).toBeUndefined()
    expect(siblingValue(doc, 'blocks.9.alt', 'image')).toBeUndefined()
    expect(siblingValue(doc, undefined, 'image')).toBeUndefined()
    expect(siblingValue(undefined, 'blocks.1.alt', 'image')).toBeUndefined()
  })
})

describe('checkClosingBanner', () => {
  const block = (_template: string) => ({ _template })

  it('accepts a page with no Closing banner, or one at the end', () => {
    expect(checkClosingBanner(undefined)).toBeUndefined()
    expect(checkClosingBanner([])).toBeUndefined()
    expect(checkClosingBanner([block('Section'), block('Split')])).toBeUndefined()
    expect(checkClosingBanner([block('Section'), block('Closing')])).toBeUndefined()
  })

  it('rejects a second banner, or one that is not last', () => {
    expect(checkClosingBanner([block('Closing'), block('Section'), block('Closing')])).toMatch(/only one/)
    expect(checkClosingBanner([block('Closing'), block('Section')])).toMatch(/last block/)
  })
})

describe('checkPhotoAlt', () => {
  const catalogued = new Set(['known.jpg'])

  it('is satisfied by a catalogued photo, or a description written here', () => {
    expect(checkPhotoAlt('', '/assets/images/known.jpg', catalogued)).toBeUndefined()
    expect(checkPhotoAlt('A volunteer pouring coffee', '/assets/images/new.jpg', catalogued)).toBeUndefined()
  })

  it('says nothing until there is a photo to describe', () => {
    expect(checkPhotoAlt('', undefined, catalogued)).toBeUndefined()
    expect(checkPhotoAlt('', '', catalogued)).toBeUndefined()
  })

  it('asks for a description when the photo is new to the catalog', () => {
    expect(checkPhotoAlt('', '/assets/images/new.jpg', catalogued)).toMatch(/no saved description/)
    expect(checkPhotoAlt('   ', 'https://assets.tina.io/abc/new.jpg?w=200', catalogued)).toMatch(/no saved description/)
  })
})
