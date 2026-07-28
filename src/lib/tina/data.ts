// Data loaders for the Tina-rendered preview route.
//
// requestWithMetadata() stamps the GraphQL result with the metadata tinaField()
// needs to map a DOM element back to a form field — that mapping is what makes
// click-to-edit work.
import { requestWithMetadata } from '@tinacms/astro'
import client from '../../../tina/__generated__/client'

/** One page from the `pages` collection, by path relative to the collection root. */
export const getPage = (relativePath: string) => requestWithMetadata(client.queries.pages({ relativePath }))

/** Every page's relative path, for getStaticPaths on the preview route. */
export async function listPagePaths(): Promise<string[]> {
  const res = await client.queries.pagesConnection({ first: 500 })
  return (res.data.pagesConnection.edges ?? [])
    .map((edge) => edge?.node?._sys.relativePath)
    .filter((p): p is string => typeof p === 'string')
}
