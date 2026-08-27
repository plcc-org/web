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
// "October 9–11, 2026" or a cadence like "Each spring". `featured` gives the
// biggest moments large cards; the rest fall into a compact list.
const youthMoments = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/youth-moments' }),
  schema: z.object({
    title: z.string(),
    when: z.string().optional(),
    blurb: z.string().min(1),
    link: z.object({ label: z.string(), href: z.string() }).optional(),
    featured: z.boolean().default(false),
    order: z.number().default(0),
  }),
})

// Pastors and staff. One YAML data file per person (the CMS stores data-only
// collections as flat `<slug>.yaml`). The `bio` is a Markdown string field
// rendered to HTML at build time; the portrait is co-located in src/assets/images.
// `portrait` is a path string resolved through imageFromRef, not Astro's image()
// helper, for the same reason the pages collection is: the CMS rewrites media
// paths, and only "/assets/images/…" survives a round-trip unchanged. image()
// requires a path relative to the file, which the CMS mangles into
// "/assets/images../../x.jpg" on save — and unlike a page image, which merely
// disappears, that fails the build outright with [ImageNotFound]. Verified by
// mangling one and building. Keeping both collections on one form also means one
// rule to remember rather than an exception.
const leadership = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/leadership' }),
  schema: () =>
    z.object({
      name: z.string(),
      title: z.string(),
      portrait: z.string().min(1),
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

// The opening lines every hero shape shares. Spread into each member of the hero
// union below so only the parts that actually differ — photo, wordmark, photo
// stack — are written out per template.
const heroText = {
  eyebrow: z.string().optional(),
  subhead: z.string().optional(),
  lede: z.string().optional(),
  buttonLabel: z.string().optional(),
  buttonHref: z.string().optional(),
}

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
  // Astro's image() helper, so one reference works from both flat
  // (church-life.mdx) and nested (about/covenant.mdx) pages.
  //
  // The form is "/assets/images/…", and that exact shape matters: it is the only
  // one the CMS round-trips unchanged. Its cloud resolver strips `mediaRoot` by
  // substring, so a relative "../../assets/images/x.jpg" comes back as
  // "/assets/images../../x.jpg" and the photo silently disappears. Leadership
  // portraits use the same form and the same resolver — one rule, no exceptions.
  // See test/image-ref.test.ts, and imageRef in tina/templates.mjs for the hook
  // that keeps saves on this shape.
  schema: z.object({
    title: z.string(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    draft: z.boolean().default(false),
    // A discriminated union over the hero's `variant` (tina/templates.mjs). This
    // is the whole value of making the kind of hero an explicit choice: the
    // single optional-everything object it replaced let a photo hero save
    // without a photo and render as a text-only header, and the schema couldn't
    // tell the difference because there was no stated intent to check against.
    //
    // The CMS form still shows every field regardless of variant — Tina can't
    // hide the irrelevant ones — so this is what catches a hero whose variant
    // and contents disagree. Leftovers from another variant are simply stripped:
    // switching a hero from photo to plain leaves an `image` behind, which is
    // ignored at render and isn't worth failing a build over.
    //
    // `.min(1)` throughout, not a bare `z.string()`: the CMS writes an untouched
    // field as '' rather than omitting it, and '' satisfies z.string() — so the
    // exact mistake this union exists to catch would pass. Same trap as the `||`
    // in src/pages/[...slug].astro.
    hero: z.discriminatedUnion('variant', [
      z.object({ variant: z.literal('photo'), image: z.string().min(1), alt: z.string().min(1), ...heroText }),
      z.object({ variant: z.literal('plain'), ...heroText }),
      z.object({
        variant: z.literal('wordmark'),
        logo: z.string().min(1),
        logoAlt: z.string().min(1),
        image: z.string().optional(),
        alt: z.string().optional(),
        ...heroText,
      }),
      z.object({
        variant: z.literal('cinematic'),
        photos: z.array(z.object({ image: z.string().min(1), alt: z.string().min(1) })).min(1),
        ...heroText,
      }),
    ]),
  }),
})

export const collections = { photos, youthMoments, leadership, quotes, pages }
