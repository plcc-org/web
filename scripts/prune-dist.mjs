// Remove image assets that were emitted into dist/ but that nothing serves.
//
// `src/lib/images.ts` registers every file in src/assets/images through
// `import.meta.glob`, so the whole photo library enters the module graph — which
// is what makes a photo selectable by filename, and what lets the CMS's block
// images resolve. Vite emits an original for each registered image whether or
// not a page ever renders it, so the deploy carries the entire library at full
// size alongside the optimized variants it actually uses.
//
// Astro's own `image()` collection helper doesn't behave this way (leadership
// portraits emit webp variants only), but it applies to frontmatter fields, and
// most of these images are referenced from MDX block props, which no schema
// validates. So the glob stays and the emitted originals are pruned here.
//
// Deciding by reference is safe because every public page is prerendered: the
// built output is a complete description of what the site can serve — with one
// exception, which is why this script knows about the CMS at all.
//
// The CMS preview re-renders a region through /tina-island, the one on-demand
// route. It cannot use <Image> (see the note in src/components/Photo.astro), so
// it points at the unoptimised original instead — a file that appears in no
// HTML and would therefore be pruned as unreferenced. The preview would then
// show broken images while the live pages stayed perfect.
//
// So when the editor ships, the originals behind CMS page images are kept too.
// That is ~12 MB for 48 images, spent only where somebody is editing: with
// TINA_PUBLISH_ADMIN unset there is no deployed editor, nothing requests the
// island, and the originals go as before.
//
// Runs automatically after `npm run build` (see the `postbuild` script), so
// Cloudflare gets the pruned output too.

import { readdirSync, readFileSync, existsSync, statSync, unlinkSync } from 'node:fs'
import { join, extname } from 'node:path'

const DIST = existsSync('dist/client') ? 'dist/client' : 'dist'
const ASSETS = join(DIST, '_astro')
if (!existsSync(ASSETS)) {
  console.log('prune-dist: no _astro directory — nothing to do.')
  process.exit(0)
}

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'])
// Anything that can name an asset: markup, styles, scripts, the manifest, feeds.
const REFERENCING_EXT = new Set(['.html', '.css', '.js', '.mjs', '.json', '.webmanifest', '.xml', '.txt'])

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(path))
    else out.push(path)
  }
  return out
}

const allFiles = walk(DIST)
const referencingFiles = allFiles.filter((f) => REFERENCING_EXT.has(extname(f).toLowerCase()))
const haystack = referencingFiles.map((f) => readFileSync(f, 'utf-8')).join('\n')

// Guard against pruning everything if a build produced no markup: without this,
// a broken build would look exactly like "nothing is referenced".
const htmlCount = allFiles.filter((f) => f.endsWith('.html')).length
if (htmlCount === 0) {
  console.error('prune-dist: no HTML in the build output — refusing to prune.')
  process.exit(1)
}

// Stems ("hero" from "hero.jpg") of every photo a CMS page references, so their
// emitted originals survive for the preview. Empty unless the editor ships.
const previewStems = new Set()
if (process.env.TINA_PUBLISH_ADMIN === 'true' && existsSync('src/content/pages')) {
  for (const f of readdirSync('src/content/pages', { recursive: true })) {
    if (typeof f !== 'string' || !f.endsWith('.mdx')) continue
    const text = readFileSync(join('src/content/pages', f), 'utf-8')
    for (const m of text.matchAll(/image:\s*"?([^"\n,}]+\.(?:jpg|jpeg|png|webp))"?/gi)) {
      const base = m[1].trim().split('/').pop()
      previewStems.add(base.slice(0, base.lastIndexOf('.')))
    }
  }
}
const neededForPreview = (name) => {
  const dot = name.indexOf('.')
  return dot > 0 && previewStems.has(name.slice(0, dot))
}

let removed = 0
let bytes = 0
let forPreview = 0
const kept = []
for (const name of readdirSync(ASSETS)) {
  if (!IMAGE_EXT.has(extname(name).toLowerCase())) continue
  if (haystack.includes(name)) {
    kept.push(name)
    continue
  }
  if (neededForPreview(name)) {
    kept.push(name)
    forPreview++
    continue
  }
  const path = join(ASSETS, name)
  bytes += statSync(path).size
  unlinkSync(path)
  removed++
}

const mb = (bytes / 1048576).toFixed(1)
const preview = forPreview ? ` ${forPreview} of those kept for the CMS preview.` : ''
console.log(
  removed === 0
    ? `prune-dist: nothing to remove (${kept.length} image assets, all referenced).${preview}`
    : `prune-dist: removed ${removed} unreferenced image asset(s), ${mb} MB. ${kept.length} kept.${preview}`
)
