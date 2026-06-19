import { defineCollection } from 'astro:content'
import { glob, file } from 'astro/loaders'
import { z } from 'astro/zod'
import { parse as parseYaml } from 'yaml'

// quotes / neighbor-doors / start-here-links each live as a single YAML file,
// but the Git CMS (Keystatic) edits them as an array field, which serializes to
// `{ <key>: [...] }`. Parse tolerantly so both the hand-authored bare-array form
// and the CMS-wrapped form load, and give every item a stable `id` for the store.
const yamlList =
  (key: string) =>
  (text: string): Array<Record<string, unknown>> => {
    const data = parseYaml(text)
    const items: Array<Record<string, unknown>> = Array.isArray(data) ? data : (data?.[key] ?? [])
    return items.map((item, i) => ({ id: item.id ?? `${key}-${i + 1}`, ...item }))
  }

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

// Signature youth moments: the big tentpoles of the youth program (trips,
// retreats, annual service). These are curated content with their own copy and
// dates, kept here rather than in the dated events feed (which only looks ~8
// weeks ahead) so they always show. `when` is a human label — a date range like
// "October 9–11, 2026" or a cadence like "Each spring". `photo` is a filename in
// the photo catalog (alt resolved by <Photo>). `featured` gives the biggest
// moments large cards; the rest fall into a compact list.
const youthMoments = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/youth-moments' }),
  schema: z.object({
    title: z.string(),
    when: z.string().optional(),
    blurb: z.string().min(1),
    photo: z.string().optional(),
    link: z.object({ label: z.string(), href: z.string() }).optional(),
    featured: z.boolean().default(false),
    order: z.number().default(0),
  }),
})

// Pastors and staff. One Markdown file per person, portrait co-located. The
// profile `bio` lives in frontmatter (rendered as Markdown) rather than the body,
// so the Git CMS manages each entry as a predictable frontmatter-only document.
const leadership = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/leadership' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      title: z.string(),
      portrait: image(),
      portraitAlt: z.string().min(1),
      bio: z.string().min(1),
      order: z.number().default(0),
      link: z.object({ label: z.string().optional(), href: z.string().optional() }).optional(),
    }),
})

const quotes = defineCollection({
  loader: file('src/content/quotes.yaml', { parser: yamlList('quotes') }),
  schema: z.object({
    id: z.string(),
    order: z.number().default(0),
    text: z.string(),
    by: z.string().optional(),
  }),
})

const neighborDoors = defineCollection({
  loader: file('src/content/neighbor-doors.yaml', { parser: yamlList('doors') }),
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
  loader: file('src/content/start-here-links.yaml', { parser: yamlList('links') }),
  schema: z.object({
    id: z.string(),
    group: z.enum(['home', 'im-new']),
    title: z.string(),
    meta: z.string(),
    href: z.string(),
    order: z.number().default(0),
  }),
})

// CMS-built pages: an ordered list of typed "blocks", each rendered 1:1 by an
// existing component (see src/components/blocks/Blocks.astro and the dynamic
// route src/pages/[...slug].astro). Editors stack blocks to compose a page.
//
// Keystatic serializes its block array (a `fields.conditional`) as
// `{ discriminant, value }` per item — this discriminated union mirrors that
// shape exactly. Block images use image() so CMS-uploaded photos are optimized.
const pages = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/pages' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      seoDescription: z.string().optional(),
      draft: z.boolean().default(false),
      blocks: z
        .array(
          z.discriminatedUnion('discriminant', [
            z.object({
              discriminant: z.literal('richText'),
              value: z.object({ body: z.string() }),
            }),
            z.object({
              discriminant: z.literal('split'),
              value: z.object({
                image: image(),
                alt: z.string(),
                body: z.string(),
                reverse: z.boolean().default(false),
                tone: z.enum(['paper', 'sand', 'forest']).default('sand'),
                eyebrow: z.string().optional(),
              }),
            }),
            z.object({
              discriminant: z.literal('cardRow'),
              value: z.object({
                cards: z.array(z.object({ title: z.string(), body: z.string(), href: z.string().optional() })),
              }),
            }),
            z.object({
              discriminant: z.literal('callout'),
              value: z.object({ heading: z.string().optional(), body: z.string() }),
            }),
            z.object({
              discriminant: z.literal('photoBand'),
              value: z.object({
                heading: z.string().optional(),
                eyebrow: z.string().optional(),
                photos: z.array(z.object({ image: image(), alt: z.string() })),
              }),
            }),
            z.object({
              discriminant: z.literal('linkCards'),
              value: z.object({
                heading: z.string().optional(),
                links: z.array(z.object({ title: z.string(), meta: z.string(), href: z.string() })),
              }),
            }),
            z.object({
              discriminant: z.literal('ctaBand'),
              value: z.object({
                tone: z.enum(['forest', 'sand', 'paper']).default('forest'),
                eyebrow: z.string().optional(),
                heading: z.string().optional(),
                body: z.string(),
                button: z.object({ label: z.string().optional(), href: z.string().optional() }).optional(),
              }),
            }),
          ])
        )
        .default([]),
    }),
})

export const collections = { photos, youthMoments, leadership, quotes, neighborDoors, startHereLinks, pages }
