import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'

// Catch dangling image references at the source: any photo filename used in a
// page, the youth-moments collection, or the photo catalog must exist in
// src/assets/images. (A missing <Photo filename> renders nothing silently, so
// this is our guard against typos / deleted assets.)
const ASSET_DIR = 'src/assets/images'
// Index by basename, recursively — CMS page images are nested under
// src/assets/images/<page-slug>/… (see imageFromRef in src/lib/images.ts).
const assets = new Set(
  (readdirSync(ASSET_DIR, { recursive: true }) as string[]).map((f) => f.split('/').pop() as string)
)

function sources(): string[] {
  const out: string[] = []
  for (const dir of ['src/pages', 'src/content', 'src/layouts', 'src/components']) {
    for (const f of readdirSync(dir, { recursive: true }) as string[]) {
      if (/\.(astro|md|ts|json)$/.test(f)) out.push(`${dir}/${f}`)
    }
  }
  return out
}

// Every basename ending in a raster image extension, anywhere in the source.
function imageRefs(text: string): string[] {
  return [...text.matchAll(/[\w.-]+\.(?:jpg|jpeg|png|webp)/gi)].map((m) => m[0])
}

describe('image references resolve to assets', () => {
  const missing = new Map<string, string>() // filename -> first file referencing it
  for (const file of sources()) {
    for (const ref of imageRefs(readFileSync(file, 'utf-8'))) {
      if (!assets.has(ref) && !missing.has(ref)) missing.set(ref, file)
    }
  }

  it('has no references to nonexistent image files', () => {
    expect(Object.fromEntries(missing)).toEqual({})
  })
})

describe('photo catalog', () => {
  // Entries store the full `/assets/images/<file>` reference (the CMS
  // round-trip shape); the catalog is keyed by the basename.
  const catalog = (
    JSON.parse(readFileSync('src/content/photos/photos.json', 'utf-8')).photos as { id: string; alt: string }[]
  ).map((p) => ({ ...p, id: p.id.split('/').pop() as string }))

  it('every entry is stored as /assets/images/<file>', () => {
    const raw = JSON.parse(readFileSync('src/content/photos/photos.json', 'utf-8')).photos as { id: string }[]
    const wrong = raw.filter((p) => !p.id.startsWith('/assets/images/')).map((p) => p.id)
    expect(wrong).toEqual([])
  })

  it('every catalogued photo file exists', () => {
    const missing = catalog.filter((p) => !assets.has(p.id)).map((p) => p.id)
    expect(missing).toEqual([])
  })

  it('every catalogued photo has non-empty alt', () => {
    const blank = catalog.filter((p) => !p.alt?.trim()).map((p) => p.id)
    expect(blank).toEqual([])
  })

  it('has no duplicate entries', () => {
    const seen = new Set<string>()
    const dupes = catalog.filter((p) => (seen.has(p.id) ? true : (seen.add(p.id), false))).map((p) => p.id)
    expect(dupes).toEqual([])
  })
})
