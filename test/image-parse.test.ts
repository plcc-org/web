import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { imageRef, heroFields, templates } from '../tina/templates.mjs'

// Guards the save-side normaliser on every CMS image field.
//
// The media picker hands an image field the full CDN URL, and TinaCloud writes a
// nested field's form value into the MDX verbatim — its cloud→relative rewrite
// covers only direct props. That conversion runs on TinaCloud's servers, so the
// form-side `ui.parse` hook is the seam this repo owns; these tests are what keeps
// a Tina upgrade (dependabot bumps the tina group) from regressing it silently.

describe('imageRef', () => {
  const ID = '445fdc97-3a8b-43a2-9a96-78e618e3b209'
  const WANT = '/assets/images/x.jpg'

  it('normalises every shape the CMS has produced to the pinned form', () => {
    expect(imageRef(`https://assets.tina.io/${ID}/x.jpg`)).toBe(WANT) // the picker's value (commit 6042bc5)
    expect(imageRef(`https://assets.tinajs.io/${ID}/x.jpg`)).toBe(WANT) // the SDK's default host
    expect(imageRef(`https://assets.tina.io/${ID}/x.jpg?fit=crop&max-w=400`)).toBe(WANT) // thumbnail params
    expect(imageRef('/assets/images/x.jpg')).toBe(WANT) // already pinned
    expect(imageRef('x.jpg')).toBe(WANT) // bare filename
    expect(imageRef('/assets/images../../x.jpg')).toBe(WANT) // the f077628 mangle
    expect(imageRef('../../assets/images/x.jpg')).toBe(WANT) // the pre-migration relative form
  })

  it('is idempotent', () => {
    for (const v of [`https://assets.tina.io/${ID}/x.jpg`, WANT, 'x.jpg']) {
      expect(imageRef(imageRef(v))).toBe(imageRef(v))
    }
  })

  // Tina clears a field by passing '' and seeds forms with undefined — both must
  // come back untouched or an emptied field would store "/assets/images/".
  it('passes empty and non-string values through', () => {
    expect(imageRef('')).toBe('')
    expect(imageRef(undefined)).toBe(undefined)
    expect(imageRef(null)).toBe(null)
  })
})

// Every image field must carry the hook. A new block added without the image()
// helper — or a refactor that drops `ui.parse` — reopens the CDN-URL leak with no
// visible symptom until an editor's save lands one in content. The serialised
// schema (tina-lock.json) drops functions, so the walk runs over the source
// objects.
describe('every CMS image field normalises on save', () => {
  const bare: string[] = []
  const walk = (node: unknown, path: string) => {
    if (Array.isArray(node)) {
      node.forEach((child, i) => walk(child, `${path}[${i}]`))
      return
    }
    if (!node || typeof node !== 'object') return
    const field = node as Record<string, unknown>
    const where = field.name ? `${path}.${field.name}` : path
    if (field.type === 'image') {
      const ui = field.ui as Record<string, unknown> | undefined
      if (typeof ui?.parse !== 'function') bare.push(where)
    }
    for (const [key, value] of Object.entries(field)) walk(value, `${where}.${key}`)
  }
  walk(heroFields, 'heroFields')
  walk(templates, 'templates')

  it('all template and hero image fields have ui.parse', () => {
    expect(bare).toEqual([])
  })

  // The leadership portrait is defined in tina/config.ts, which can't be imported
  // here (it pulls the whole tinacms browser bundle), so hold it by source: every
  // image field declared there must wire up imageRef on the same declaration.
  it('config.ts image fields have ui.parse too', () => {
    const source = readFileSync('tina/config.ts', 'utf-8')
    // One level of nesting is allowed so the field's own `ui: { … }` doesn't end the match.
    const field = /\{(?:[^{}]|\{[^{}]*\})*type: 'image'(?:[^{}]|\{[^{}]*\})*\}/g
    const imageFields = source.match(field) ?? []
    expect(imageFields.length).toBeGreaterThan(0)
    for (const field of imageFields) expect(field).toContain('parse: imageRef')
  })
})
