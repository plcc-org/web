// @ts-check
// What counts as a usable video link, shared by the two places that need to know:
// the Video block's form field (tina/templates.mjs), where an editor gets told
// before saving, and the renderer (src/components/blocks/mdx/VideoMdx.astro),
// which derives the embed URL from the same parse.
//
// Plain .mjs for the same reason short-link-rules.mjs is: importable from the CMS
// config and from Astro components without a build step.

/**
 * The privacy-friendly embed URL for a pasted YouTube or Vimeo page link
 * (youtube-nocookie, Vimeo dnt), or undefined for anything else — including an
 * empty string, which is what a freshly inserted block carries.
 * @type {(raw: unknown) => string | undefined}
 */
export function embedFrom(raw) {
  if (typeof raw !== 'string' || !raw) return undefined
  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    return undefined
  }
  const host = parsed.hostname.replace(/^www\.|^m\./, '')
  if (host === 'youtu.be') {
    const id = parsed.pathname.split('/')[1]
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : undefined
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const id = parsed.searchParams.get('v') ?? parsed.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]+)/)?.[1]
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : undefined
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = parsed.pathname.match(/\d+/)?.[0]
    return id ? `https://player.vimeo.com/video/${id}?dnt=1` : undefined
  }
  return undefined
}

/**
 * The form-side check: same parse, editor-facing message. Empty is left to the
 * field's own `required`, so the two errors don't stack on an untouched block.
 * @type {(url: unknown) => string | undefined}
 */
export function checkVideoUrl(url) {
  if (!url) return undefined
  return embedFrom(url)
    ? undefined
    : 'This needs to be a YouTube or Vimeo page link — https://www.youtube.com/watch?v=… or https://vimeo.com/123456789.'
}
