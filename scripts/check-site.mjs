// Post-build integrity check: crawls the built dist/ and fails (exit 1) on
//   1. internal <a href> links that don't resolve to a generated page,
//   2. content <img> with missing/empty alt (decorative icons are allow-listed),
//   3. missing public permalinks (URLs promised to the outside world),
//   4. meta descriptions that are missing, duplicated, or leaking Markdown.
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
const descriptions = new Map()

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf-8')

  // Every page needs its own description, free of Markdown syntax. A page that
  // passes none silently inherits the generic site tagline, and a hero lede
  // reused verbatim carries its `_emphasis_` markers into the search snippet.
  // Neither shows on the rendered page, so assert them here.
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1]
  if (!desc?.trim()) {
    errors.push(`missing description  ${file}`)
  } else {
    if (/(^|\s)[_*]\w|\w[_*]($|\s)|\[.+\]\(.+\)/.test(desc)) {
      errors.push(`markdown in description  ${file}  →  ${desc.slice(0, 70)}`)
    }
    const seen = descriptions.get(desc)
    if (seen) errors.push(`duplicate description  ${file}  ↔  ${seen}`)
    else descriptions.set(desc, file)
  }

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
    // An image is decorative only if it says so. `alt=""` *together with*
    // aria-hidden is an explicit declaration; `alt=""` on its own is far more
    // often an oversight, so it still fails. (data: URIs and the YouTube glyph
    // are allow-listed by source — both sit beside their own text label.)
    const declaredDecorative = /\baria-hidden="true"/.test(tag) && /\balt=""/.test(tag)
    if (declaredDecorative || src.startsWith('data:') || /yt_icon/.test(src)) continue
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

// robots.txt must match the target it was built for. Indexability is resolved
// through a fragile path (see resolveDeployEnv in src/config/site.ts), and
// getting it wrong has no symptom on the rendered site — production simply
// never gets indexed. Assert the emitted file rather than trusting the
// resolution.
const isProduction = (process.env.DEPLOY_ENV || '').toLowerCase() === 'production'
const robotsPath = `${DIST}/robots.txt`
if (!existsSync(robotsPath)) {
  errors.push('missing robots.txt')
} else {
  const robots = readFileSync(robotsPath, 'utf-8')
  if (isProduction) {
    if (!/^Allow: \/$/m.test(robots)) errors.push('robots.txt: production build is not indexable')
    if (!/^Sitemap: https?:\/\//m.test(robots)) errors.push('robots.txt: production build has no Sitemap line')
    for (const path of ['/keystatic', '/api/']) {
      if (!robots.includes(`Disallow: ${path}`)) errors.push(`robots.txt: production build does not disallow ${path}`)
    }
  } else if (!/^Disallow: \/$/m.test(robots)) {
    errors.push(`robots.txt: non-production build is indexable (DEPLOY_ENV=${process.env.DEPLOY_ENV || 'unset'})`)
  }
}

console.log(
  `Checked ${htmlFiles.length} pages, ${linkCount} internal links, ${imgCount} images, ` +
    `${descriptions.size} descriptions (base "${base}").`
)
if (errors.length) {
  console.error(`\n✗ ${errors.length} problem(s):`)
  for (const e of errors) console.error(`  ${e}`)
  process.exit(1)
}
console.log(
  '✓ All internal links resolve, all content images have alt text, ' +
    'every page has its own clean description, all public permalinks present.'
)
