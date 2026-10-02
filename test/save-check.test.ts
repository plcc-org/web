import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { heroFields, templates } from '../tina/templates.mjs'
import { pageProblems } from '../tina/save-check.mjs'
import photoCatalog from '../src/content/photos/photos.json'

// The save-time check runs every field validator over the whole page, because Tina only
// runs a block's validators while the block is open. Two halves to pin: it catches what
// the open block would have caught, and it never blocks a page that's fine — every page
// on disk today must pass, or editors would be locked out of saving it.

const schema = { heroFields, templates }
const catalogued = `/assets/images/${photoCatalog.photos[0].id.split('/').pop()}`
const page = (extra: Record<string, unknown>) => ({
  title: 'A page',
  draft: true,
  hero: { variant: 'plain', lede: 'An intro.' },
  blocks: [],
  ...extra,
})

describe('pageProblems', () => {
  it('passes a plain page', () => {
    expect(pageProblems(page({}), schema)).toEqual([])
  })

  it('catches a "Photo & text" top with no photo', () => {
    const problems = pageProblems(page({ hero: { variant: 'photo', lede: 'Hi.' } }), schema)
    expect(problems).toEqual([expect.stringMatching(/^Top of page: .*needs a photo/)])
  })

  it('catches a block missing what the block asks for, naming the block', () => {
    const problems = pageProblems(page({ blocks: [{ _template: 'Split', heading: 'Hi' }] }), schema)
    expect(problems).toEqual([expect.stringMatching(/^Block 1 \(Photo beside text\): .*photo/)])
  })

  it('catches an uncatalogued photo with no description, and accepts a catalogued one', () => {
    const uncatalogued = { _template: 'CaptionedPhoto', image: '/assets/images/zz-not-in-the-catalog.jpg' }
    expect(pageProblems(page({ blocks: [uncatalogued] }), schema)).toEqual([
      expect.stringMatching(/^Block 1 \(Photo\): .*no saved description/),
    ])
    expect(pageProblems(page({ blocks: [{ _template: 'CaptionedPhoto', image: catalogued }] }), schema)).toEqual([])
    expect(pageProblems(page({ blocks: [{ ...uncatalogued, alt: 'A described photo' }] }), schema)).toEqual([])
  })

  it('catches a bad link inside a block', () => {
    const block = { _template: 'Closing', heading: 'Come', buttonHref: 'plcc.org/visit' }
    expect(pageProblems(page({ blocks: [block] }), schema)).toEqual([
      expect.stringMatching(/^Block 1 \(Closing banner\): Start the address with https:\/\//),
    ])
  })

  it('looks inside lists within a block', () => {
    const gallery = { _template: 'PhotoBand', photos: [{ image: catalogued }, { image: '/assets/images/zz-new.jpg' }] }
    expect(pageProblems(page({ blocks: [gallery] }), schema)).toEqual([
      expect.stringMatching(/^Block 1 \(Photo gallery\), Photos 2: .*no saved description/),
    ])
  })

  it('passes every page on disk', () => {
    const dir = 'src/content/pages'
    const files = readdirSync(dir, { recursive: true }).filter((f): f is string => String(f).endsWith('.mdx'))
    expect(files.length).toBeGreaterThan(10)
    const failing = files.flatMap((file) => {
      const front = readFileSync(join(dir, file), 'utf-8').match(/^---\n([\s\S]*?)\n---/)
      const problems = pageProblems(parseYaml(front?.[1] ?? '') ?? {}, schema)
      return problems.map((p) => `${file}: ${p}`)
    })
    expect(failing).toEqual([])
  })
})
