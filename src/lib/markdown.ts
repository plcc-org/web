import { marked } from 'marked'
import { markedSmartypants } from 'marked-smartypants'

// Renders the small amount of Markdown that CMS editors author inside block
// fields — a Split's body, a Callout, a card. Intentionally minimal: paragraphs,
// bold/italic, links, and lists. Block components feed the result to `set:html`.
//
// `breaks: true` turns a single newline into a <br>, so an editor can write a
// label on its own line (e.g. a bold time above a sentence) without blank lines.
// `smartypants` turns straight quotes/dashes into the curly typographic forms
// the rest of the site uses, so editor-typed prose matches the house style.
marked.setOptions({ gfm: true, breaks: true })
marked.use(markedSmartypants())

/** Block-level Markdown → HTML (wraps text in <p>, builds lists, etc.). */
export function renderMarkdown(md: string | null | undefined): string {
  if (!md) return ''
  return marked.parse(md.trim()) as string
}

/** Inline-only Markdown → HTML (no wrapping <p>), for single-line fields. */
export function renderInline(md: string | null | undefined): string {
  if (!md) return ''
  return marked.parseInline(md.trim()) as string
}

/**
 * Markdown → plain text, for places that can't render HTML at all: `<meta>`
 * content, JSON-LD strings, page titles.
 *
 * Hero ledes are authored as Markdown, so anything reusing one has to strip it
 * or the source syntax shows up in search results. Rendering and *then*
 * stripping is deliberate: emphasis, links and entities collapse exactly as
 * they do on the page, rather than being guessed at with a regex over the raw
 * Markdown.
 */
export function renderPlain(md: string | null | undefined): string {
  if (!md) return ''
  return decodeEntities(renderInline(md).replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Decode the entities the site's text pipelines produce: numeric and hex forms
 * (smartypants curly quotes, `&#8217;`), the five XML escapes, and `&nbsp;`.
 * Ampersands are decoded last so `&amp;#8217;` — a literal, escaped entity in
 * the source — doesn't get double-decoded into a quote mark.
 *
 * The one entity decoder in the codebase — the YouTube feed parser and the
 * events text cleanup import it rather than growing their own smaller ones.
 */
export function decodeEntities(html: string): string {
  return html
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}
