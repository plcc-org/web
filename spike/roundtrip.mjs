// Round-trip every real page body through Tina's MDX parser and serializer —
// the exact code path the editor uses on open and save. No admin UI, no server.
import { parseMDX, serializeMDX } from '@tinacms/mdx'
import { readFileSync, writeFileSync, mkdirSync, globSync } from 'node:fs'
import { bodyField } from '../tina/templates.mjs'

const OUT = process.argv[2] || '/tmp/tina-roundtrip'
mkdirSync(OUT, { recursive: true })
const files = globSync('src/content/pages/**/*.mdx').sort()

const splitFrontmatter = (raw) => {
  const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)
  return m ? raw.slice(m[0].length) : raw
}
const identity = (s) => s
const totals = { files: 0, clean: 0, changed: 0, invalid: 0, threw: 0 }
const report = []

for (const rel of files) {
  const body = splitFrontmatter(readFileSync(rel, 'utf8'))
  totals.files++
  let ast, out, err = null
  try {
    ast = parseMDX(body, bodyField, identity)
    out = serializeMDX(ast, bodyField, identity)
  } catch (e) { err = e.message }

  const invalid = ast ? JSON.stringify(ast).includes('invalid_markdown') : false
  if (invalid) totals.invalid++
  const base = `${OUT}/${rel.replace(/\//g, '__')}`
  if (err) { totals.threw++; report.push({ rel, status: 'THREW', detail: err }); continue }
  if (out === body && !invalid) { totals.clean++; report.push({ rel, status: 'clean' }); continue }
  totals.changed++
  writeFileSync(`${base}.before`, body)
  writeFileSync(`${base}.after`, typeof out === 'string' ? out : JSON.stringify(out, null, 1))
  report.push({ rel, status: invalid ? 'INVALID_MARKDOWN' : 'changed',
    before: body.split('\n').length, after: String(out).split('\n').length })
}
console.log(JSON.stringify({ totals, report }, null, 1))
