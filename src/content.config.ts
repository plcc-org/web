import { defineCollection } from 'astro:content'
import { glob, file } from 'astro/loaders'
import { z } from 'astro/zod'
import { parse as parseYaml } from 'yaml'

// quotes is a single YAML file holding one array. The CMS edits it as a list
// field, which serializes to `{ <key>: [...] }`. Parse tolerantly so both the
// hand-authored bare-array form and the CMS-wrapped form load, and give every
// item a stable `id` for the store.
//
// It lives in its own directory so the CMS can model it as a one-document
// collection — Tina has no singleton type, and pointing a collection at a
// directory containing exactly one file is how its own starter does this.
// (The helper is generic because start-here-links used it too, until those
// links moved inline into the homepage that was their only reader.)
const yamlList =
  (key: string) =>
  (text: string): Array<Record<string, unknown>> => {
    const data = parseYaml(text)
    const items: Array<Record<string, unknown>> = Array.isArray(data) ? data : (data?.[key] ?? [])
    return items.map((item, i) => ({ id: item.id ?? `${key}-${i + 1}`, ...item }))
  }

// Content lives under src/content/. Two shapes, by a simple rule:
//   • Things you add / remove / reorder, or that own an image → a folder of
//     entries (glob), one YAML file each, so the Git CMS manages
//     them as a "folder collection" with a media library.
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
  loader: glob({ pattern: '**/*.yaml', base: './src/content/youth-moments' }),
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

// Pastors and staff. One YAML data file per person (the CMS stores data-only
// collections as flat `<slug>.yaml`). The `bio` is a Markdown string field
// rendered to HTML at build time; the portrait is co-located in src/assets/images.
const leadership = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/leadership' }),
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
  loader: file('src/content/quotes/quotes.yaml', { parser: yamlList('quotes') }),
  schema: z.object({
    id: z.string(),
    order: z.number().default(0),
    text: z.string(),
    by: z.string().optional(),
  }),
})

// CMS-built pages. Each is an MDX file: a structured hero in frontmatter plus an
// MDX body the editor composes in the CMS's rich-text editor, inserting styled
// components (Split, Callout, Photo band, …). The body's component tags map to
// thin Astro wrappers at render time (see src/components/blocks/tina/registry.ts),
// so everything reuses the real site components.
//
// Nothing calls getCollection('pages') — src/pages/[...slug].astro renders from
// the CMS's GraphQL client. Do not delete this collection anyway: Astro syncs and
// validates every *declared* collection regardless, and this schema is the only
// thing that catches a page saved without a `hero`. Verified by test, not by
// assumption.
const pages = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/pages' }),
  // Hero/block images are stored as path strings and resolved at render time via
  // imageFromRef (src/lib/images.ts) — a nesting-agnostic registry — rather than
  // Astro's image() helper, so a fixed "../../assets/images/…" reference works
  // from both flat (church-life.mdx) and nested (about/covenant.mdx) pages.
  schema: z.object({
    title: z.string(),
    seoDescription: z.string().optional(),
    draft: z.boolean().default(false),
    hero: z.object({
      // Image (+ alt) are optional: a page with no hero photo renders a calm,
      // text-only header instead (PageHero). When an image is present its alt is
      // enforced at build time by the site crawl (scripts/check-site.mjs).
      image: z.string().optional(),
      alt: z.string().optional(),
      eyebrow: z.string().optional(),
      subhead: z.string().optional(),
      lede: z.string().optional(),
      logo: z.string().optional(),
      logoAlt: z.string().optional(),
      buttonLabel: z.string().optional(),
      buttonHref: z.string().optional(),
    }),
  }),
})

export const collections = { photos, youthMoments, leadership, quotes, pages }
