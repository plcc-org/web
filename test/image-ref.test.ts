import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
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

  // What the deployed editor *writes back* when it saves a page. Same missing
  // slash, in reverse: mediaRoot re-prefixed onto the relative path it read. Real,
  // from commit f077628 — an editor changed some text and the hero image broke.
  it('resolves the mangled path a CMS save writes into the file', () => {
    expect(imageKey('/assets/images../../715550230_18207937264338056_8366812198487572303_n.jpg')).toBe(
      '715550230_18207937264338056_8366812198487572303_n.jpg'
    )
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

// Every photo referenced by a CMS page has to resolve to a file we actually have.
//
// assets.test.ts can't cover this: it matches bare filenames, and its extension
// filter excludes .mdx, so the pages the CMS writes are invisible to it. That is
// how a save mangled a hero path in commit f077628 and reached production — the
// basename was still valid, the file existed, and the page rendered without its
// photo. Resolving through imageKey is the check that matters, because imageKey is
// what the renderer uses.
describe('CMS page image references', () => {
  const PAGES = 'src/content/pages'
  const files = (readdirSync(PAGES, { recursive: true }) as string[]).filter((f) => f.endsWith('.mdx'))

  const unresolved: Record<string, string> = {}
  for (const file of files) {
    const text = readFileSync(`${PAGES}/${file}`, 'utf-8')
    for (const m of text.matchAll(/image:\s*"?([^"\n,}]+\.(?:jpg|jpeg|png|webp))"?/gi)) {
      const ref = m[1].trim()
      if (!existsSync(`src/assets/images/${imageKey(ref)}`)) unresolved[ref] = file
    }
  }

  it('all resolve to a file in src/assets/images', () => {
    expect(unresolved).toEqual({})
  })

  it('scans the pages at all', () => {
    expect(files.length).toBeGreaterThan(10)
  })
})

// Pins the stored form, which is the actual fix for the mangling rather than a
// tolerance for it.
//
// The CMS's cloud resolver strips `mediaRoot` from a path by substring, not by
// prefix (@tinacms/graphql, resolveMediaRelativeToCloud). Traced against the two
// forms:
//
//   "../../assets/images/x.jpg"  →  read as ".../<id>../../x.jpg"  →  written back
//                                   as "/assets/images../../x.jpg"   ✗ mangled
//   "/assets/images/x.jpg"       →  read as ".../<id>/x.jpg"        →  written back
//                                   as "/assets/images/x.jpg"        ✓ unchanged
//
// So the absolute form is the only one an editor's save preserves. Observed twice in
// the wild before the migration: commits f077628 and 8a2deef both broke a hero.
describe('CMS pages store images in the form the CMS round-trips', () => {
  const PAGES = 'src/content/pages'
  const files = (readdirSync(PAGES, { recursive: true }) as string[]).filter((f) => f.endsWith('.mdx'))

  const wrong: Record<string, string> = {}
  for (const file of files) {
    for (const m of readFileSync(`${PAGES}/${file}`, 'utf-8').matchAll(
      /image:\s*"?([^"\n,}]+\.(?:jpg|jpeg|png|webp))"?/gi
    )) {
      const ref = m[1].trim()
      if (!ref.startsWith('/assets/images/')) wrong[ref] = file
    }
  }

  it('uses /assets/images/… everywhere, never a relative or mangled path', () => {
    expect(wrong).toEqual({})
  })
})

// Leadership portraits are held to the same form, and for a sharper reason: they
// used Astro's image() helper, which needs a path relative to the file — exactly
// what the CMS mangles on save. A mangled page image quietly disappears; a
// mangled portrait fails the build outright with [ImageNotFound], so a single
// edit to a leader would block every deploy until someone hand-fixed the YAML.
// Verified by mangling one and building before changing it.
describe('leadership portraits use the same form', () => {
  const DIR = 'src/content/leadership'
  const files = readdirSync(DIR).filter((f) => f.endsWith('.yaml'))

  const wrong: Record<string, string> = {}
  for (const file of files) {
    const m = readFileSync(`${DIR}/${file}`, 'utf-8').match(/portrait:\s*(\S+)/)
    if (!m) continue
    const ref = m[1].trim()
    if (!ref.startsWith('/assets/images/')) wrong[ref] = file
    else if (!existsSync(`src/assets/images/${imageKey(ref)}`)) wrong[ref] = `${file} (no such file)`
  }

  it('are /assets/images/… and resolve to a real file', () => {
    expect(wrong).toEqual({})
  })

  it('scans the leaders at all', () => {
    expect(files.length).toBeGreaterThan(2)
  })
})
