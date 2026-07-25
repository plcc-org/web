// Prefix an internal path with the configured base path (import.meta.env.BASE_URL)
// so links resolve under sub-path deployments (e.g. GitHub Pages '/plcc-web/') as
// well as root-served builds. Accepts paths with or without a leading slash;
// BASE_URL is always normalized by Astro to end in a trailing slash.
const BASE = import.meta.env.BASE_URL

export function withBase(path = ''): string {
  return BASE + path.replace(/^\//, '')
}

// Hrefs that must be passed through untouched rather than base-prefixed:
// absolute URLs, the three link schemes CMS editors actually type, protocol-
// relative URLs, and in-page anchors. Anything else is an internal path.
//
// This test used to be copy-pasted into four components, and one copy had
// drifted — only PageHero handled `tel:`, so a phone number typed into a Cta
// button or a CardRow link came out as `/tel:+14253928636`. check-site.mjs
// skips `tel:` hrefs (it can't resolve them against dist), so the crawler
// could never have caught it. One definition, next to withBase.
const EXTERNAL_HREF = /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i

/** Base-prefix an internal path; leave external URLs, mailto/tel, and anchors alone. */
export function resolveHref(href: string): string {
  return EXTERNAL_HREF.test(href) ? href : withBase(href)
}
