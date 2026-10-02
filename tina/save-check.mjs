// @ts-check
// The page's save-time check: every rule the form shows inside Top of page or a block,
// run over the whole page when the editor presses Save.
//
// Tina validates a field only while it's on screen. A block's fields are on screen only
// while that block is open, so a problem the block points out — a photo with no
// description, a link that isn't a link, a "Photo & text" top with no photo — is
// forgotten as soon as the editor goes back to the page, and Save goes through. The
// build then rejects what was saved, and the site stops updating. Rather than restate
// those rules, this walks the page's fields and calls each field's own validator, so the
// save says exactly what the block would have said. tina/config.ts runs it from the
// collection's `ui.beforeSubmit`.
//
// Plain .mjs, like the other rule modules, so tests can run it over every page on disk.

/** @typedef {{ name: string, label?: string, type?: string, list?: boolean, required?: boolean,
 *   fields?: Field[], templates?: Field[], ui?: { validate?: Function } }} Field */

/** @param {unknown} value */
const isEmpty = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && !value.trim()) ||
  (Array.isArray(value) && value.length === 0)

/**
 * Every problem on a page, each naming where it is ("Block 3 (Photo beside text): …").
 * @param {Record<string, any>} values the page form's values
 * @param {{ heroFields: readonly object[], templates: readonly object[] }} schema the field
 *   lists from tina/templates.mjs, which are typed loosely there
 * @returns {string[]}
 */
export function pageProblems(values, schema) {
  const heroFields = /** @type {Field[]} */ (schema.heroFields)
  const templates = /** @type {Field[]} */ (schema.templates)
  /** @type {string[]} */
  const problems = []

  /**
   * @param {Field[]} fields
   * @param {Record<string, any> | undefined} object
   * @param {string[]} path
   * @param {string} where
   */
  const walk = (fields, object, path, where) => {
    for (const field of fields) {
      const name = [...path, field.name].join('.')
      const value = object?.[field.name]
      const validate = field.ui?.validate
      const message =
        typeof validate === 'function'
          ? validate(value, values, undefined, { name })
          : field.required && isEmpty(value)
            ? `${field.label ?? field.name} is needed.`
            : undefined
      if (typeof message === 'string' && message) problems.push(`${where}: ${message}`)

      if (field.type !== 'object' || !value || typeof value !== 'object') continue
      if (field.list && Array.isArray(value)) {
        value.forEach((item, i) => {
          const itemPath = [...path, field.name, String(i)]
          if (field.templates) {
            const template = field.templates.find((t) => t.name === item?._template)
            if (template?.fields) walk(template.fields, item, itemPath, `${where}, ${template.label} ${i + 1}`)
          } else if (field.fields) {
            walk(field.fields, item, itemPath, `${where}, ${field.label ?? field.name} ${i + 1}`)
          }
        })
      } else if (!field.list && field.fields) {
        walk(field.fields, value, [...path, field.name], where)
      }
    }
  }

  walk(heroFields, values?.hero, ['hero'], 'Top of page')
  const blocks = Array.isArray(values?.blocks) ? values.blocks : []
  blocks.forEach((block, i) => {
    const template = templates.find((t) => t.name === block?._template)
    if (template?.fields) walk(template.fields, block, ['blocks', String(i)], `Block ${i + 1} (${template.label})`)
  })
  return [...new Set(problems)]
}
