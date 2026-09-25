import { describe, it, expect } from 'vitest'
import { templates } from '../tina/templates.mjs'
import { EVENT_CATEGORIES } from '../src/lib/events/types'

// The CMS schema is plain JS and can't import the TypeScript event types, so the
// Featured events block restates the categories as select options. A category
// added to one side only would either never match an event or be unselectable.
// (Hero variants are checked in src/content.config.ts; EVENTS_SOURCE takes its
// values from EVENT_SOURCES directly.)

type Field = { name: string; options?: { value: string }[] }
type Template = { name: string; fields: Field[] }

describe('Featured events block', () => {
  it('offers exactly the event categories, plus "all"', () => {
    const block = (templates as unknown as Template[]).find((t) => t.name === 'FeaturedEvents')
    const options = block?.fields.find((f) => f.name === 'category')?.options?.map((o) => o.value) ?? []
    expect(options.filter((v) => v !== 'all').sort()).toEqual([...EVENT_CATEGORIES].sort())
    expect(options).toContain('all')
  })
})
