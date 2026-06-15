import { defineCollection } from 'astro:content'
import { glob, file } from 'astro/loaders'
import { z } from 'astro/zod'

// Content lives under src/content/. Two shapes, by a simple rule:
//   • Things you add / remove / reorder, or that own an image → a folder of
//     Markdown entries (glob), so a future Git CMS can manage them as a
//     "folder collection" with a media library.
//   • Short flat lists → a single YAML file (file), edited as a list.
// Schemas (Zod) make alt text required and give editor + build-time validation.

// The photo catalog: one JSON file (src/content/photos.json) listing every
// editorial photo in src/assets/images by filename, with its alt text. This is
// the single source of truth for photo *metadata* — pages select photos by
// filename and <Photo> looks up the alt here (see src/lib/photos.ts). The image
// bytes are resolved and optimized separately, by filename (see src/lib/images.ts),
// so the catalog stays agnostic of where or how each photo is used. Logos and
// adornments (Instagram/YouTube marks, ministry logos, the PWA icon) are not
// photos and pass their own alt directly to <Photo>.
const photos = defineCollection({
  loader: file('src/content/photos.json'),
  schema: z.object({
    id: z.string(),
    alt: z.string().min(1),
  }),
})

// Pastors and staff. One Markdown file per person, portrait co-located.
const leadership = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/leadership' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      title: z.string(),
      portrait: image(),
      portraitAlt: z.string().min(1),
      order: z.number().default(0),
      link: z.object({ label: z.string(), href: z.string() }).optional(),
    }),
})

const quotes = defineCollection({
  loader: file('src/content/quotes.yaml'),
  schema: z.object({
    id: z.string(),
    order: z.number().default(0),
    text: z.string(),
    by: z.string().optional(),
  }),
})

const neighborDoors = defineCollection({
  loader: file('src/content/neighbor-doors.yaml'),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    intro: z.string(),
    body: z.string(),
    bullets: z.array(z.string()),
    ctaLabel: z.string(),
    href: z.string(),
    order: z.number().default(0),
  }),
})

const startHereLinks = defineCollection({
  loader: file('src/content/start-here-links.yaml'),
  schema: z.object({
    id: z.string(),
    group: z.enum(['home', 'im-new']),
    title: z.string(),
    meta: z.string(),
    href: z.string(),
    order: z.number().default(0),
  }),
})

export const collections = { photos, leadership, quotes, neighborDoors, startHereLinks }
