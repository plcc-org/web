// Island registry for visual editing.
//
// An "island" is an editable region the admin can re-render on its own. When the
// bridge boots inside the admin iframe it fetches /tina-island/<name> for each
// island on the page to pick up its form payload, then re-fetches that endpoint
// on every keystroke so the preview updates without a full reload.
import type { IslandRegistry } from '@tinacms/astro/experimental'
import PageBody from '../../components/blocks/tina/PageBody.astro'
import SundayWeek from '../../components/sunday-links/SundayWeek.astro'
import EveryWeekGroups from '../../components/sunday-links/EveryWeekGroups.astro'
import { getEveryWeek, getPage, getSundayWeek } from './data'

// The elements the bridge swaps re-rendered HTML into. Each has to match its
// page-side <TinaIsland> exactly, so both read it from here.
export const PAGE_WRAPPER = { tag: 'div' }
export const SUNDAY_WEEK_WRAPPER = { tag: 'div', className: 'sunday-links__week' }
export const EVERY_WEEK_WRAPPER = { tag: 'div', className: 'sunday-links__every-week' }

type Result<K extends string> = { data?: Partial<Record<K, unknown>> }

export const islands: IslandRegistry = {
  page: {
    fetch: (_request, params) => getPage(params.get('relativePath') ?? ''),
    component: PageBody,
    wrapper: PAGE_WRAPPER,
    propsFromData: (result) => ({ data: (result as Result<'pages'>).data?.pages }),
  },
  // /links/ — one Sunday's list. The page renders it twice when a later week exists
  // (live, and next week inside the preview <template>); params say which file.
  sundayWeek: {
    fetch: (_request, params) => getSundayWeek(params.get('relativePath') ?? ''),
    component: SundayWeek,
    wrapper: SUNDAY_WEEK_WRAPPER,
    propsFromData: (result) => ({ data: (result as Result<'sundayLinks'>).data?.sundayLinks }),
  },
  sundayEveryWeek: {
    fetch: () => getEveryWeek(),
    component: EveryWeekGroups,
    wrapper: EVERY_WEEK_WRAPPER,
    propsFromData: (result) => ({ data: (result as Result<'sundayLinksEveryWeek'>).data?.sundayLinksEveryWeek }),
  },
}
