import { tinaField } from '@tinacms/astro/tina-field'

// Whole-block edit markers for the visual editor.
//
// The CMS stamps `_content_source` onto every nested object in a query result,
// including each block's props, and its MDX renderer spreads those props into the
// registered component — so every block adapter already receives what it needs to
// identify itself. `blockField(Astro.props)` turns that into the attribute value
// the editor bridge maps a click onto; outside the editor it returns undefined and
// Astro omits the attribute entirely.
//
// The marker has to sit on the block's own root element, not a wrapper: layout.css
// styles `.canvas > .to-full` and friends as direct children, so an extra element
// in between would break the page. Where a block's root is a shared component
// rather than a plain element, that component takes an optional `tinaField` prop
// and renders it — one attribute, no behaviour, absent on hand-built pages.

/** Extra prop every block adapter receives from the CMS renderer, alongside its own. */
export type BlockProps = { _content_source?: unknown }

/** The block's edit marker, or undefined when not rendering for the editor. */
export function blockField(props: BlockProps): string | undefined {
  if (!props?._content_source) return undefined
  return tinaField(props as Parameters<typeof tinaField>[0])
}
