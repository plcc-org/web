// Compares the production build against the Tina build and reports what a reader
// would notice. Usage:
//
//   node spike/compare-builds.mjs                       # summary
//   node spike/compare-builds.mjs --detail              # plus a unified diff per page
//   node spike/compare-builds.mjs --detail visit kids   # only those pages
//   node spike/compare-builds.mjs --baseline ../elsewhere/dist
//
// Both builds are reduced by spike/snapshot-build.mjs to six per-page signals —
// title, description, headings, links, images, text — and the snapshots are what
// gets compared. See that file for why raw HTML is the wrong thing to diff.
//
// Exits 1 if anything differs, so it can gate a merge.

import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

const args = process.argv.slice(2)
const detail = args.includes('--detail')
const only = args.filter(
  (a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--baseline' && args[args.indexOf(a) - 1] !== '--tina'
)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}

const run = (cmd, argv) => execFileSync(cmd, argv, { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 })

// The baseline lives in its own worktree beside the main checkout, so that its
// node_modules can hold the dependencies this branch removed. Resolve it from git
// rather than from the cwd: this branch is itself usually checked out in a worktree
// nested under .claude/, where a relative "../" points somewhere else entirely.
const mainRoot = dirname(run('git', ['rev-parse', '--path-format=absolute', '--git-common-dir']).trim())
const BASELINE = opt('baseline', join(dirname(mainRoot), 'plcc-web-baseline', 'dist'))
const TINA = opt('tina', 'dist')
const OUT = 'spike/.compare'

for (const [dist, name] of [
  [BASELINE, 'baseline'],
  [TINA, 'tina'],
]) {
  if (!existsSync(dist)) {
    console.error(`✗ ${name}: ${dist} not found.`)
    console.error(
      name === 'baseline'
        ? '  Build it with:  (cd ../plcc-web-baseline && npm run build)'
        : '  Build it with:  npm run build:tina'
    )
    process.exit(2)
  }
  process.stdout.write('  ')
  console.log(run('node', ['spike/snapshot-build.mjs', dist, join(OUT, name)]).trim())
}

const list = (dir) =>
  readdirSync(dir, { recursive: true })
    .filter((f) => typeof f === 'string' && f.endsWith('.txt'))
    .sort()

const a = list(join(OUT, 'baseline'))
const b = list(join(OUT, 'tina'))
const shared = a.filter((f) => b.includes(f))

// A page that exists on one side only is the loudest possible regression, so it is
// reported before any content comparison and never folded into a per-page diff.
const removed = a.filter((f) => !b.includes(f))
const added = b.filter((f) => !a.includes(f))

console.log()
for (const f of removed) console.log(`✗ MISSING in tina build   /${f.replace(/\.txt$/, '')}`)
for (const f of added) console.log(`+ new in tina build       /${f.replace(/\.txt$/, '')}`)

// Which of the five sections a page's differences fall in. Reported separately
// because they carry very different weight: a link or image difference is almost
// always a defect, while a text difference is often a deliberate copy edit.
const SECTIONS = ['title/desc', 'headings', 'links', 'images', 'text']

// Which section each line of a snapshot belongs to, by line number. A changed line
// has to be attributed from this rather than from the hunk it appears in — a hunk
// starting mid-section carries no `## ` marker of its own, which would silently
// file every difference under the first section.
const sectionMap = (text) => {
  let section = SECTIONS[0]
  return text.split('\n').map((line) => {
    if (line.startsWith('## ')) section = line.slice(3).trim()
    return section
  })
}

const changed = []
for (const f of shared) {
  const pa = join(OUT, 'baseline', f)
  const pb = join(OUT, 'tina', f)
  const ta = readFileSync(pa, 'utf-8')
  const tb = readFileSync(pb, 'utf-8')
  if (ta === tb) continue

  let raw = ''
  try {
    run('diff', ['-u', pa, pb])
  } catch (e) {
    raw = e.stdout ?? ''
  }

  const [ma, mb] = [sectionMap(ta), sectionMap(tb)]
  const hit = new Set()
  let [lineA, lineB] = [0, 0]
  for (const line of raw.split('\n')) {
    const hunk = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
    if (hunk) {
      // Unified-diff line numbers are 1-based; the maps are 0-based.
      lineA = Number(hunk[1]) - 1
      lineB = Number(hunk[2]) - 1
      continue
    }
    if (line.startsWith('---') || line.startsWith('+++')) continue
    if (line.startsWith('-')) {
      if (line.slice(1).trim()) hit.add(ma[lineA])
      lineA++
    } else if (line.startsWith('+')) {
      if (line.slice(1).trim()) hit.add(mb[lineB])
      lineB++
    } else {
      lineA++
      lineB++
    }
  }
  changed.push({ page: `/${f.replace(/\.txt$/, '')}`, file: f, sections: [...hit], raw })
}

console.log()
if (!changed.length && !removed.length && !added.length) {
  console.log(`✓ ${shared.length} pages identical across all signals — no regressions.`)
  process.exit(0)
}

if (changed.length) {
  const w = Math.max(...changed.map((c) => c.page.length))
  console.log(`${changed.length} of ${shared.length} pages differ:\n`)
  for (const c of changed) {
    const order = SECTIONS.filter((s) => c.sections.includes(s))
    console.log(`  ${c.page.padEnd(w)}   ${order.join(', ') || 'whitespace'}`)
  }
  const tally = SECTIONS.map((s) => [s, changed.filter((c) => c.sections.includes(s)).length]).filter(([, n]) => n)
  console.log(`\n  by signal: ${tally.map(([s, n]) => `${s} ${n}`).join(' · ')}`)
}

if (detail) {
  for (const c of changed) {
    if (only.length && !only.some((o) => c.page.includes(o))) continue
    console.log(`\n${'─'.repeat(72)}\n${c.page}\n${'─'.repeat(72)}`)
    console.log(c.raw.split('\n').slice(2).join('\n'))
  }
} else if (changed.length) {
  console.log(`\nRun with --detail (optionally naming pages) to see the differences.`)
}

process.exit(1)
