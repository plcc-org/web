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

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
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

/** Reserved because a short link that shadows one of these would hide real content. */
const RESERVED = new Set(['_astro', '_headers', '_redirects', 'api', 'keystatic', 'robots.txt', 'sitemap-index.xml'])

if (!existsSync(SOURCE_DIR)) {
  console.log('generate-redirects: no short-links collection — nothing to do.')
  process.exit(0)
}

const errors = []
const seen = new Map()
const rules = []

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

  // The filename is the short link. Keystatic names the file from the slug
  // field, so what an editor types is what the URL becomes.
  const path = file.replace(/\.ya?ml$/, '').toLowerCase()
  const { destination, kind = 'shortcut', note } = entry

  if (!/^[a-z0-9][a-z0-9-]*$/.test(path)) {
    errors.push(`${where}: "${path}" must be lowercase letters, numbers and hyphens (it becomes plcc.org/${path})`)
    continue
  }
  if (RESERVED.has(path)) {
    errors.push(`${where}: "${path}" is reserved by the site itself`)
    continue
  }
  if (typeof destination !== 'string' || !/^https?:\/\//i.test(destination)) {
    errors.push(`${where}: "destination" must be a full URL starting http:// or https://`)
    continue
  }
  if (!(kind in STATUS)) {
    errors.push(`${where}: "kind" must be one of ${Object.keys(STATUS).join(', ')}`)
    continue
  }
  if (seen.has(path)) {
    errors.push(`${where}: "${path}" is already defined in ${seen.get(path)}`)
    continue
  }
  seen.set(path, where)

  const status = STATUS[kind]
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

mkdirSync('public', { recursive: true })
const header = [
  '# Generated from src/content/short-links — do not edit.',
  '# Add or change these in Keystatic under "Short links".',
  '',
]
writeFileSync(OUT, [...header, ...rules].join('\n'))
console.log(`generate-redirects: wrote ${seen.size} short link(s) to ${OUT}.`)
