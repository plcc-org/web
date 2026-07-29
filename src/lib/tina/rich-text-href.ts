// The href allowlist for links inside CMS rich text.
//
// `<TinaMarkdown>`'s built-in link node runs every href through the sanitizer in
// @tinacms/astro, whose allowlist is relative paths, http(s) and mailto: — and
// rewrites everything else to "#". `tel:` isn't on it, so the phone numbers in
// src/content/pages silently became dead links. scripts/check-site.mjs can't catch
// that: it skips tel:/mailto:/# hrefs, having no way to resolve them against dist.
//
// LinkNode.astro checks `components.a` before falling back to its own rendering,
// so overriding that (see RichTextLink.astro) is the supported way through rather
// than patching the package. This is upstream's allowlist plus tel:. Keeping it an
// allowlist is the point: these URLs come from a CMS, and a `javascript:` href is
// stored XSS. Widen it only for a scheme the content actually uses.

const SCHEMES = ['http:', 'https:', 'mailto:', 'tel:']

/** A safe href for a CMS-supplied URL, or '#' if the URL isn't one we allow. */
export function richTextHref(value: unknown): string {
  if (typeof value !== 'string') return '#'
  const trimmed = value.trim()
  if (!trimmed) return '#'
  // Relative, absolute-path and in-page links — but not protocol-relative
  // "//evil.com", which browsers resolve against the current scheme.
  if (/^(\/(?!\/)|\.\.?\/|#)/.test(trimmed)) return trimmed
  try {
    return SCHEMES.includes(new URL(trimmed).protocol) ? trimmed : '#'
  } catch {
    return '#'
  }
}
