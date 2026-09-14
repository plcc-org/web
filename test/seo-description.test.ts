import { describe, it, expect } from 'vitest'
import { checkSeoDescription } from '../tina/templates.mjs'

// A page's meta description is its SEO description, else its hero's intro line, and
// scripts/check-site.mjs fails the build on a page with neither. The CMS form has to ask
// for the same thing, or an editor saves a page that looks finished and breaks a deploy
// they never see.

const page = (hero: Record<string, unknown>) => ({ title: 'A page', hero })

describe('checkSeoDescription', () => {
  it('accepts a page with its own description', () => {
    expect(checkSeoDescription('Sunday at Pine Lake.', page({ variant: 'plain' }))).toBeUndefined()
  })

  it('accepts a blank description when the intro line stands in', () => {
    expect(checkSeoDescription('', page({ variant: 'plain', lede: 'Come as you are.' }))).toBeUndefined()
    expect(checkSeoDescription(undefined, page({ variant: 'photo', lede: 'Come as you are.' }))).toBeUndefined()
  })

  it('rejects a page with neither', () => {
    expect(checkSeoDescription('', page({ variant: 'plain', subhead: 'Getting things ready' }))).toBeTypeOf('string')
    expect(checkSeoDescription(undefined, page({ variant: 'plain' }))).toBeTypeOf('string')
  })

  it('treats whitespace as blank', () => {
    expect(checkSeoDescription('  ', page({ variant: 'plain', lede: ' \n' }))).toBeTypeOf('string')
  })

  it("doesn't let a cinematic hero's leftover intro line stand in", () => {
    expect(checkSeoDescription('', page({ variant: 'cinematic', lede: 'Left over.' }))).toBeTypeOf('string')
  })
})
