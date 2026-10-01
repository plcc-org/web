// The site notice's rules, shared by the CMS form (tina/config.ts) and the build-time
// check (src/content.config.ts), so a save the editor was shown as valid can't fail the
// build. Plain .mjs for the same reason as sunday-links.mjs: both sides import it.

import { checkLinkUrl } from './link-rules.mjs'

/**
 * A notice that's switched on needs something to say. Off, the message may be blank —
 * or left over from last time, ready to switch back on.
 * @param {unknown} message
 * @param {unknown} enabled
 * @returns {string | undefined}
 */
export function checkNoticeMessage(message, enabled) {
  if (!enabled) return undefined
  return typeof message === 'string' && message.trim() ? undefined : 'Write the notice before switching it on.'
}

/**
 * The link is optional; when there is one, it follows the same address rules as a Sunday link.
 * @param {unknown} link
 * @returns {string | undefined}
 */
export function checkNoticeLink(link) {
  return typeof link === 'string' && link.trim() ? checkLinkUrl(link) : undefined
}
