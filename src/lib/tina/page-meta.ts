import { renderPlain } from '../markdown'
import type { getPage } from './data'

type Page = NonNullable<Awaited<ReturnType<typeof getPage>>['data']['pages']>

// The meta description for a CMS page, shared by the prerendered route and the
// editor's on-demand preview so the two can't disagree.
//
// Hero ledes are authored as Markdown, so strip it before reusing one as the
// meta description — a raw `_word_` in a search snippet is the tell that a
// description was reused without being looked at.
// `||`, not `??`: the CMS writes an untouched optional string as '' rather than
// omitting it, and an empty description is exactly as useless as a missing one —
// it just isn't nullish, so `??` kept it and the page shipped with no description
// at all. Seen on /families/ after an editor saved a page they hadn't given one.
// `hero` is a union over the four hero templates and only three of them carry a
// lede — a cinematic hero has a subhead over the photo stack and no room for
// one. Hence the `in` narrowing rather than a plain optional chain; a page
// without a lede falls back to its seoDescription, which is what the home page
// (the only cinematic hero) does.
export function pageDescription(page: Page): string {
  const lede = page.hero && 'lede' in page.hero ? (page.hero.lede ?? '') : ''
  return page.seoDescription || renderPlain(lede)
}
