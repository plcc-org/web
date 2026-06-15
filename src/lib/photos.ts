import { getCollection } from 'astro:content'

// The photo catalog (src/content/photos.json) is the single source of truth for
// every editorial photo's alt text, keyed by its filename in src/assets/images.
// <Photo> resolves the image bytes by filename (src/lib/images.ts) and the alt
// text here, so pages only need to name a photo — selection lives with the page,
// metadata lives with the catalog. Logos and adornments aren't catalogued and
// pass their own alt to <Photo> directly.
let alts: Map<string, string> | null = null

export async function photoAlt(filename: string): Promise<string> {
  if (!alts) {
    const entries = await getCollection('photos')
    alts = new Map(entries.map((e) => [e.id, e.data.alt]))
  }
  const alt = alts.get(filename)
  if (alt === undefined) console.warn(`[photos] no catalog entry for "${filename}"`)
  return alt ?? ''
}
