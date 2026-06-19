// Post-build integrity check: crawls the built dist/ and fails (exit 1) on
//   1. internal <a href> links that don't resolve to a generated page,
//   2. content <img> with missing/empty alt (decorative icons are allow-listed),
//   3. missing public permalinks (URLs promised to the outside world).
// Run after `npm run build`:  node scripts/check-site.mjs

import { readdirSync, readFileSync, existsSync } from 'node:fs'

// The Cloudflare adapter emits prerendered public pages under dist/client (with
// the server bundle in dist/server). Fall back to plain dist/ for adapterless
// static builds.
const DIST = existsSync('dist/client') ? 'dist/client' : 'dist'
if (!existsSync(DIST)) {
  console.error('✗ dist/ not found — run `npm run build` first.')
  process.exit(1)
}

const htmlFiles = readdirSync(DIST, { recursive: true })
  .filter((f) => typeof f === 'string' && f.endsWith('.html'))
  .map((f) => `${DIST}/${f}`)

// Astro's `base` prefixes URLs in the HTML but not the dist folder layout, so
// detect it (e.g. '/' or '/plcc-web/') and strip it before resolving to files.
let base = '/'
for (const f of htmlFiles) {
  const m = readFileSync(f, 'utf-8').match(/(?:href|src)="(\/[^"]*?)_astro\//)
  if (m) {
    base = m[1]
    break
  }
}

const stripBase = (href) => (base !== '/' && href.startsWith(base) ? href.slice(base.length) : href.replace(/^\//, ''))

const resolves = (p) => {
  if (p === '') return existsSync(`${DIST}/index.html`)
  const candidates = p.endsWith('/') ? [`${p}index.html`] : [p, `${p}/index.html`, `${p}.html`]
  return candidates.some((c) => existsSync(`${DIST}/${c}`))
}

const errors = []
let linkCount = 0
let imgCount = 0

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf-8')

  for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)) {
    const href = m[1]
    if (/^(https?:|mailto:|tel:|#)/i.test(href) || !href.startsWith('/')) continue
    linkCount++
    const p = stripBase(href.split(/[?#]/)[0])
    if (!resolves(p)) errors.push(`broken link  ${file}  →  ${href}`)
  }

  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0]
    const src = (tag.match(/\bsrc="([^"]*)"/) || [])[1] || ''
    const decorative = src.startsWith('data:') || /yt_icon/.test(src) // IG glyph + YouTube icon sit beside text labels
    if (decorative) continue
    imgCount++
    const alt = tag.match(/\balt="([^"]*)"/)
    if (!alt) errors.push(`img missing alt  ${file}  →  ${src.slice(0, 60)}`)
    else if (!alt[1].trim()) errors.push(`img empty alt  ${file}  →  ${src.slice(0, 60)}`)
  }
}

// URLs we've promised the outside world, each annotated with where it's used.
// Off-site references point at the bare URL, so the broken-link crawler above
// can't catch a silent rename — assert them here. Add an entry ONLY when a URL
// is referenced somewhere outside this site (and say where); ordinary internal
// pages are already guarded by the crawler and must not be listed here.
const externalPermalinks = [
  { route: '', used: 'yard sign + building signage, printed bulletin, social profiles, Google Business listing' },
]
for (const { route } of externalPermalinks) {
  if (!existsSync(`${DIST}/${route ? `${route}/` : ''}index.html`)) errors.push(`missing public permalink  /${route}`)
}

console.log(`Checked ${htmlFiles.length} pages, ${linkCount} internal links, ${imgCount} images (base "${base}").`)
if (errors.length) {
  console.error(`\n✗ ${errors.length} problem(s):`)
  for (const e of errors) console.error(`  ${e}`)
  process.exit(1)
}
console.log('✓ All internal links resolve, all content images have alt text, all public permalinks present.')
