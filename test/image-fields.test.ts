import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { templates, heroFields, image, imageRef } from '../tina/templates.mjs'

// Every image field in the CMS schema must go through the image() helper, which
// bakes in the imageRef parse pinning the stored shape to /assets/images/<file>
// — the only shape TinaCloud round-trips unchanged. A field that skips it works
// perfectly in local dev and breaks only in the deployed admin (mangled
// thumbnails, references that don't survive a save), which is why this is a
// test and not a review note: the photo catalog shipped exactly that bug once.

type Field = {
  name: string
  type?: string
  fields?: Field[]
  ui?: { parse?: unknown }
}

/** Every field reachable from a field list, templates' nested lists included. */
function* walk(fields: Field[], path = ''): Generator<{ path: string; field: Field }> {
  for (const field of fields ?? []) {
    const here = path ? `${path}.${field.name}` : field.name
    yield { path: here, field }
    if (field.fields) yield* walk(field.fields, here)
  }
}

describe('image fields all carry the imageRef parse', () => {
  it('in the block palette and hero fields', () => {
    const offenders: string[] = []
    const roots: { name: string; fields: Field[] }[] = [
      { name: 'hero', fields: heroFields as Field[] },
      ...(templates as unknown as { name: string; fields: Field[] }[]),
    ]
    for (const root of roots) {
      for (const { path, field } of walk(root.fields, root.name)) {
        if (field.type === 'image' && field.ui?.parse !== imageRef) offenders.push(path)
      }
    }
    expect(offenders).toEqual([])
  })

  it('image() itself bakes it in and keeps it under a ui override', () => {
    const plain = image('x', 'X') as Field
    const withUi = image('x', 'X', { ui: { something: true } }) as Field
    expect(plain.ui?.parse).toBe(imageRef)
    expect(withUi.ui?.parse).toBe(imageRef)
  })

  it('tina/config.ts declares no image field by hand — only via image()', () => {
    const source = readFileSync('tina/config.ts', 'utf-8')
    expect(source).not.toMatch(/type:\s*['"]image['"]/)
  })

  it("templates.mjs declares `type: 'image'` exactly once — inside the helper", () => {
    const source = readFileSync('tina/templates.mjs', 'utf-8')
    expect(source.match(/type:\s*['"]image['"]/g)).toHaveLength(1)
  })
})
