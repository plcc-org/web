// Prefix an internal path with the configured base path (import.meta.env.BASE_URL) so
// links resolve under a sub-path deployment (e.g. '/some-prefix/') as well as the
// root-served builds every current environment uses. Accepts paths with or without a
// leading slash; BASE_URL is always normalized by Astro to end in a trailing slash.
const BASE = import.meta.env.BASE_URL

export function withBase(path = ''): string {
  return BASE + path.replace(/^\//, '')
}

// Hrefs that must be passed through untouched rather than base-prefixed:
// absolute URLs, the three link schemes CMS editors actually type, protocol-
// relative URLs, and in-page anchors. Anything else is an internal path.
//
// Keep this as the single definition. A component that reimplements the test
// will get the scheme list subtly wrong, and check-site.mjs can't catch it:
// the crawler skips mailto:/tel:/# hrefs because it has no way to resolve them
// against dist, so a mangled `/tel:+14253928636` reaches production silently.
const EXTERNAL_HREF = /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i

/** Base-prefix an internal path; leave external URLs, mailto/tel, and anchors alone. */
export function resolveHref(href: string): string {
  return EXTERNAL_HREF.test(href) ? href : withBase(href)
}

// A different question from EXTERNAL_HREF: that one asks "must this href pass
// through resolveHref untouched?" (which includes mailto:, tel: and #anchors);
// this one asks "does following it leave the site?" — the test for opening in a
// new tab. Kept here so components don't each grow their own startsWith('http'),
// which quietly treats an internal path as same-tab but base-prefixes nothing.
/** True for an absolute web URL — the "leaves the site, open in a new tab" test. */
export function isWebUrl(href: string): boolean {
  return /^https?:\/\//i.test(href)
}
