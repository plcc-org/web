import { getCollection } from 'astro:content'
import { imageFromRef } from './images'

// The pastors and staff in page order, with each portrait resolved and its alt
// filled in. Shared by the roster and the profile pages so the two can't
// disagree about who is listed or how a portrait is described.
//
// Portraits are stored as path strings and resolved here, the same way the CMS
// block wrappers resolve theirs — see the note on the collection in
// src/content.config.ts for why they aren't Astro's image() helper.
export async function getLeaders() {
  return Promise.all(
    (await getCollection('leadership'))
      .sort((a, b) => a.data.position - b.data.position)
      .map(async (leader) => ({
        ...leader,
        portrait: (await imageFromRef(leader.data.portrait)?.())?.default,
        portraitAlt: leader.data.portraitAlt || `${leader.data.name}, ${leader.data.title}`,
      }))
  )
}

export type Leader = Awaited<ReturnType<typeof getLeaders>>[number]

/** The view-transition name a person's portrait carries on both pages, so it morphs between them. */
export const portraitTransition = (id: string) => `view-transition-name: leader-${id}`
