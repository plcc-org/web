// Data loaders for the Tina-rendered page route.
//
// requestWithMetadata() stamps the GraphQL result with the metadata tinaField()
// needs to map a DOM element back to a form field — that mapping is what makes
// click-to-edit work.
import { requestWithMetadata } from '@tinacms/astro'
import client from '../../../tina/__generated__/client'

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
