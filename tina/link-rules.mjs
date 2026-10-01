// @ts-check
// The rules a typed link has to satisfy, shared by every CMS field that takes one — Sunday
// links, the site notice, block buttons and cards, leadership — and by the build-time
// checks in src/content.config.ts, so a save the editor was shown as valid can't fail the
// build. Plain .mjs for the same reason as short-link-rules.mjs: importable from a Node
// script and from the CMS config without a build step.

/**
 * A link opens a website (https), an email (mailto), or a page on this site (/events/).
 * Each rejection names the fix, because the likeliest mistakes — a pasted bare domain,
 * an email address without "mailto:" — are one edit away from working.
 * @param {unknown} value
 * @returns {string | undefined} a message for the editor, or undefined when valid
 */
export function checkLinkUrl(value) {
  const url = typeof value === 'string' ? value.trim() : ''
  if (!url) return 'Add the address this link opens.'
  if (/\s/.test(url)) return 'The address has a space in it. Copy it again from the browser’s address bar.'
  if (/^mailto:/i.test(url)) {
    const address = url.slice('mailto:'.length).split('?')[0]
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)
      ? undefined
      : 'An email link needs an address after “mailto:”, like mailto:office@plcc.org.'
  }
  if (/^https:\/\/[^/]+\.[^/]+/i.test(url)) return undefined
  if (/^http:\/\//i.test(url)) return 'Use the https:// version of the address.'
  if (/^\/(?!\/)/.test(url)) return undefined
  if (/^[^@\s/:]+@[^@\s]+\.[^@\s]+$/.test(url)) return `For an email link, put “mailto:” in front: mailto:${url}`
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(url)) return `Start the address with https://, like https://${url}`
  return 'Start with https:// for a website, mailto: for an email, or / for a page on this site (/events/).'
}

/**
 * A link field that may be left blank. When it isn't, the rules above apply — plus the
 * two forms a page link can take that a Sunday link can't: a phone number (tel:) and a
 * jump to a spot on the same page (#…), both of which resolveHref (src/lib/url.ts)
 * passes through.
 * @param {unknown} value
 * @returns {string | undefined}
 */
export function checkOptionalLink(value) {
  const url = typeof value === 'string' ? value.trim() : ''
  if (!url) return undefined
  if (/^tel:\+?[\d\s().-]{7,}$/i.test(url) || /^#[\w-]+$/.test(url)) return undefined
  return checkLinkUrl(url)
}
