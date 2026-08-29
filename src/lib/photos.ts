import { getCollection } from 'astro:content'
import { imageKey } from './images'

// The photo catalog (src/content/photos/photos.json): every editorial photo in
// src/assets/images, keyed by filename, with its alt text written once. A block
// that shows a catalogued photo may leave its alt field blank — altFor falls
// back to the catalog — so one description serves every page the photo appears
// on, and an inline alt, where present, is a deliberate per-page override.
// Logos and adornments aren't catalogued and always pass their own alt.
let alts: Map<string, string> | null = null

async function catalogAlt(filename: string): Promise<string | undefined> {
  if (!alts) {
    const entries = await getCollection('photos')
    alts = new Map(entries.map((e) => [e.id, e.data.alt]))
  }
  return alts.get(filename)
}

/**
 * The alt text for a stored image reference: the inline override when the
 * editor wrote one, else the catalog entry for that file. '' when neither
 * exists — scripts/check-site.mjs fails the run on a content image that
 * renders with an empty alt, so a miss can't ship silently.
 */
export async function altFor(inline: string | undefined, ref: string | undefined): Promise<string> {
  if (inline) return inline
  if (!ref) return ''
  const alt = await catalogAlt(imageKey(ref))
  if (alt === undefined) console.warn(`[photos] no inline alt and no catalog entry for "${ref}"`)
  return alt ?? ''
}
