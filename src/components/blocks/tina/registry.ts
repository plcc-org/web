// Block name → Astro component, for <TinaMarkdown> — how the block palette in
// tina/templates.mjs maps onto the site's components at render time.
//
// Only the six wrapper blocks need a Tina-specific adapter: under MDX their
// prose arrives through `<slot />`, and through Tina it arrives as a `children`
// rich-text tree on the node's props. Every self-closing block takes plain props
// and no slot, so its existing MDX adapter is reused unchanged.
import type { CustomComponentsMap } from '@tinacms/astro/types'

import { inlineComponents } from './inline'
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

export const tinaComponents: CustomComponentsMap = {
  ...inlineComponents,

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
