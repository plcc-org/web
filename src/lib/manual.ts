// The webmaster's manual: the editor's guide in docs/manual/*.md, served at /webmaster/
// (src/pages/webmaster/[...slug].astro). Its pages link to each other as `./page.md`, so
// they read correctly on GitHub too, and to the site as `/visit/`. On the site both are
// rewritten at Markdown render time (manualLinksPlugin, registered in astro.config.mjs)
// into base-prefixed site paths that the post-build crawl can then check.
//
// Dependency-free so astro.config.mjs and test/manual.test.ts can both import it.

/** Where the manual is served, relative to the site's base. */
export const MANUAL_ROUTE = 'webmaster/'

/** The nav's groups, in order. `start` holds only the front page, which titles the nav. */
export const MANUAL_SECTIONS = [
  { id: 'start', label: 'Start here' },
  { id: 'words', label: 'Words and pages' },
  { id: 'weekly', label: 'Weekly and urgent' },
  { id: 'lists', label: 'Shared lists and events' },
  { id: 'reference', label: 'Reference' },
  { id: 'help', label: 'Help' },
] as const

export type ManualSection = (typeof MANUAL_SECTIONS)[number]['id']

export const MANUAL_SECTION_IDS = MANUAL_SECTIONS.map((s) => s.id) as [ManualSection, ...ManualSection[]]

/** A manual page's path relative to the base: `index` is the front page. */
export function manualPath(id: string): string {
  return id === 'index' ? MANUAL_ROUTE : `${MANUAL_ROUTE}${id}/`
}

// The same pass-through set as resolveHref() in url.ts: schemes, protocol-relative
// URLs and in-page anchors.
const EXTERNAL = /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i
const MANUAL_PAGE = /^(?:\.\/)?([a-z\d-]+)\.md(#.*)?$/i

/**
 * The site address for a link or image written in a manual page.
 *
 * Throws on anything else that's relative, and on a `.md` link that leaves
 * docs/manual/: the manual is published and the developer docs aren't, so a link
 * into them would only work on GitHub.
 */
export function rewriteManualHref(href: string, base = '/'): string {
  if (EXTERNAL.test(href)) return href
  const page = href.match(MANUAL_PAGE)
  if (page) return `${base}${manualPath(page[1])}${page[2] ?? ''}`
  if (/\.md(?:#|$)/i.test(href)) {
    throw new Error(`manual: "${href}" points outside docs/manual/ — link to a published page instead`)
  }
  if (href.startsWith('/')) return `${base}${href.slice(1)}`
  throw new Error(`manual: "${href}" is relative — write ./page.md for the manual or /path/ for the site`)
}

type UrlNode = { url: string }
type SetProperty = { setProperty(node: UrlNode, key: 'url', value: string): void }

/**
 * A Sätteri mdast plugin (Astro 7's Markdown processor) applying rewriteManualHref to every
 * link, image and link definition in a docs/manual/ file. It's a factory so it can drop out
 * for every other document, and a plain object so this module needs no import from Sätteri.
 */
export function manualLinksPlugin({ base = '/' }: { base?: string } = {}) {
  const rewrite = (node: UrlNode, ctx: SetProperty) => ctx.setProperty(node, 'url', rewriteManualHref(node.url, base))
  const plugin = { name: 'plcc-manual-links', link: rewrite, image: rewrite, definition: rewrite }
  return ({ fileURL }: { fileURL: URL | undefined }) => (fileURL?.pathname.includes('/docs/manual/') ? plugin : null)
}
