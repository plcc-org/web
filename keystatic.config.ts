import { createElement as h, type ReactNode } from 'react'
import { config, collection, singleton, fields, NotEditable } from '@keystatic/core'
import { wrapper, block } from '@keystatic/core/content-components'

// In-editor previews for page blocks: render each inserted block as a labelled
// card with a photo thumbnail, so editors see what a block is (and which photo
// it uses) at a glance. ContentView runs only in the browser admin; the helpers
// degrade gracefully (no thumbnail rather than an error) if a value is empty.
const ACCENT = '#6a9529'
type ImgValue = { data?: Uint8Array; extension?: string } | null | undefined
function thumb(image: ImgValue, size = 72): ReactNode {
  if (!image || !image.data) return null
  let src: string
  try {
    src = URL.createObjectURL(new Blob([image.data as BlobPart], { type: `image/${image.extension || 'jpeg'}` }))
  } catch {
    return null
  }
  return h('img', { src, style: { width: size, height: size, objectFit: 'cover', borderRadius: 4, display: 'block' } })
}
function preview(label: string, info: ReactNode, media: ReactNode, children?: ReactNode): ReactNode {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        borderLeft: `3px solid ${ACCENT}`,
        padding: '10px 12px',
        background: '#faf9f7',
        borderRadius: 6,
      },
    },
    media ? h(NotEditable, { key: 'm' }, media) : null,
    h(
      'div',
      { key: 'b', style: { flex: 1, minWidth: 0 } },
      h(
        NotEditable,
        { key: 'l' },
        h(
          'div',
          {
            style: {
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: ACCENT,
            },
          },
          label
        ),
        info ? h('div', { style: { fontWeight: 600, marginTop: 2 } }, info) : null
      ),
      children ?? null
    )
  )
}

// Keystatic CMS configuration. In dev we use `local` storage (reads/writes the
// repo on disk); in production (Cloudflare Pages) we use `github` storage, where
// edits commit to the repo through a GitHub App. The schemas below must stay
// aligned with the Astro content schemas in src/content.config.ts — Astro
// validates these same files at build time.
//
// Photos are deliberately NOT a CMS collection: the 442-entry catalog
// (src/content/photos.json) is build-time infrastructure. Editors add and pick
// photos through image fields (on page blocks and the hero).
export default config({
  storage: import.meta.env.DEV ? { kind: 'local' } : { kind: 'github', repo: 'timsneath/plcc-web' },

  ui: {
    brand: { name: 'Pine Lake Covenant Church' },
  },

  collections: {
    // Signature youth moments — folder of frontmatter-only Markdown entries.
    youthMoments: collection({
      label: 'Youth moments',
      slugField: 'title',
      path: 'src/content/youth-moments/*',
      format: { contentField: undefined },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        when: fields.text({
          label: 'When',
          description: 'A human label — a date range ("August 10–17, 2026") or a cadence ("Each spring").',
          validation: { isRequired: false },
        }),
        blurb: fields.text({ label: 'Blurb', multiline: true }),
        photo: fields.text({
          label: 'Photo filename',
          description: 'A filename from the photo catalog (src/content/photos.json).',
          validation: { isRequired: false },
        }),
        featured: fields.checkbox({
          label: 'Featured',
          description: 'Featured moments get a large card; the rest fall into a compact list.',
          defaultValue: false,
        }),
        order: fields.integer({ label: 'Order', defaultValue: 0 }),
        link: fields.object(
          {
            label: fields.text({ label: 'Link label', validation: { isRequired: false } }),
            href: fields.text({ label: 'Link URL', validation: { isRequired: false } }),
          },
          { label: 'Link (optional)' }
        ),
      },
    }),

    // Pastors and staff — folder of frontmatter-only Markdown entries; the bio
    // lives in a field (rendered as Markdown), the portrait is uploaded into
    // src/assets/images and stored as the same relative path the build resolves.
    leadership: collection({
      label: 'Leadership',
      slugField: 'name',
      path: 'src/content/leadership/*',
      format: { contentField: undefined },
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        title: fields.text({ label: 'Role / title' }),
        portrait: fields.image({
          label: 'Portrait',
          directory: 'src/assets/images',
          publicPath: '../../assets/images/',
          validation: { isRequired: true },
        }),
        portraitAlt: fields.text({ label: 'Portrait alt text', validation: { isRequired: true } }),
        bio: fields.text({ label: 'Bio', multiline: true }),
        order: fields.integer({ label: 'Order', defaultValue: 0 }),
        link: fields.object(
          {
            label: fields.text({ label: 'Link label', validation: { isRequired: false } }),
            href: fields.text({ label: 'Link URL', validation: { isRequired: false } }),
          },
          { label: 'Link (optional)' }
        ),
      },
    }),

    // CMS-built pages. A structured hero in frontmatter plus a rich-text (MDX)
    // body the editor composes in Keystatic's WYSIWYG editor — typing prose and
    // inserting the styled components below. Each component maps to a thin Astro
    // wrapper at render time (src/pages/[...slug].astro). The filename is the URL
    // slug. Photos are uploaded inline with their own alt text.
    pages: collection({
      label: 'Pages',
      slugField: 'title',
      path: 'src/content/pages/*',
      format: { contentField: 'content' },
      columns: ['title'],
      schema: {
        title: fields.slug({
          name: { label: 'Title' },
          slug: { label: 'URL slug', description: 'The page address, e.g. "momco" → /momco/.' },
        }),
        seoDescription: fields.text({
          label: 'SEO description',
          description: 'A one-sentence summary for search results and link previews.',
          validation: { isRequired: false },
        }),
        draft: fields.checkbox({
          label: 'Draft',
          description: "Drafts are visible in preview but won't be published.",
          defaultValue: false,
        }),
        hero: fields.object(
          {
            image: fields.image({
              label: 'Hero photo',
              directory: 'src/assets/images',
              publicPath: '../../assets/images/',
              validation: { isRequired: true },
            }),
            alt: fields.text({ label: 'Photo description (alt text)' }),
            eyebrow: fields.text({ label: 'Eyebrow (small label above the title)', validation: { isRequired: false } }),
            title: fields.text({ label: 'Page heading' }),
            lede: fields.text({ label: 'Intro line', multiline: true }),
          },
          { label: 'Hero' }
        ),
        content: fields.mdx({
          label: 'Body',
          description: 'Type prose; use the “+” / insert menu to add styled blocks.',
          components: {
            Section: wrapper({
              label: 'Text section',
              ContentView: ({ value, children }) =>
                preview('Text section', value.heading || value.eyebrow || '', null, children),
              schema: {
                eyebrow: fields.text({
                  label: 'Eyebrow (small label above the heading)',
                  validation: { isRequired: false },
                }),
                heading: fields.text({ label: 'Heading', validation: { isRequired: false } }),
              },
            }),
            Split: wrapper({
              label: 'Split (photo + text)',
              ContentView: ({ value, children }) =>
                preview('Split', value.heading || value.eyebrow || '', thumb(value.image), children),
              schema: {
                image: fields.image({
                  label: 'Photo',
                  directory: 'src/assets/images',
                  publicPath: '../../assets/images/',
                  validation: { isRequired: true },
                }),
                alt: fields.text({ label: 'Photo description (alt text)', validation: { isRequired: true } }),
                heading: fields.text({ label: 'Heading', validation: { isRequired: false } }),
                eyebrow: fields.text({ label: 'Eyebrow', validation: { isRequired: false } }),
                reverse: fields.checkbox({ label: 'Photo on the right', defaultValue: false }),
                tone: fields.select({
                  label: 'Background',
                  options: [
                    { label: 'Sand', value: 'sand' },
                    { label: 'Paper (white)', value: 'paper' },
                    { label: 'Forest (dark)', value: 'forest' },
                  ],
                  defaultValue: 'sand',
                }),
              },
            }),
            Callout: wrapper({
              label: 'Callout',
              ContentView: ({ value, children }) => preview('Callout', value.heading || '', null, children),
              schema: {
                heading: fields.text({ label: 'Heading', validation: { isRequired: false } }),
              },
            }),
            CaptionedPhoto: block({
              label: 'Captioned photo',
              ContentView: ({ value }) =>
                preview('Captioned photo', value.caption || value.alt || '', thumb(value.image)),
              schema: {
                image: fields.image({
                  label: 'Photo',
                  directory: 'src/assets/images',
                  publicPath: '../../assets/images/',
                  validation: { isRequired: true },
                }),
                alt: fields.text({ label: 'Photo description (alt text)', validation: { isRequired: true } }),
                caption: fields.text({ label: 'Caption', validation: { isRequired: false } }),
              },
            }),
            Cta: wrapper({
              label: 'Call to action',
              ContentView: ({ value, children }) => preview('Call to action', value.heading || '', null, children),
              schema: {
                tone: fields.select({
                  label: 'Background',
                  options: [
                    { label: 'Forest (dark)', value: 'forest' },
                    { label: 'Sand', value: 'sand' },
                    { label: 'Paper (white)', value: 'paper' },
                  ],
                  defaultValue: 'forest',
                }),
                eyebrow: fields.text({ label: 'Eyebrow', validation: { isRequired: false } }),
                heading: fields.text({ label: 'Heading', validation: { isRequired: false } }),
                buttonLabel: fields.text({ label: 'Button label', validation: { isRequired: false } }),
                buttonHref: fields.text({ label: 'Button link', validation: { isRequired: false } }),
              },
            }),
            PhotoBand: block({
              label: 'Photo band',
              ContentView: ({ value }) =>
                preview(
                  'Photo band',
                  `${(value.photos || []).length} photo(s)`,
                  h(
                    'div',
                    { style: { display: 'flex', gap: 4 } },
                    ...(value.photos || []).slice(0, 5).map((p, i) => h('div', { key: i }, thumb(p.image, 40)))
                  )
                ),
              schema: {
                heading: fields.text({ label: 'Heading', validation: { isRequired: false } }),
                eyebrow: fields.text({ label: 'Eyebrow', validation: { isRequired: false } }),
                photos: fields.array(
                  fields.object({
                    image: fields.image({
                      label: 'Photo',
                      directory: 'src/assets/images',
                      publicPath: '../../assets/images/',
                      validation: { isRequired: true },
                    }),
                    alt: fields.text({ label: 'Photo description (alt text)', validation: { isRequired: true } }),
                  }),
                  { label: 'Photos', itemLabel: (p) => p.fields.alt.value || 'Photo' }
                ),
              },
            }),
            CardRow: block({
              label: 'Card row',
              ContentView: ({ value }) => preview('Card row', `${(value.cards || []).length} card(s)`, null),
              schema: {
                cards: fields.array(
                  fields.object({
                    title: fields.text({ label: 'Title' }),
                    body: fields.text({ label: 'Text', multiline: true }),
                    href: fields.text({ label: 'Link (optional)', validation: { isRequired: false } }),
                  }),
                  { label: 'Cards', itemLabel: (p) => p.fields.title.value || 'Card' }
                ),
              },
            }),
            LinkCards: block({
              label: 'Link cards',
              ContentView: ({ value }) => preview('Link cards', `${(value.links || []).length} link(s)`, null),
              schema: {
                heading: fields.text({ label: 'Heading', validation: { isRequired: false } }),
                links: fields.array(
                  fields.object({
                    title: fields.text({ label: 'Title' }),
                    meta: fields.text({ label: 'Description' }),
                    href: fields.text({ label: 'Link' }),
                  }),
                  { label: 'Links', itemLabel: (p) => p.fields.title.value || 'Link' }
                ),
              },
            }),
          },
        }),
      },
    }),
  },

  // Short ordered lists, each a single YAML file edited as an array. The Astro
  // loaders parse both the hand-authored bare-array form and this wrapped form
  // (see yamlList() in src/content.config.ts).
  singletons: {
    homeQuotes: singleton({
      label: 'Homepage quotes',
      path: 'src/content/quotes',
      format: { data: 'yaml' },
      schema: {
        quotes: fields.array(
          fields.object({
            id: fields.text({ label: 'ID' }),
            order: fields.integer({ label: 'Order', defaultValue: 0 }),
            text: fields.text({ label: 'Quote', multiline: true }),
            by: fields.text({ label: 'Attribution', validation: { isRequired: false } }),
          }),
          { label: 'Quotes', itemLabel: (p) => p.fields.by.value || p.fields.id.value }
        ),
      },
    }),

    neighborDoors: singleton({
      label: 'Neighbor doors',
      path: 'src/content/neighbor-doors',
      format: { data: 'yaml' },
      schema: {
        doors: fields.array(
          fields.object({
            id: fields.text({ label: 'ID' }),
            order: fields.integer({ label: 'Order', defaultValue: 0 }),
            title: fields.text({ label: 'Title' }),
            intro: fields.text({ label: 'Intro', multiline: true }),
            body: fields.text({ label: 'Body', multiline: true }),
            bullets: fields.array(fields.text({ label: 'Bullet' }), { label: 'Bullets' }),
            ctaLabel: fields.text({ label: 'Button label' }),
            href: fields.text({ label: 'Button URL' }),
          }),
          { label: 'Doors', itemLabel: (p) => p.fields.title.value || p.fields.id.value }
        ),
      },
    }),

    startHereLinks: singleton({
      label: 'Start-here links',
      path: 'src/content/start-here-links',
      format: { data: 'yaml' },
      schema: {
        links: fields.array(
          fields.object({
            id: fields.text({ label: 'ID' }),
            group: fields.select({
              label: 'Group',
              options: [
                { label: 'Homepage', value: 'home' },
                { label: "I'm New page", value: 'im-new' },
              ],
              defaultValue: 'home',
            }),
            order: fields.integer({ label: 'Order', defaultValue: 0 }),
            title: fields.text({ label: 'Title' }),
            meta: fields.text({ label: 'Meta' }),
            href: fields.text({ label: 'URL' }),
          }),
          { label: 'Links', itemLabel: (p) => `${p.fields.title.value} (${p.fields.group.value})` }
        ),
      },
    }),
  },
})
