import { describe, it, expect } from 'vitest'
import { stripHtml, truncate } from '../src/lib/events/text'

// Planning Center descriptions are written for Church Center — HTML, often long —
// and land on event cards as plain text trimmed to fit.

describe('stripHtml', () => {
  it('drops tags without fusing the words either side', () => {
    expect(stripHtml('<p>Bring a friend.</p><p>Snacks provided.</p>')).toBe('Bring a friend. Snacks provided.')
    expect(stripHtml('one<br>two')).toBe('one two')
  })

  it('decodes entities and collapses whitespace', () => {
    expect(stripHtml('Food &amp; Clothing\n\n  Bank')).toBe('Food & Clothing Bank')
  })

  it('returns an empty string for empty input', () => {
    expect(stripHtml(undefined)).toBe('')
    expect(stripHtml(null)).toBe('')
  })
})

describe('truncate', () => {
  it('leaves text within the limit alone', () => {
    expect(truncate('short', 10)).toBe('short')
    expect(truncate('exactly 10', 10)).toBe('exactly 10')
  })

  it('backs up to a word boundary near the limit', () => {
    expect(truncate('the quick brown fox jumps', 18)).toBe('the quick brown…')
  })

  it('drops trailing punctuation before the ellipsis', () => {
    expect(truncate('one two three, four five', 15)).toBe('one two three…')
    expect(truncate('Come along. Everyone welcome', 12)).toBe('Come along…')
  })

  it('hard-cuts a long token rather than backing up most of the way', () => {
    // A boundary at or before 60% of the limit is too far back to be worth it.
    expect(truncate('a supercalifragilisticexpialidocious', 20)).toBe('a supercalifragilist…')
  })

  it('defaults to the card limit', () => {
    const long = 'word '.repeat(60).trim()
    const out = truncate(long)
    expect(out.length).toBeLessThanOrEqual(181)
    expect(out.endsWith('word…')).toBe(true)
  })
})
