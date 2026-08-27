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

// The catalog key for a stored image reference. The photo is the same file on disk
// either way, but what the CMS hands us depends on which client the build used:
//
//   ../../assets/images/church-life/sunset.jpg          a local build, i.e. the file's own value
//   https://assets.tina.io/<clientId>../../sunset.jpg   TinaCloud
//
// TinaCloud assumes media lives in *its* asset store, so it rewrites every reference
// to its CDN — gluing the stored relative path straight onto the client ID, missing
// slash and all. Our photos aren't there; they're in src/assets/images, where Astro's
// sharp pipeline needs them. So the rewrite has to be undone rather than followed.
//
// Both prefixes are stripped, then any `../`, then the mediaRoot, then leading
// slashes — leaving the catalog key. Deliberately tolerant: this is the third path
// shape the CMS has produced, every change of shape has been invisible until
// deployed, and a photo that fails to resolve doesn't error, it just disappears.
// Both of Tina's asset hosts are accepted: stored values carry assets.tina.io,
// but the SDK's own default host is assets.tinajs.io, so either could appear.
// Exported so the shapes can be asserted directly.
export function imageKey(ref: string): string {
  return ref
    .replace(/^https?:\/\/assets\.tina(?:js)?\.io\/[^/]*/, '')
    .replace(/^.*\.\.\//, '')
    .replace(/^.*assets\/images\//, '')
    .replace(/^\/+/, '')
}

export function imageFromRef(ref: string): (() => Promise<ImageModule>) | undefined {
  const loader = byPath.get(imageKey(ref))
  // A miss renders as a missing photo, not an error — <Photo> is optional almost
  // everywhere and PageHero silently falls back to its text-only header. Say so,
  // or the next path-shape change costs another live regression to notice.
  if (!loader) console.warn(`[images] no image for reference "${ref}" (looked up "${imageKey(ref)}")`)
  return loader
}
