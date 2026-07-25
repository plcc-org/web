// Turn the "Short links" collection into a Cloudflare `_redirects` file.
//
// Staff hand out URLs like plcc.org/camp on printed flyers and from the
// platform, and they point at Church Center pages whose IDs are long, ugly and
// not stable year to year. The short link is the durable thing; the destination
// behind it changes.
//
// These are edge redirects, not pages: Cloudflare's asset layer reads
// `_redirects` and answers before anything else runs, so there's no HTML
// document, no render, and no flash of a redirect page. `@astrojs/cloudflare`
// reads this file at build and appends its own rules to it, so writing it here
// composes rather than conflicts.
//
// Written to public/ during `prebuild`, so `astro build` copies it into the
// deploy the same way it copies anything else in public/. It's generated, so
// it's gitignored — the collection in src/content/short-links is the source of
// truth, and a committed copy would only ever drift from it.
//
// Nothing renders these, so this script is also where they get validated.
//
// Every link carries a review date. An expired link still redirects — a URL on a
// printed flyer doesn't stop existing because a date passed, and silently 404ing
// it would be a worse failure than letting it run on. The date exists so the list
// stays reviewable: without one, nobody deletes anything, because nobody
// remembers what it was for.

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { parse } from 'yaml'

const SOURCE_DIR = 'src/content/short-links'
const OUT = 'public/_redirects'

/**
 * A shortcut is temporary on purpose. Browsers cache a 301 more or less
 * forever, so if plcc.org/camp were permanent, everyone who followed it once
 * would keep landing on this year's registration after next year's replaced it
 * — and nobody would be able to tell us, because their browser would never ask
 * the server again. 302 keeps the short link ours to re-point.
 *
 * 301 is right only when a page has genuinely moved for good, where passing
 * search ranking to the new URL is the point.
 */
const STATUS = { shortcut: 302, moved: 301 }

/**
 * "Gone" can't be a redirect rule: Cloudflare only permits 200/301/302/303/307/308
 * in `_redirects` (PERMITTED_STATUS_CODES in wrangler), so a 410 needs a real
 * route — one the Worker actually serves. Middleware doesn't work here: on
 * Workers Assets the asset layer answers unmatched paths with 404.html without
 * ever invoking the Worker, so middleware never sees them. (It does in `astro
 * dev`, where everything goes through Astro, which is a good way to be misled.)
 *
 * So each "gone" entry becomes a tiny generated route. They're committed rather
 * than gitignored so `astro check` and code review can see them, and they carry
 * a marker so this script can find and remove its own leftovers.
 */
const PAGES_DIR = 'src/pages'
const GONE_MARKER = '@generated-gone-route'

/** Reserved because a short link that shadows one of these would hide real content. */
const RESERVED = new Set(['_astro', '_headers', '_redirects', 'api', 'keystatic', 'robots.txt', 'sitemap-index.xml'])

if (!existsSync(SOURCE_DIR)) {
  console.log('generate-redirects: no short-links collection — nothing to do.')
  process.exit(0)
}

const errors = []
const warnings = []
const seen = new Map()
const rules = []
const gone = []

const today = new Date()
today.setHours(0, 0, 0, 0)
const SOON_DAYS = 30

for (const file of readdirSync(SOURCE_DIR).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))) {
  const where = `${SOURCE_DIR}/${file}`
  let entry
  try {
    entry = parse(readFileSync(join(SOURCE_DIR, file), 'utf-8'))
  } catch (err) {
    errors.push(`${where}: not valid YAML — ${err.message}`)
    continue
  }
  if (!entry || typeof entry !== 'object') {
    errors.push(`${where}: empty`)
    continue
  }

  const { from, destination, kind = 'shortcut', note, expires } = entry
  const isGone = kind === 'gone'

  // The old address is an explicit field rather than the filename: cutover
  // redirects carry several path segments ("/connect/about/leadership-team/"),
  // which a filename can't hold.
  if (typeof from !== 'string' || !from.startsWith('/')) {
    errors.push(`${where}: "from" must be the old address, starting with a slash`)
    continue
  }
  const path = from.toLowerCase().replace(/^\/+/, '').replace(/\/+$/, '')
  if (!/^[a-z0-9][a-z0-9\-/]*$/.test(path)) {
    errors.push(`${where}: "${from}" must be lowercase letters, numbers, hyphens and slashes`)
    continue
  }
  if (RESERVED.has(path.split('/')[0])) {
    errors.push(`${where}: "/${path}" starts with a path reserved by the site itself`)
    continue
  }
  if (!isGone) {
    const external = /^https?:\/\//i.test(destination ?? '')
    if (typeof destination !== 'string' || !(external || destination.startsWith('/'))) {
      errors.push(`${where}: "destination" must be a full https:// address or a path on this site starting with /`)
      continue
    }
    if (!(kind in STATUS)) {
      errors.push(`${where}: "kind" must be one of ${[...Object.keys(STATUS), 'gone'].join(', ')}`)
      continue
    }
  }
  if (seen.has(path)) {
    errors.push(`${where}: "${path}" is already defined in ${seen.get(path)}`)
    continue
  }

  // Required, so the list can't quietly grow a tail of links nobody owns.
  const reviewBy = expires ? new Date(`${expires}T00:00:00Z`) : null
  if (!reviewBy || Number.isNaN(reviewBy.getTime())) {
    errors.push(`${where}: needs a "Review by" date (YYYY-MM-DD)`)
    continue
  }
  const daysLeft = Math.round((reviewBy - today) / 86_400_000)
  let status_note = ''
  if (daysLeft < 0) {
    warnings.push(`/${path} passed its review date ${-daysLeft} day(s) ago — still redirecting. ${where}`)
    status_note = ` (review date passed ${-daysLeft}d ago)`
  } else if (daysLeft <= SOON_DAYS) {
    warnings.push(`/${path} is due for review in ${daysLeft} day(s). ${where}`)
  }

  seen.set(path, where)

  if (isGone) {
    gone.push({ path, note, expires })
    continue
  }

  const status = STATUS[kind]
  rules.push(`# review by ${expires}${status_note}`)
  if (note) rules.push(`# ${note.replace(/\s+/g, ' ').trim()}`)
  // Both forms: Cloudflare matches the literal path, and people type — and
  // printed material carries — the trailing slash about half the time.
  rules.push(`/${path} ${destination} ${status}`)
  rules.push(`/${path}/ ${destination} ${status}`)
  rules.push('')
}

if (errors.length) {
  console.error(`✗ generate-redirects: ${errors.length} problem(s):`)
  for (const e of errors) console.error(`  ${e}`)
  process.exit(1)
}

// Clear out previously generated routes by looking for the marker, rather than
// trusting a manifest to have stayed accurate. A removed collection entry can't
// leave a stale 410 behind.
for (const file of readdirSync(PAGES_DIR, { recursive: true })) {
  if (typeof file !== 'string' || !file.endsWith('.ts')) continue
  const full = join(PAGES_DIR, file)
  if (readFileSync(full, 'utf-8').includes(GONE_MARKER)) rmSync(full)
}
for (const { path, note, expires } of gone) {
  const full = join(PAGES_DIR, `${path}.ts`)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(
    full,
    [
      `// ${GONE_MARKER} — generated from src/content/short-links, do not edit.`,
      `// /${path} is gone for good (review by ${expires}).`,
      note ? `// ${note.replace(/\s+/g, ' ').trim()}` : null,
      ``,
      `export const prerender = false`,
      `export const GET = () => new Response(null, { status: 410 })`,
      ``,
    ]
      .filter((l) => l !== null)
      .join('\n')
  )
}

mkdirSync('public', { recursive: true })
const header = [
  '# Generated from src/content/short-links — do not edit.',
  '# Add or change these in Keystatic under "Short links".',
  '',
]
writeFileSync(OUT, [...header, ...rules].join('\n'))
for (const w of warnings) console.warn(`  ! ${w}`)
console.log(
  `generate-redirects: wrote ${seen.size - gone.length} redirect(s) to ${OUT}` +
    (gone.length ? ` and ${gone.length} gone route(s)` : '') +
    (warnings.length ? ` (${warnings.length} need review).` : '.')
)
