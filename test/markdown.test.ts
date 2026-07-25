import { describe, it, expect } from 'vitest'
import { renderPlain } from '../src/lib/markdown'

// renderPlain feeds `<meta>` content and JSON-LD strings, where any surviving
// markup or Markdown syntax is visible to users in a search result — a lede
// containing "sometimes _exhausting_" must not reach Google that way.
describe('renderPlain', () => {
  it('strips emphasis markers', () => {
    expect(renderPlain('sometimes _exhausting_')).toBe('sometimes exhausting')
    expect(renderPlain('**bold** and *italic*')).toBe('bold and italic')
  })

  it('keeps link text and drops the URL', () => {
    expect(renderPlain('see [our beliefs](/beliefs/)')).toBe('see our beliefs')
  })

  it('decodes the entities marked emits, so descriptions read as typed', () => {
    expect(renderPlain('Food & Clothing Bank')).toBe('Food & Clothing Bank')
    expect(renderPlain('“curly” — already')).toBe('“curly” — already')
  })

  // Tags are stripped before entities are decoded, so anything that parses as
  // markup is dropped rather than resurrected into the attribute. Given the
  // output lands in `<meta content>`, dropping is the right failure mode.
  it('drops anything that parses as a tag', () => {
    expect(renderPlain('a <span>b</span> c')).toBe('a b c')
    expect(renderPlain('safe <script>alert(1)</script>')).toBe('safe alert(1)')
  })

  it('applies smartypants, matching how the same text renders on the page', () => {
    expect(renderPlain("don't")).toBe('don’t')
  })

  it('collapses whitespace to a single line', () => {
    expect(renderPlain('one\n  two   three')).toBe('one two three')
  })

  it('returns an empty string for empty input', () => {
    expect(renderPlain('')).toBe('')
    expect(renderPlain(undefined)).toBe('')
    expect(renderPlain(null)).toBe('')
  })
})
