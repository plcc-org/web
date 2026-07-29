// Overrides for the standard Markdown nodes, as opposed to our own blocks. These
// apply wherever rich text is rendered, including inside a block's body.
//
// Kept apart from registry.ts to stay out of an import cycle: registry.ts imports
// the block adapters, and the adapters import TinaChildren, which needs this map.
import type { CustomComponentsMap } from '@tinacms/astro/types'

import RichTextLink from './RichTextLink.astro'
import RichTextListItemContent from './RichTextListItemContent.astro'

export const inlineComponents: CustomComponentsMap = {
  a: RichTextLink,
  lic: RichTextListItemContent,
}
