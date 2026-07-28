// Normalise our MDX to the subset Tina's parser accepts:
//   1. object keys inside JSX expression props: {"title":"A"} -> {title: "A"}
//   2. bare boolean attributes: `reverse` -> `reverse={true}`
// Both are lossless: same values, different surface syntax.
import { readFileSync, writeFileSync, globSync } from 'node:fs'

const BOOLS = ['reverse', 'flush', 'large']

// Walk from an `={` and return the index just past the matching `}`, respecting strings.
function matchBrace(s, open) {
  let depth = 0,
    q = null
  for (let i = open; i < s.length; i++) {
    const c = s[i]
    if (q) {
      if (c === '\\') i++
      else if (c === q) q = null
      continue
    }
    if (c === '"' || c === "'") {
      q = c
      continue
    }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (!depth) return i + 1
    }
  }
  return -1
}

// Re-emit a JS value with identifier keys where possible.
function emit(v) {
  if (Array.isArray(v)) return `[${v.map(emit).join(', ')}]`
  if (v && typeof v === 'object')
    return `{ ${Object.entries(v)
      .map(([k, val]) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${emit(val)}`)
      .join(', ')} }`
  return JSON.stringify(v)
}

let changed = 0,
  objProps = 0,
  bareBools = 0
for (const rel of globSync('src/content/pages/**/*.mdx').sort()) {
  const src = readFileSync(rel, 'utf8')
  let out = ''
  let i = 0
  // 1. rewrite `name={<json>}` where the payload parses as JSON
  while (i < src.length) {
    const m = /([A-Za-z_$][\w$]*)=\{/g
    m.lastIndex = i
    const hit = m.exec(src)
    if (!hit) {
      out += src.slice(i)
      break
    }
    const braceStart = hit.index + hit[0].length - 1
    const end = matchBrace(src, braceStart)
    if (end < 0) {
      out += src.slice(i, hit.index + hit[0].length)
      i = hit.index + hit[0].length
      continue
    }
    const inner = src.slice(braceStart + 1, end - 1)
    out += src.slice(i, hit.index) + hit[1] + '={'
    let payload = inner
    try {
      const parsed = JSON.parse(inner)
      if (parsed !== null && typeof parsed === 'object') {
        payload = emit(parsed)
        objProps++
      }
    } catch {}
    out += payload + '}'
    i = end
  }
  // 2. bare boolean attributes -> explicit {true}
  const before = out
  for (const b of BOOLS) out = out.replace(new RegExp(`(<[A-Z][\\w]*\\b[^>]*?\\s)${b}(\\s|>)`, 'g'), `$1${b}={true}$2`)
  if (out !== before) bareBools += (out.match(/=\{true\}/g) || []).length

  if (out !== src) {
    writeFileSync(rel, out)
    changed++
  }
}
console.log(`rewrote ${changed} files — ${objProps} object props re-keyed, ${bareBools} bare booleans made explicit`)
