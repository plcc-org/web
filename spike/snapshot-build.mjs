// Reduces a built dist/ to one plain-text snapshot per page, so two builds can be
// compared with `diff`. Usage:
//
//   node spike/snapshot-build.mjs <dist-dir> <out-dir>
//
// Raw HTML is the wrong thing to diff. The two builds render the same content
// through different pipelines, so they legitimately differ in asset hashes, script
// bundles and the `data-tina-field` markers the editor needs — none of which a
// reader ever sees. What a reader *does* see is the title, the description, the
// headings, the words, the links and the images, so each page is reduced to those
// six signals and nothing else. A diff of the snapshots is therefore a diff of the
// site as experienced, and any hit is a real regression rather than noise to triage.
//
// Text is emitted one sentence per line and lists one item per line, so a diff
// points at the sentence that changed instead of repainting the paragraph.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'

const [distArg, outArg] = process.argv.slice(2)
if (!distArg || !outArg) {
  console.error('usage: node spike/snapshot-build.mjs <dist-dir> <out-dir>')
  process.exit(2)
}

// The Cloudflare adapter puts public pages under dist/client; adapterless static
// builds put them at the root. Accept either, and accept being pointed at either.
const DIST = existsSync(join(distArg, 'client')) ? join(distArg, 'client') : distArg
if (!existsSync(DIST)) {
  console.error(`✗ ${DIST} not found — build first.`)
  process.exit(1)
}

// The admin SPA is a prebuilt vendor bundle, not a page of the site.
const isAdminShell = (f) => f === 'admin/index.html' || f.startsWith('admin/')

const pages = readdirSync(DIST, { recursive: true })
  .filter((f) => typeof f === 'string' && f.endsWith('.html') && !isAdminShell(f))
  .sort()

const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')

// Astro fingerprints emitted assets (`hero.CxK1w9_a.webp`). The bytes and the
// transform are what matter, not the hash, and the hash moves whenever anything
// upstream of it does — so collapse it rather than reporting 86 false positives.
const unhash = (s) => s.replace(/\.[A-Za-z0-9_-]{8,}\.(webp|avif|png|jpe?g|svg|css|js)\b/g, '.[hash].$1')

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`, 'i')) || tag.match(new RegExp(`\\b${name}='([^']*)'`, 'i'))
  return m ? decode(m[1]) : undefined
}

const text = (html) =>
  decode(
    html
      .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim()

// One sentence per line. A page is mostly prose, and a paragraph-per-line diff
// reports the whole paragraph when a single clause moves.
const sentences = (s) =>
  s
    .split(/(?<=[.!?…])\s+(?=[A-Z“"'(\d])/)
    .map((t) => t.trim())
    .filter(Boolean)

rmSync(outArg, { recursive: true, force: true })

let imgCount = 0
let linkCount = 0

for (const file of pages) {
  const html = readFileSync(join(DIST, file), 'utf-8')
  const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, html])[1]

  const out = []
  out.push(`TITLE ${decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1]).trim()}`)
  out.push(`DESC  ${attr(html.match(/<meta\s+name="description"[^>]*>/i)?.[0] ?? '', 'content') ?? ''}`)

  out.push('', '## headings')
  for (const m of body.matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    out.push(`${m[1].toUpperCase()} ${text(m[2])}`)
  }

  out.push('', '## links')
  for (const m of body.matchAll(/<a\b[^>]*>/gi)) {
    const href = attr(m[0], 'href')
    if (href === undefined) continue
    linkCount++
    out.push(href)
  }

  out.push('', '## images')
  for (const m of body.matchAll(/<(?:img|source)\b[^>]*>/gi)) {
    const src = attr(m[0], 'src') ?? attr(m[0], 'srcset') ?? ''
    if (!src) continue
    if (m[0].startsWith('<img')) imgCount++
    // srcset carries every generated width; keep the widths, drop the hashes.
    const refs = unhash(src)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .join(' | ')
    const alt = attr(m[0], 'alt')
    out.push(alt === undefined ? refs : `${refs}  alt="${alt}"`)
  }

  out.push('', '## text')
  out.push(...sentences(text(body)))

  const dest = join(outArg, `${file.replace(/\/index\.html$/, '').replace(/\.html$/, '') || 'index'}.txt`)
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, out.join('\n') + '\n')
}

console.log(`${outArg}: ${pages.length} pages, ${linkCount} links, ${imgCount} images`)
