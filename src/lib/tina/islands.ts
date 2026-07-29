// Island registry for visual editing.
//
// An "island" is an editable region the admin can re-render on its own. When the
// bridge boots inside the admin iframe it fetches /tina-island/<name> for each
// island on the page to pick up its form payload, then re-fetches that endpoint
// on every keystroke so the preview updates without a full reload.
import type { IslandRegistry } from '@tinacms/astro/experimental'
import PageBody from '../../components/blocks/tina/PageBody.astro'
import { getPage } from './data'

// The element the bridge swaps re-rendered HTML into. It has to match the
// page-side <TinaIsland> exactly, so both read it from here.
export const PAGE_WRAPPER = { tag: 'div' }

export const islands: IslandRegistry = {
  page: {
    fetch: (_request, params) => getPage(params.get('relativePath') ?? ''),
    component: PageBody,
    wrapper: PAGE_WRAPPER,
    propsFromData: (result) => ({ data: (result as { data?: { pages?: unknown } }).data?.pages }),
  },
}
