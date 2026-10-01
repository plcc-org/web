// @ts-check
// Rules about how a page's blocks fit together, shared by the CMS form (tina/templates.mjs,
// tina/config.ts) and, where the build can check them too, src/content.config.ts — so the
// editor hears about a mistake while standing on it rather than from a failed deploy.
// Plain .mjs for the same reason as link-rules.mjs.

/**
 * The value of a field's sibling, given the field's full form path. Tina hands a
 * validator the whole document as `allValues` and the field itself, whose `name` is its
 * path through the form ("blocks.3.alt", "hero.photos.0.alt"), so the sibling is the
 * same path with the last segment swapped.
 * @param {unknown} allValues
 * @param {string | undefined} fieldName
 * @param {string} key
 * @returns {unknown}
 */
export function siblingValue(allValues, fieldName, key) {
  if (!fieldName) return undefined
  const path = fieldName.split('.').slice(0, -1)
  /** @type {unknown} */
  let node = allValues
  for (const segment of path) {
    if (node === null || typeof node !== 'object') return undefined
    node = /** @type {Record<string, unknown>} */ (node)[segment]
  }
  return node !== null && typeof node === 'object' ? /** @type {Record<string, unknown>} */ (node)[key] : undefined
}

/**
 * At most one Closing banner, and it comes last. It closes flush against the footer, so
 * anywhere else it reads as the page ending early; two of them and neither lands.
 * @param {unknown} blocks
 * @returns {string | undefined}
 */
export function checkClosingBanner(blocks) {
  if (!Array.isArray(blocks)) return undefined
  const at = blocks.flatMap((b, i) => (b?._template === 'Closing' ? [i] : []))
  if (at.length > 1) return 'A page can have only one Closing banner. Delete the extra one.'
  if (at.length === 1 && at[0] !== blocks.length - 1)
    return 'The Closing banner has to be the last block. Drag it to the bottom.'
  return undefined
}

/**
 * A photo needs a description from somewhere: this page's own, or its entry in the photo
 * catalog ("Photo descriptions"). `catalogued` is the set of catalogued filenames.
 *
 * In the CMS that set is a snapshot taken when the admin was built, so a photo described
 * in the catalog since then still asks for one here. That errs the safe way: the editor
 * writes a description that wasn't strictly needed, rather than shipping a page the
 * build's crawl (scripts/check-site.mjs) then rejects.
 * @param {unknown} alt
 * @param {unknown} image the photo field's value, `/assets/images/<file>`
 * @param {Set<string>} catalogued
 * @returns {string | undefined}
 */
export function checkPhotoAlt(alt, image, catalogued) {
  if (typeof alt === 'string' && alt.trim()) return undefined
  if (typeof image !== 'string' || !image) return undefined
  const file = image.split('/').pop()?.split('?')[0] ?? ''
  return catalogued.has(file)
    ? undefined
    : 'This photo has no saved description yet. Describe it here, for people who can’t see it.'
}
