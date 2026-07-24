import type { ImageMetadata } from 'astro'

// Map every image in src/assets/images by filename so `<Photo filename="…">`
// (used for page-literal images such as Split heroes and logos) resolves to an
// importer. Loaders are passed straight to <Image> so Astro's image service
// manages them — only rendered images are emitted, as optimized variants (no
// original-file dead weight). The `gallery` content collection references its
// images via the image() schema helper instead of this map.
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

// CMS page-block images. Keystatic nests an entry's uploads under
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

export function imageFromRef(ref: string): (() => Promise<ImageModule>) | undefined {
  return byPath.get(ref.replace(/^.*assets\/images\//, ''))
}
