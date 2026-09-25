import { describe, it, expect } from 'vitest'
import { decodeEntities, renderInline, renderMarkdown, renderPlain } from '../src/lib/markdown'

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

// renderMarkdown and renderInline feed `set:html` in the block components, so a
// `marked` upgrade that changes their options changes every CMS page at once.
describe('renderMarkdown', () => {
  it('wraps paragraphs and turns a single newline into a line break', () => {
    // `breaks: true` is what lets an editor put a label on its own line.
    expect(renderMarkdown('**Sundays**\n10am')).toBe('<p><strong>Sundays</strong><br>10am</p>\n')
  })

  it('builds lists', () => {
    expect(renderMarkdown('- one\n- two')).toBe('<ul>\n<li>one</li>\n<li>two</li>\n</ul>\n')
  })

  it('applies smartypants to quotes and dashes', () => {
    // As numeric entities, which the browser shows as the curly forms.
    expect(renderMarkdown(`"Come as you are" -- it's true`)).toBe(
      '<p>&#8220;Come as you are&#8221; &#8211; it&#8217;s true</p>\n'
    )
  })

  it('returns an empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('')
    expect(renderMarkdown(null)).toBe('')
  })
})

describe('renderInline', () => {
  it('renders emphasis and links without a wrapping paragraph', () => {
    expect(renderInline('see *our* [beliefs](/beliefs/)')).toBe('see <em>our</em> <a href="/beliefs/">beliefs</a>')
  })

  it('trims surrounding whitespace', () => {
    expect(renderInline('  hello  ')).toBe('hello')
  })
})

describe('decodeEntities', () => {
  it('decodes numeric, hex and named entities', () => {
    expect(decodeEntities('it&#8217;s &#x2014; &lt;b&gt; &quot;x&quot; &amp; c')).toBe('it’s — <b> "x" & c')
  })

  it('keeps &nbsp; non-breaking', () => {
    expect(decodeEntities('10&nbsp;am')).toBe('10\u00a0am')
  })

  it('decodes an escaped entity once, not twice', () => {
    // `&amp;#8217;` is the literal text "&#8217;", escaped — not a quote mark.
    expect(decodeEntities('&amp;#8217;')).toBe('&#8217;')
  })
})
