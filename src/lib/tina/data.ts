// Data loaders for the Tina-rendered page route.
//
// requestWithMetadata() stamps the GraphQL result with the metadata tinaField()
// needs to map a DOM element back to a form field — that mapping is what makes
// click-to-edit work.
import { requestWithMetadata } from '@tinacms/astro'
import client from '../../../tina/__generated__/client'
import { toIsoDate } from '../../../tina/sunday-links.mjs'

/** One page from the `pages` collection, by path relative to the collection root. */
export const getPage = (relativePath: string) => requestWithMetadata(client.queries.pages({ relativePath }))

/** Every page, with just what getStaticPaths needs to build and filter routes. */
export async function listPages(): Promise<{ relativePath: string; draft: boolean }[]> {
  const res = await client.queries.pagesConnection({ first: 500 })
  return (res.data.pagesConnection.edges ?? [])
    .map((edge) => edge?.node)
    .filter((node): node is NonNullable<typeof node> => Boolean(node?._sys?.relativePath))
    .map((node) => ({ relativePath: node._sys.relativePath, draft: Boolean(node.draft) }))
}

/** One Sunday's links (src/content/sunday-links), by filename. */
export const getSundayWeek = (relativePath: string) => requestWithMetadata(client.queries.sundayLinks({ relativePath }))

/** Every Sunday on file, with just the date /links/ picks the live and next weeks by. */
export async function listSundayWeeks(): Promise<{ relativePath: string; sunday: string }[]> {
  const res = await client.queries.sundayLinksConnection({ first: 500 })
  return (res.data.sundayLinksConnection.edges ?? [])
    .map((edge) => edge?.node)
    .filter((node): node is NonNullable<typeof node> => Boolean(node?._sys?.relativePath))
    .map((node) => ({ relativePath: node._sys.relativePath, sunday: toIsoDate(node.sunday) }))
    .filter((week) => week.sunday)
}

/** The groups of links shown under every week — a one-document collection. */
export const getEveryWeek = () =>
  requestWithMetadata(client.queries.sundayLinksEveryWeek({ relativePath: 'every-week.yaml' }))
