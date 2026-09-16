// Template name → Astro component: how the block palette in tina/templates.mjs maps
// onto the site's components at render time.
//
// Keys are the template `name` from templates.mjs. PageBody recovers that name from
// each block's `__typename`, which Tina generates as `PagesBlocks<Name>` — so this
// map is the one list, with nothing to keep in step with it.
//
// Only the six wrapper blocks need a Tina-specific adapter: the site components take
// their prose through a slot, and a block carries it as a `body` rich-text tree
// instead. Every self-closing block takes plain props, so its existing MDX adapter is
// reused unchanged.
import SectionTina from './SectionTina.astro'
import SplitTina from './SplitTina.astro'
import CalloutTina from './CalloutTina.astro'
import ClosingTina from './ClosingTina.astro'
import AsideTina from './AsideTina.astro'
import LetterTina from './LetterTina.astro'

import CaptionedPhotoMdx from '../mdx/CaptionedPhotoMdx.astro'
import VideoMdx from '../mdx/VideoMdx.astro'
import PhotoBandMdx from '../mdx/PhotoBandMdx.astro'
import CardRowMdx from '../mdx/CardRowMdx.astro'
import LinkCardsMdx from '../mdx/LinkCardsMdx.astro'
import QuoteMdx from '../mdx/QuoteMdx.astro'
import FeaturedEventsMdx from '../mdx/FeaturedEventsMdx.astro'
import KeyPointsMdx from '../mdx/KeyPointsMdx.astro'
import LogoCardsMdx from '../mdx/LogoCardsMdx.astro'
import YouthMomentsMdx from '../mdx/YouthMomentsMdx.astro'
import QuoteCarouselMdx from '../mdx/QuoteCarouselMdx.astro'
import Roadmap from '../../Roadmap.astro'

export const tinaBlocks = {
  Section: SectionTina,
  Split: SplitTina,
  Callout: CalloutTina,
  Closing: ClosingTina,
  Aside: AsideTina,
  Letter: LetterTina,

  CaptionedPhoto: CaptionedPhotoMdx,
  Video: VideoMdx,
  PhotoBand: PhotoBandMdx,
  CardRow: CardRowMdx,
  LinkCards: LinkCardsMdx,
  Quote: QuoteMdx,
  FeaturedEvents: FeaturedEventsMdx,
  KeyPoints: KeyPointsMdx,
  LogoCards: LogoCardsMdx,
  YouthMomentsBlock: YouthMomentsMdx,
  QuoteCarousel: QuoteCarouselMdx,
  Roadmap: Roadmap,
}

/** The prefix Tina puts on every generated block type in the `pages` collection. */
const TYPENAME_PREFIX = 'PagesBlocks'

/**
 * Reached through one lookup, these components' prop types *intersect* — TypeScript
 * would ask every block to satisfy every other block's props, which none can. What a
 * block may carry is settled by its template in tina/templates.mjs and checked by Tina
 * against the same list, so this seam is deliberately loose.
 */
type BlockComponent = (props: Record<string, unknown>) => unknown

/** The component for a block, by the `__typename` Tina returns for it. */
export const blockComponent = (typename: unknown): BlockComponent | undefined =>
  typeof typename === 'string' && typename.startsWith(TYPENAME_PREFIX)
    ? (tinaBlocks[typename.slice(TYPENAME_PREFIX.length) as keyof typeof tinaBlocks] as BlockComponent | undefined)
    : undefined
