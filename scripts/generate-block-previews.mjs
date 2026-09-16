// Thumbnails for the CMS block palette: one small picture of each block, taken from
// the block as it really renders on the site (tina/config.ts sets `visualSelector`,
// and each template's `ui.previewSrc` points here).
//
// This is the cropping half. The capture half needs a browser, so it is done by hand
// and its output is the input here:
//
//   1. `npm run build`, then serve the result:
//        (cd dist/client && python3 -m http.server 4399)
//   2. For every page named in `pages` in the rects file, in a browser at a 1280px-wide
//      viewport, load the page and run:
//
//        document.documentElement.classList.remove('reveal-ready')
//
//      Reveals are armed only by that class (src/styles/animations.css), so removing it
//      makes every section fully visible with no transition to wait on — which is what a
//      screenshot driver with a frozen animation clock needs, or the page captures blank.
//   3. Measure each block: for every `[data-tina-field*="blocks."]`, record
//      `getBoundingClientRect()` plus scroll offset as `[x, y, w, h]` in CSS pixels.
//   4. Save a full-page PNG per page as <shots>/<slug with / replaced by ->.png, and the
//      measurements as <shots>/../rects.json in the shape that file already has.
//
// Which block comes from which page is *derived*, not stored: the first page in
// src/content/pages that uses a template wins. So adding a template and running the
// capture again is enough — there is no second list to update.
//
// Usage: node scripts/generate-block-previews.mjs <shots-dir> <rects.json>
import { globSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import sharp from 'sharp'
import { parse as parseYaml } from 'yaml'
import { templates } from '../tina/templates.mjs'

const [shotsDir, rectsPath] = process.argv.slice(2)
if (!shotsDir || !rectsPath) {
  console.error('usage: node scripts/generate-block-previews.mjs <shots-dir> <rects.json>')
  process.exit(1)
}

const OUT = 'public/block-previews'

/** The palette renders a card 440px wide; double that keeps it sharp on a retina screen. */
const WIDTH = 880

/**
 * A card's image is `w-full h-auto`, so a tall block makes a tall card. Left uncapped the
 * palette became a 3000px scroll, which buries the blocks at the bottom — the opposite of
 * what a picker is for. 3:1 keeps the tallest card about 150px on screen, enough to read
 * the shape. A block shorter than that is used whole, which is most of them.
 */
const MAX_RATIO = 1 / 3

const { scale, pages } = JSON.parse(readFileSync(rectsPath, 'utf-8'))

/** The first page that uses each template, and the block's index on it. */
const firstUse = new Map()
for (const file of globSync('src/content/pages/**/*.mdx').sort()) {
  const frontmatter = readFileSync(file, 'utf-8').match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!frontmatter) continue
  const slug = file.replace('src/content/pages/', '').replace(/\.mdx$/, '')
  ;(parseYaml(frontmatter[1])?.blocks ?? []).forEach((block, index) => {
    if (!firstUse.has(block._template)) firstUse.set(block._template, { slug, index })
  })
}

mkdirSync(OUT, { recursive: true })
const missing = []

for (const template of templates) {
  const use = firstUse.get(template.name)
  if (!use) {
    missing.push(`${template.name}: no page uses it`)
    continue
  }
  const rect = pages[use.slug]?.[String(use.index)]
  if (!rect) {
    missing.push(`${template.name}: no rect captured for ${use.slug} block ${use.index}`)
    continue
  }

  const [x, y, w, h] = rect.map((n) => Math.round(n * scale))
  const shot = join(shotsDir, `${use.slug.replace(/\//g, '-')}.png`)
  const image = sharp(shot)
  const { width, height } = await image.metadata()

  // Clamp, so a rect measured against a slightly different render can't throw.
  const left = Math.max(0, Math.min(x, width - 1))
  const top = Math.max(0, Math.min(y, height - 1))
  const cropWidth = Math.min(w, width - left)
  const cropHeight = Math.min(h, Math.round(cropWidth * MAX_RATIO), height - top)

  const out = join(OUT, `${template.name}.webp`)
  await image
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize({ width: WIDTH })
    .webp({ quality: 80 })
    .toFile(out)
  console.log(`  ${basename(out).padEnd(26)} ${use.slug} block ${use.index}`)
}

if (missing.length) {
  console.error(`\ngenerate-block-previews: ${missing.length} template(s) without a preview:`)
  for (const line of missing) console.error(`  - ${line}`)
  process.exit(1)
}
console.log(`\ngenerate-block-previews: wrote ${templates.length} preview(s) to ${OUT}/.`)
