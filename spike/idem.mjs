import { parseMDX, serializeMDX } from '@tinacms/mdx'
import { readFileSync, globSync } from 'node:fs'
import { bodyField } from '../tina/templates.mjs'
const strip = (r) => { const m = r.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/); return m ? r.slice(m[0].length) : r }
const id = (s) => s
const rt = (s) => serializeMDX(parseMDX(s, bodyField, id), bodyField, id)
let stable = 0, unstable = []
for (const rel of globSync('src/content/pages/**/*.mdx').sort()) {
  const body = strip(readFileSync(rel, 'utf8'))
  const one = rt(body), two = rt(one), three = rt(two)
  if (one === two && two === three) stable++
  else unstable.push(rel)
}
console.log(`idempotent after first save: ${stable}/${stable + unstable.length}`)
if (unstable.length) console.log('unstable:', unstable.join('\n  '))
