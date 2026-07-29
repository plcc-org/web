import { describe, it, expect } from 'vitest'
import { richTextHref } from '../src/lib/tina/rich-text-href'

// Guards the link allowlist for CMS rich text. Worth a test on both sides:
//
//   - The schemes have to keep working. `tel:` reached production as href="#" on
//     five pages once already, because @tinacms/astro's own sanitizer allows only
//     http(s) and mailto: — and scripts/check-site.mjs skips tel:/mailto:/# hrefs,
//     so nothing in the build caught it. Only a side-by-side render diff did.
//   - The allowlist has to stay an allowlist. Page bodies are CMS-editable, so a
//     `javascript:` href is stored XSS, and "let anything with a scheme through"
//     is the tempting one-line fix next time a scheme goes missing.

describe('richTextHref', () => {
  it('keeps the schemes the site uses', () => {
    expect(richTextHref('tel:+14253928636')).toBe('tel:+14253928636')
    expect(richTextHref('mailto:office@plcc.org')).toBe('mailto:office@plcc.org')
    expect(richTextHref('https://plcc.churchcenter.com/calendar')).toBe('https://plcc.churchcenter.com/calendar')
    expect(richTextHref('http://example.org')).toBe('http://example.org')
  })

  it('keeps relative and in-page links', () => {
    expect(richTextHref('/visit/')).toBe('/visit/')
    expect(richTextHref('./nearby')).toBe('./nearby')
    expect(richTextHref('../up')).toBe('../up')
    expect(richTextHref('#top')).toBe('#top')
  })

  it('blocks script-bearing schemes', () => {
    expect(richTextHref('javascript:alert(1)')).toBe('#')
    expect(richTextHref('JavaScript:alert(1)')).toBe('#')
    expect(richTextHref('  javascript:alert(1)  ')).toBe('#')
    expect(richTextHref('data:text/html,<script>alert(1)</script>')).toBe('#')
    expect(richTextHref('vbscript:msgbox(1)')).toBe('#')
  })

  it('blocks protocol-relative URLs, which inherit the page scheme', () => {
    expect(richTextHref('//evil.example')).toBe('#')
  })

  it('falls back on anything that is not a usable URL', () => {
    expect(richTextHref('')).toBe('#')
    expect(richTextHref('   ')).toBe('#')
    expect(richTextHref(undefined)).toBe('#')
    expect(richTextHref(null)).toBe('#')
    expect(richTextHref(42)).toBe('#')
    expect(richTextHref('not a url')).toBe('#')
  })
})
