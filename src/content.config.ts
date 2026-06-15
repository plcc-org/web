import { defineCollection } from 'astro:content'
import { glob, file } from 'astro/loaders'
import { z } from 'astro/zod'

// Content lives under src/content/. Two shapes, by a simple rule:
//   • Things you add / remove / reorder, or that own an image → a folder of
//     Markdown entries (glob), so a future Git CMS can manage them as a
//     "folder collection" with a media library.
//   • Short flat lists → a single YAML file (file), edited as a list.
// Schemas (Zod) make alt text required and give editor + build-time validation.

// Rotatable photo vignettes. Images stay in src/assets/images (the site's media
// folder) and are referenced via image() with a relative path, so they're
// optimized like any other asset and shared cleanly with pages that still
// reference them directly. Galleries show `featured` entries, ordered by `order`,
// filtered by a `tags` value (e.g. 'home', 'neighbors').
const gallery = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/gallery' }),
  schema: ({ image }) =>
    z.object({
      image: image(),
      alt: z.string().min(1),
      tags: z.array(z.string()).default([]),
      featured: z.boolean().default(false),
      order: z.number().default(0),
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

export const collections = { gallery, leadership, quotes, neighborDoors, startHereLinks }
