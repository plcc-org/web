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
