import type { ImageMetadata } from 'astro'

// Map every image in src/assets/images by filename so `<Photo filename="…">`
// (used for page-literal images such as Split heroes and logos) resolves to an
// importer. Loaders are passed straight to <Image> so Astro's image service
// manages them — only rendered images are emitted, as optimized variants (no
// original-file dead weight). The `leadership` content collection references
// its portraits via the image() schema helper instead of this map.
type ImageModule = { default: ImageMetadata }

const loaders = import.meta.glob<ImageModule>('../assets/images/*.{jpg,jpeg,png,webp,avif}')

const byFilename = new Map<string, () => Promise<ImageModule>>()
for (const [path, loader] of Object.entries(loaders)) {
  const name = path.split('/').pop()
  if (name) byFilename.set(name, loader)
}

export function imageLoader(filename: string): (() => Promise<ImageModule>) | undefined {
  return byFilename.get(filename)
}

// CMS page-block images. The CMS nests an entry's uploads under
// src/assets/images/<page-slug>/…, so we also index every image recursively by
// its path relative to assets/images (e.g. "church-life/sunset"). The MDX
// block wrappers resolve their stored reference ("…/assets/images/<key>")
// through imageFromRef so CMS-uploaded photos get the same build-time
// optimization as the rest of the site.
const allLoaders = import.meta.glob<ImageModule>('../assets/images/**/*.{jpg,jpeg,png,webp,avif}')
const byPath = new Map<string, () => Promise<ImageModule>>()
for (const [path, loader] of Object.entries(allLoaders)) {
  byPath.set(path.replace('../assets/images/', ''), loader)
}

// The catalog key for a stored image reference. The CMS hands us two different
// shapes for the same photo, and both have to resolve:
//
//   ../../assets/images/visit/hero/image.jpg   what a local build reads from the file
//   /visit/hero/image.jpg                      what TinaCloud returns
//
// TinaCloud normalises media paths against `media.tina.mediaRoot` ('assets/images'),
// so the prefix this used to strip simply isn't there, and the leading slash meant
// every lookup missed. That is a deployed-only failure: locally the raw file value
// resolves fine, so every hero on the site rendered its photo in dev and its
// text-only fallback in production, with nothing failing. Exported for testing.
export function imageKey(ref: string): string {
  return ref.replace(/^.*assets\/images\//, '').replace(/^\/+/, '')
}

export function imageFromRef(ref: string): (() => Promise<ImageModule>) | undefined {
  const loader = byPath.get(imageKey(ref))
  // A miss renders as a missing photo, not an error — <Photo> is optional almost
  // everywhere and PageHero silently falls back to its text-only header. Say so,
  // or the next path-shape change costs another live regression to notice.
  if (!loader) console.warn(`[images] no image for reference "${ref}" (looked up "${imageKey(ref)}")`)
  return loader
}
