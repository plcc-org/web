import type { ImageMetadata } from 'astro'

type ImageModule = { default: ImageMetadata }

// CMS page-block images, indexed recursively by path relative to assets/images
// (e.g. "church-life/sunset.jpg"). Tina uploads flat, so today every key is a
// bare filename; the recursion is tolerance for a legacy nested key, which must
// degrade to a missing photo rather than resolve somewhere else (pinned in
// test/image-ref.test.ts). The MDX block wrappers resolve their stored
// reference ("…/assets/images/<key>") through imageFromRef so CMS-uploaded
// photos get the same build-time optimization as the rest of the site.
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

// The stored-form path for an already-resolved image, for the one context that
// must serve the unoptimised file: the /tina-island preview (see the fallback in
// src/components/Photo.astro). `/assets/images/<key>` is served by
// tinaAssetsDevPlugin in dev and by the generated CDN redirect in production
// (scripts/generate-redirects.mjs), so resolving back to it works for any photo
// in the library — including one an editor just picked that no page references
// yet. Eager: this imports the metadata modules (a filename and dimensions
// each), not the image bytes, which stay behind the lazy loaders above.
const eagerModules = import.meta.glob<ImageModule>('../assets/images/**/*.{jpg,jpeg,png,webp,avif}', { eager: true })
const keyBySrc = new Map<string, string>()
for (const [path, mod] of Object.entries(eagerModules)) {
  keyBySrc.set(mod.default.src, path.replace('../assets/images/', ''))
}

export function assetPath(image: ImageMetadata): string | undefined {
  const key = keyBySrc.get(image.src)
  return key ? `assets/images/${key}` : undefined
}

export function imageFromRef(ref: string): (() => Promise<ImageModule>) | undefined {
  const loader = byPath.get(imageKey(ref))
  // A miss renders as a missing photo, not an error — <Photo> is optional almost
  // everywhere and PageHero silently falls back to its text-only header. Say so,
  // or the next path-shape change costs another live regression to notice.
  if (!loader) console.warn(`[images] no image for reference "${ref}" (looked up "${imageKey(ref)}")`)
  return loader
}
