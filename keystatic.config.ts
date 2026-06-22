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
      path: 'src/content/pages/**',
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
          description:
            "New pages start as drafts — they're visible in preview but not published. Uncheck to publish when ready.",
          defaultValue: true,
        }),
        hero: fields.object(
          {
            image: fields.image({
              label: 'Hero photo',
              description: 'Optional — leave blank for a calm, text-only header (no photo).',
              directory: 'src/assets/images',
              publicPath: '../../assets/images/',
              validation: { isRequired: false },
            }),
            alt: fields.text({
              label: 'Photo description (alt text)',
              description: 'Required only when a hero photo is set.',
              validation: { isRequired: false },
            }),
            eyebrow: fields.text({
              label: 'Eyebrow',
              description: 'Optional — a small label shown above the heading.',
              validation: { isRequired: false },
            }),
            lede: fields.text({
              label: 'Intro line',
              description: 'A one- or two-sentence opening. The heading comes from the page title.',
              multiline: true,
              validation: { isRequired: false },
            }),
            subhead: fields.text({
              label: 'Subhead',
              description: 'Optional — a line between the heading and the intro.',
              validation: { isRequired: false },
            }),
            logo: fields.image({
              label: 'Wordmark logo',
              description: 'Optional — a wordmark shown instead of the heading (e.g. Pine Lake Kids).',
              directory: 'src/assets/images',
              publicPath: '../../assets/images/',
              validation: { isRequired: false },
            }),
            logoAlt: fields.text({
              label: 'Logo description (alt text)',
              description: 'Required only when a wordmark logo is set.',
              validation: { isRequired: false },
            }),
            buttonLabel: fields.text({
              label: 'Hero button label',
              description: 'Optional.',
              validation: { isRequired: false },
            }),
            buttonHref: fields.text({
              label: 'Hero button link',
              description: 'Optional.',
              validation: { isRequired: false },
            }),
          },
          { label: 'Hero' }
        ),
        content: fields.mdx({
          label: 'Body',
          description: 'Type prose; use the “+” / insert menu to add styled blocks.',
          components: {
            Section: wrapper({
              label: 'Rich text',
              description: 'A heading and formatted paragraphs — bold, links, lists. The default for written content.',
              ContentView: ({ value, children }) =>
                preview('Rich text', value.heading || value.eyebrow || '', null, children),
              schema: {
                eyebrow: fields.text({
                  label: 'Eyebrow (small label above the heading)',
                  validation: { isRequired: false },
                }),
                heading: fields.text({ label: 'Heading', validation: { isRequired: false } }),
              },
            }),
            Split: wrapper({
              label: 'Photo & text (split)',
              description:
                'A photo beside formatted text — left or right, on a tinted background. The main show-and-tell layout.',
              ContentView: ({ value, children }) =>
                preview('Photo & text', value.heading || value.eyebrow || '', thumb(value.image), children),
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
              description: 'A small boxed aside that sets one point apart — a reassurance, a key fact, a heads-up.',
              ContentView: ({ value, children }) => preview('Callout', value.heading || '', null, children),
              schema: {
                heading: fields.text({ label: 'Heading', validation: { isRequired: false } }),
              },
            }),
            CaptionedPhoto: block({
              label: 'Photo',
              description: 'A single framed photo with an optional caption.',
              ContentView: ({ value }) => preview('Photo', value.caption || value.alt || '', thumb(value.image)),
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
              label: 'Banner',
              description:
                'A full-width colored band that interrupts the page to make a statement, with an optional button — a welcome, an invitation, a closing message.',
              ContentView: ({ value, children }) => preview('Banner', value.heading || '', null, children),
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
                flush: fields.checkbox({
                  label: 'Sit flush against the footer',
                  description: 'Use only when this banner is the last block on the page.',
                  defaultValue: false,
                }),
              },
            }),
            PhotoBand: block({
              label: 'Photo gallery',
              description: 'Several photos shown together as a staggered band — a visual break.',
              ContentView: ({ value }) =>
                preview(
                  'Photo gallery',
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
              label: 'Text cards',
              description: 'A row of small cards, each a short title and a line or two — for a few parallel points.',
              ContentView: ({ value }) =>
                preview('Text cards', value.heading || `${(value.cards || []).length} card(s)`, null),
              schema: {
                eyebrow: fields.text({ label: 'Eyebrow', validation: { isRequired: false } }),
                heading: fields.text({ label: 'Heading', validation: { isRequired: false } }),
                intro: fields.text({
                  label: 'Intro',
                  description: 'An optional lead line shown above the cards.',
                  multiline: true,
                  validation: { isRequired: false },
                }),
                columns: fields.select({
                  label: 'Cards per row',
                  description: 'Auto fits as many as will fit; a fixed count wraps the rest (e.g. four cards 2×2).',
                  options: [
                    { label: 'Auto', value: 'auto' },
                    { label: 'Two', value: '2' },
                    { label: 'Three', value: '3' },
                    { label: 'Four', value: '4' },
                  ],
                  defaultValue: 'auto',
                }),
                cards: fields.array(
                  fields.object({
                    title: fields.text({ label: 'Title' }),
                    body: fields.text({ label: 'Text', multiline: true }),
                    href: fields.text({ label: 'Link (optional)', validation: { isRequired: false } }),
                    linkLabel: fields.text({
                      label: 'Link label (optional)',
                      description: 'Shows a “label →” call-to-action at the foot of the card.',
                      validation: { isRequired: false },
                    }),
                  }),
                  { label: 'Cards', itemLabel: (p) => p.fields.title.value || 'Card' }
                ),
              },
            }),
            LinkCards: block({
              label: 'Link cards',
              description: 'A grid of cards that each link to another page — for signposting to related content.',
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
            Quote: block({
              label: 'Quote',
              description: 'A single featured pull-quote — a testimonial or short quotation set apart from the prose.',
              ContentView: ({ value }) => preview('Quote', value.quote || '', null),
              schema: {
                quote: fields.text({ label: 'Quote', multiline: true, validation: { isRequired: true } }),
                attribution: fields.text({
                  label: 'Attribution',
                  description: 'Who said it — e.g. "A recent attendee", or a scripture reference. Optional.',
                  validation: { isRequired: false },
                }),
                tone: fields.select({
                  label: 'Background',
                  description: 'Plain sets the quote in open space; a color renders it inside a band (a "verse band").',
                  options: [
                    { label: 'Plain (no band)', value: 'none' },
                    { label: 'Forest (dark)', value: 'forest' },
                    { label: 'Sand', value: 'sand' },
                    { label: 'Paper (white)', value: 'paper' },
                  ],
                  defaultValue: 'none',
                }),
              },
            }),
            FeaturedEvents: block({
              label: 'Featured events',
              description: 'A short list of upcoming events, pulled live from the events feed.',
              ContentView: ({ value }) =>
                preview(
                  'Featured events',
                  `Up to ${value.count} · ${value.category === 'all' ? 'All categories' : value.category}`,
                  null
                ),
              schema: {
                heading: fields.text({ label: 'Heading', validation: { isRequired: false } }),
                category: fields.select({
                  label: 'Category',
                  options: [
                    { label: 'All categories', value: 'all' },
                    { label: 'Everyone', value: 'Everyone' },
                    { label: 'Families', value: 'Families' },
                    { label: 'Youth', value: 'Youth' },
                    { label: 'Groups', value: 'Groups' },
                    { label: 'Serve', value: 'Serve' },
                  ],
                  defaultValue: 'all',
                }),
                count: fields.integer({ label: 'How many to show', defaultValue: 3 }),
              },
            }),
            KeyPoints: block({
              label: 'Key points',
              description: 'A moss-accented grid of titled points — the core-tenets / emphases treatment.',
              ContentView: ({ value }) => preview('Key points', `${(value.items || []).length} point(s)`, null),
              schema: {
                eyebrow: fields.text({ label: 'Eyebrow', validation: { isRequired: false } }),
                heading: fields.text({ label: 'Heading', validation: { isRequired: false } }),
                columns: fields.select({
                  label: 'Columns',
                  options: [
                    { label: 'Two across', value: '2' },
                    { label: 'Three across', value: '3' },
                  ],
                  defaultValue: '2',
                }),
                items: fields.array(
                  fields.object({
                    title: fields.text({ label: 'Title' }),
                    body: fields.text({ label: 'Text', multiline: true }),
                  }),
                  { label: 'Points', itemLabel: (p) => p.fields.title.value || 'Point' }
                ),
              },
            }),
            LogoCards: block({
              label: 'Logo cards',
              description: 'A row of cards, each topped by a program or partner logo, with text and an optional link.',
              ContentView: ({ value }) =>
                preview(
                  'Logo cards',
                  `${(value.cards || []).length} card(s)`,
                  h(
                    'div',
                    { style: { display: 'flex', gap: 4 } },
                    ...(value.cards || []).slice(0, 5).map((c, i) => h('div', { key: i }, thumb(c.image, 40)))
                  )
                ),
              schema: {
                eyebrow: fields.text({ label: 'Eyebrow', validation: { isRequired: false } }),
                heading: fields.text({ label: 'Heading', validation: { isRequired: false } }),
                cards: fields.array(
                  fields.object({
                    image: fields.image({
                      label: 'Logo',
                      directory: 'src/assets/images',
                      publicPath: '../../assets/images/',
                      validation: { isRequired: true },
                    }),
                    alt: fields.text({ label: 'Logo description (alt text)', validation: { isRequired: true } }),
                    body: fields.text({ label: 'Text', multiline: true }),
                    linkLabel: fields.text({ label: 'Link label', validation: { isRequired: false } }),
                    href: fields.text({ label: 'Link URL', validation: { isRequired: false } }),
                  }),
                  { label: 'Cards', itemLabel: (p) => p.fields.alt.value || 'Card' }
                ),
              },
            }),
            Aside: wrapper({
              label: 'Aside',
              description: 'A tinted note set apart from the page — formatted text beside an optional small logo.',
              ContentView: ({ value, children }) => preview('Aside', value.eyebrow || '', thumb(value.logo), children),
              schema: {
                eyebrow: fields.text({ label: 'Eyebrow', validation: { isRequired: false } }),
                logo: fields.image({
                  label: 'Logo (optional)',
                  directory: 'src/assets/images',
                  publicPath: '../../assets/images/',
                  validation: { isRequired: false },
                }),
                logoAlt: fields.text({ label: 'Logo description (alt text)', validation: { isRequired: false } }),
              },
            }),
            YouthMomentsBlock: block({
              label: 'Youth moments',
              description: 'The signature youth tentpoles (trips, retreats), pulled live from the Youth moments list.',
              ContentView: ({ value }) => preview('Youth moments', value.heading || '', null),
              schema: {
                eyebrow: fields.text({ label: 'Eyebrow', validation: { isRequired: false } }),
                heading: fields.text({ label: 'Heading', validation: { isRequired: false } }),
              },
            }),
            QuoteCarousel: block({
              label: 'Quotes carousel',
              description: 'A rotating band of testimonials, pulled live from the Homepage quotes list.',
              ContentView: ({ value }) => preview('Quotes carousel', value.heading || '', null),
              schema: {
                eyebrow: fields.text({ label: 'Eyebrow', validation: { isRequired: false } }),
                heading: fields.text({ label: 'Heading', validation: { isRequired: false } }),
                intro: fields.text({ label: 'Intro line', multiline: true, validation: { isRequired: false } }),
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
            Roadmap: block({
              label: 'Roadmap',
              description: 'A numbered timeline — steps as nodes on a connecting line, each with a title and a line.',
              ContentView: ({ value }) => preview('Roadmap', `${(value.steps || []).length} step(s)`, null),
              schema: {
                eyebrow: fields.text({ label: 'Eyebrow', validation: { isRequired: false } }),
                heading: fields.text({ label: 'Heading', validation: { isRequired: false } }),
                steps: fields.array(
                  fields.object({
                    title: fields.text({ label: 'Title' }),
                    body: fields.text({ label: 'Text', multiline: true }),
                  }),
                  { label: 'Steps', itemLabel: (p) => p.fields.title.value || 'Step' }
                ),
              },
            }),
            Letter: wrapper({
              label: 'Letter',
              description: 'A personal letter — flowing prose beside a portrait, closing with a signature.',
              ContentView: ({ value, children }) =>
                preview('Letter', value.signoffName || '', thumb(value.image), children),
              schema: {
                image: fields.image({
                  label: 'Portrait (optional)',
                  directory: 'src/assets/images',
                  publicPath: '../../assets/images/',
                  validation: { isRequired: false },
                }),
                alt: fields.text({ label: 'Portrait description (alt text)', validation: { isRequired: false } }),
                signoffName: fields.text({ label: 'Signature — name', validation: { isRequired: false } }),
                signoffRole: fields.text({ label: 'Signature — role/title', validation: { isRequired: false } }),
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
