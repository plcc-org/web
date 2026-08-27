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
//
// A link to something the church simply has — its podcast, its giving page —
// has no date at which it stops being true, and inventing one just produces a
// review that always ends in "yes, still". Those are marked `permanent: true`
// instead. It's deliberately the harder thing to type: the default is a date.

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { parse } from 'yaml'

// The per-entry rules live next to the CMS config so the editor can run them in the
// form, where they're useful, rather than only here, where an editor never sees them.
// Everything needing more than one entry at a time — duplicate addresses, the review
// warnings below — stays in this file, because it's the only thing that reads them all.
//
// A shortcut is temporary on purpose. Browsers cache a 301 more or less forever, so if
// plcc.org/camp were permanent, everyone who followed it once would keep landing on
// this year's registration after next year's replaced it — and nobody would be able to
// tell us, because their browser would never ask the server again. 302 keeps the short
// link ours to re-point. 301 is right only when a page has genuinely moved for good,
// where passing search ranking to the new URL is the point.
import { STATUS, toPath, checkFrom, checkDestination, checkReview, parseReviewDate } from '../tina/short-link-rules.mjs'

const SOURCE_DIR = 'src/content/short-links'
const OUT = 'public/_redirects'

/**
 * "Gone" can't be a redirect rule: Cloudflare only permits 200/301/302/303/307/308
 * in `_redirects` (PERMITTED_STATUS_CODES in wrangler), so a 410 needs a real
 * route — one the Worker actually serves. Middleware doesn't work here: on
 * Workers Assets the asset layer answers unmatched paths with 404.html without
 * ever invoking the Worker, so middleware never sees them. (It does in `astro
 * dev`, where everything goes through Astro, which is a good way to be misled.)
 *
 * One route per path, rather than a single `[gone].ts` handling them all: a
 * dynamic route matches every single-segment path, so it takes over the styled
 * 404 as well — a mistyped /vist returns an empty body instead of the page
 * offering Home and I'm New. (Deep paths still get the real 404, which makes
 * the breakage inconsistent too.) A catch-all could serve 404.html back through
 * Cloudflare's ASSETS binding, but that's runtime-specific plumbing plus a dev
 * fallback; worth it past roughly ten entries, not for a handful.
 *
 * So each "gone" entry becomes a tiny generated route. They're committed rather
 * than gitignored so `astro check` and code review can see them, and they carry
 * a marker so this script can find and remove its own leftovers.
 */
const PAGES_DIR = 'src/pages'
const GONE_MARKER = '@generated-gone-route'

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

  const { from, destination, kind = 'shortcut', note, expires, permanent = false } = entry
  const isGone = kind === 'gone'

  // The per-entry rules, in the same order the form presents them.
  const problem = checkFrom(from) ?? checkDestination(destination, kind) ?? checkReview(permanent, expires)
  if (problem) {
    errors.push(`${where}: ${problem}`)
    continue
  }

  // Everything below needs the other entries, so it can only happen here.
  const path = toPath(from)
  if (seen.has(path)) {
    errors.push(`${where}: "${path}" is already defined in ${seen.get(path)}`)
    continue
  }

  const reviewBy = parseReviewDate(expires)
  let status_note = ''
  if (reviewBy) {
    const daysLeft = Math.round((reviewBy - today) / 86_400_000)
    if (daysLeft < 0) {
      warnings.push(`/${path} passed its review date ${-daysLeft} day(s) ago — still redirecting. ${where}`)
      status_note = ` (review date passed ${-daysLeft}d ago)`
    } else if (daysLeft <= SOON_DAYS) {
      warnings.push(`/${path} is due for review in ${daysLeft} day(s). ${where}`)
    }
  }

  seen.set(path, where)

  if (isGone) {
    gone.push({ path, note, expires, permanent })
    continue
  }

  const status = STATUS[kind]
  rules.push(permanent ? '# permanent — no review date' : `# review by ${expires}${status_note}`)
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
for (const { path, note, expires, permanent } of gone) {
  const full = join(PAGES_DIR, `${path}.ts`)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(
    full,
    [
      `// ${GONE_MARKER} — generated from src/content/short-links, do not edit.`,
      `// /${path} is gone for good (${permanent ? 'permanent' : `review by ${expires}`}).`,
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

// CMS media fallback. Stored photo refs are `/assets/images/<file>`, but the bytes
// live in src/assets/images for Astro's sharp pipeline, and nothing serves them at
// that path in production — only the deployed admin asks for it (field thumbnails
// for refs TinaCloud's resolver leaves un-rewritten, and the /tina-island preview's
// unoptimised fallback in src/components/Photo.astro). TinaCloud mirrors repo media
// at its CDN, so send the request there. 302, because the CDN host is theirs to
// change. Gated on the client ID because the URL needs it: absent credentials (CI,
// a fresh clone) there is no deployed admin and no rule. tinaAssetsDevPlugin in
// astro.config.mjs is this rule's dev-server counterpart. Media uploads are flat,
// so the splat is always a bare filename.
const clientId = process.env.PUBLIC_TINA_CLIENT_ID
if (clientId) {
  rules.push('# CMS media — see the note in scripts/generate-redirects.mjs.')
  rules.push(`/assets/images/* https://assets.tina.io/${clientId}/:splat 302`)
  rules.push('')
}

mkdirSync('public', { recursive: true })
const header = [
  '# Generated from src/content/short-links — do not edit.',
  '# Add or change these in the CMS at /admin, under "Short links".',
  '',
]
writeFileSync(OUT, [...header, ...rules].join('\n'))
for (const w of warnings) console.warn(`  ! ${w}`)
console.log(
  `generate-redirects: wrote ${seen.size - gone.length} redirect(s) to ${OUT}` +
    (gone.length ? ` and ${gone.length} gone route(s)` : '') +
    (warnings.length ? ` (${warnings.length} need review).` : '.')
)
