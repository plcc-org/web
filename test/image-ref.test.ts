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

  // No ref in the repo carries a sub-directory any more: Tina uploads flat, into
  // `mediaRoot: 'assets/images'`. The nesting these cases cover is Keystatic's,
  // removed from content in the commit that added this note. Kept because
  // imageKey still resolves a nested key and should — a stray one must degrade to
  // a missing photo, not to a path that silently resolves somewhere else.
  it('still resolves a nested key, though nothing writes one now', () => {
    expect(imageKey(`https://assets.tina.io/${ID}../../church-life/sunset.jpg`)).toBe('church-life/sunset.jpg')
  })

  // The shape a photo uploaded through the *deployed* editor would take: a real
  // CDN URL, no `../` glued on. It resolves to a catalog key here, but the file
  // only exists in TinaCloud's media store — see the media note in docs/cms.md.
  it('strips the CDN prefix even without a relative path attached', () => {
    expect(imageKey(`https://assets.tina.io/${ID}/church-life/sunset.jpg`)).toBe('church-life/sunset.jpg')
  })

  // What a deployed-editor save writes for an image field nested inside a
  // rich-text object list (PhotoBand photos, LogoCards cards): the picker's CDN
  // URL, verbatim — TinaCloud's cloud→relative rewrite covers only direct props.
  // Copied from commit 6042bc5. The pinned-form test below rejects the shape in
  // content; this pins that the renderer still survives it in the meantime.
  it('resolves the flat CDN URL a nested-field save writes', () => {
    expect(imageKey(`https://assets.tina.io/${ID}/479169157_18157955926338056_118133880266586215_n.jpg`)).toBe(
      '479169157_18157955926338056_118133880266586215_n.jpg'
    )
  })

  // assets.tina.io is the host in every stored value observed so far, but the
  // SDK's own default assets host is assets.tinajs.io — accept both, so a host
  // change upstream degrades to nothing worse than today's shapes.
  it('accepts either Tina assets host', () => {
    expect(imageKey(`https://assets.tinajs.io/${ID}/visit-welcome-cafe.jpg`)).toBe('visit-welcome-cafe.jpg')
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
    expect(imageKey('../../assets/images/visit-welcome-cafe.jpg')).toBe('visit-welcome-cafe.jpg')
    expect(imageKey('../assets/images/visit-welcome-cafe.jpg')).toBe('visit-welcome-cafe.jpg')
  })

  it('accepts the absolute, mediaRoot-relative and bare forms', () => {
    expect(imageKey('/assets/images/visit-welcome-cafe.jpg')).toBe('visit-welcome-cafe.jpg')
    expect(imageKey('src/assets/images/visit-welcome-cafe.jpg')).toBe('visit-welcome-cafe.jpg')
    expect(imageKey('/visit-welcome-cafe.jpg')).toBe('visit-welcome-cafe.jpg')
    expect(imageKey('visit-welcome-cafe.jpg')).toBe('visit-welcome-cafe.jpg')
  })

  it('leaves a top-level filename alone', () => {
    expect(imageKey('hero.jpg')).toBe('hero.jpg')
    expect(imageKey('/hero.jpg')).toBe('hero.jpg')
  })
})

// Every syntax these pages write an image path in: `image:`/`logo:` bare in
// frontmatter, `image: "…"` in the object form inside a block prop, and
// `image="…"` as a JSX attribute. The prop name is matched loosely rather than
// listed, because listing it is what went wrong: both checks below keyed on
// `image:` — the colon — so they saw the object form inside `<PhotoBand
// photos={[{ image: "…" }]} />` and missed the attribute form on
// `<CaptionedPhoto image="…" />`. That is 14 of the 67 refs on these pages
// unchecked, by the two tests whose whole job is checking them, including the one
// guarding the path shape that has broken production twice. `hero` and `logo`
// carry images too, and a new block can introduce another name without anyone
// thinking to come back here.
//
// The value class allows `:` so a full URL is visible: TinaCloud writes the CDN
// URL verbatim when an editor replaces a photo in an image field nested inside a
// rich-text object list (its cloud→relative rewrite covers only direct props —
// observed in commit 6042bc5). The site happens to render that shape, so without
// the tests seeing it, content drifts silently into CDN URLs. `.avif` is listed
// because media.accept (tina/config.ts) allows the upload.
const IMAGE_REF = /\w+\s*[:=]\s*"?([\w.:/-]+\.(?:jpg|jpeg|png|webp|avif))"?/gi

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
    for (const m of text.matchAll(IMAGE_REF)) {
      const ref = m[1]
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

  // The exact hunk commit 6042bc5 landed (prettier-wrapped, value on its own
  // line). The first regex shipped here couldn't match a value containing `:`,
  // so a committed CDN URL was invisible to both scanning tests and CI stayed
  // green while content drifted. This pins the blind spot shut.
  it('sees a committed CDN URL at all', () => {
    const hunk = '      image:\n        "https://assets.tina.io/445fdc97/479169157_n.jpg",\n'
    const refs = [...hunk.matchAll(IMAGE_REF)].map((m) => m[1])
    expect(refs).toEqual(['https://assets.tina.io/445fdc97/479169157_n.jpg'])
  })

  const wrong: Record<string, string> = {}
  for (const file of files) {
    for (const m of readFileSync(`${PAGES}/${file}`, 'utf-8').matchAll(IMAGE_REF)) {
      const ref = m[1]
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
