import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { templates } from '../tina/templates.mjs'

// The block palette (tina/templates.mjs) and the renderer map
// (src/components/blocks/tina/registry.ts) have to agree by name. PageBody throws
// on a block with no renderer, but only once a page uses it, so a new template
// without an entry would pass CI and then fail the first deploy after an editor
// picked it. The registry imports .astro files, which Vitest can't load, so its
// keys are read from the source.

const registrySource = readFileSync('src/components/blocks/tina/registry.ts', 'utf-8')
const mapBody = registrySource.match(/export const tinaBlocks = \{([\s\S]*?)\n\}/)?.[1] ?? ''
const registered = [...mapBody.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]).sort()
const palette = (templates as { name: string }[]).map((t) => t.name).sort()

describe('block registry', () => {
  it('can be read', () => {
    expect(registered.length).toBeGreaterThan(0)
  })

  it('renders every block the palette offers, and nothing else', () => {
    expect(registered).toEqual(palette)
  })

  it('has a palette thumbnail for every block', () => {
    const missing = palette.filter((name) => !existsSync(`public/block-previews/${name}.webp`))
    expect(missing).toEqual([])
  })
})
