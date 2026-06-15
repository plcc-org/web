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
