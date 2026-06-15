import { getCollection } from 'astro:content'

// Photos for the rotating "Moments" galleries. Authors curate these in the
// `gallery` collection: a photo appears when `featured` is true and carries the
// given tag, ordered by `order`. To rotate imagery, flip `featured` / adjust
// `order` (or add a new entry) — no code change. Returns render-ready
// { image, alt } objects for <MomentsSection> / <Photo image=…>.
export async function featuredPhotos(tag: string, limit?: number) {
  const photos = (await getCollection('gallery'))
    .filter((p) => p.data.featured && p.data.tags.includes(tag))
    .sort((a, b) => a.data.order - b.data.order)
  return (limit ? photos.slice(0, limit) : photos).map((p) => ({ image: p.data.image, alt: p.data.alt }))
}
