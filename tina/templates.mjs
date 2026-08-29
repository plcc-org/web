// @ts-check
// The editor's two field sets: `heroFields` (a page's hero, in frontmatter) and `templates`
// (every component an editor can insert into a page body).
//
// A block with prose inside it (a Split, a Callout) is a template with a field named
// `children` of type `rich-text` — Tina's MDX parser treats that name specially and maps
// it to the JSX element's children. A self-closing block is a template without one.
//
// `required` here is editor-side validation only: template fields serialise into the MDX
// body, not the GraphQL schema, so marking one can't fail the build the way a collection
// field can. `scripts/check-site.mjs` stays the backstop for alt text either way — it
// catches an image that was already saved, which is the case validation can't reach.
//
// Kept in .mjs so Node scripts and the CMS config can import it without a build step
// (the same reason as short-link-rules.mjs and video-rules.mjs).

import { checkVideoUrl } from './video-rules.mjs'

/** @typedef {Record<string, unknown>} FieldOpts */

/**
 * A wrapper block's prose.
 *
 * The toolbar is inline formatting only. `image` is absent because these blocks carry
 * their own image fields, and `embed` because TinaChildren.astro renders a block's body
 * with the inline overrides alone — a block nested inside a block would save fine and
 * then render as nothing. Everything else Tina offers (raw, table, code, mermaid,
 * highlight, strikethrough) has no styling anywhere in src/styles, so it's out too.
 *
 * Heading levels default to h3 and below: a wrapper block renders its own `heading`
 * field as an h2 (Band.astro), and the page hero owns the only h1. The exception is a
 * block whose heading is optional — pass ['h2', 'h3', 'h4'] there so prose in a
 * headingless one doesn't jump straight from h1 to h3.
 */
/** @type {(headingLevels?: string[]) => Record<string, unknown>} */
const children = (headingLevels = ['h3', 'h4']) => ({
  name: 'children',
  label: 'Content',
  type: 'rich-text',
  overrides: {
    toolbar: ['heading', 'link', 'quote', 'ul', 'ol', 'bold', 'italic'],
    headingLevels,
  },
})

/** @type {(name: string, label: string, opts?: FieldOpts) => Record<string, unknown>} */
const text = (name, label, opts = {}) => ({ name, label, type: 'string', ...opts })

/** @type {(name: string, label: string, opts?: FieldOpts) => Record<string, unknown>} */
const textarea = (name, label, opts = {}) => ({
  name,
  label,
  type: 'string',
  ui: { component: 'textarea' },
  ...opts,
})

/**
 * What an editor's pick must be stored as: `/assets/images/<file>`, the one shape a
 * deployed save round-trips unchanged (test/image-ref.test.ts traces why).
 *
 * The media picker hands the field the full CDN URL (TinaMediaStore.parse returns
 * `img.src`), and for an image field nested inside a rich-text object list —
 * PhotoBand photos, LogoCards cards — TinaCloud writes that form value into the MDX
 * verbatim: its cloud→relative rewrite covers only direct props (@tinacms/mdx,
 * stringifyProps). That code runs on TinaCloud's servers, so it can't be patched
 * here; normalising in the form is the seam we own. Runs only on change, so values
 * an editor never touches still take TinaCloud's own conversion.
 *
 * Uploads are flat under mediaRoot, so the basename is the identity. Idempotent
 * across every shape the CMS has produced — CDN URL, `/assets/images/…`, bare
 * filename, the historical mangles — which keeps it safe on either side of a Tina
 * upgrade. Deliberately separate from imageKey (src/lib/images.ts): that one is
 * render-side tolerance for anything already stored; this one defines the single
 * shape a save may write.
 *
 * Markdown-body inline images need no equivalent: they go through the server
 * resolver on both read and write.
 * @type {(value: unknown) => unknown}
 */
export const imageRef = (value) => {
  if (!value || typeof value !== 'string') return value
  const base = value.split('/').pop()?.split('?')[0]
  return base ? `/assets/images/${base}` : value
}

/** @type {(name: string, label: string, opts?: FieldOpts) => Record<string, unknown>} */
const image = (name, label, opts = {}) => ({
  name,
  label,
  type: 'image',
  ...opts,
  ui: { parse: imageRef, ...(typeof opts.ui === 'object' ? opts.ui : {}) },
})

// Note on defaults: `ui.defaultValue` is a no-op — tinacms never forwards it to
// the rendered field — so a block's starting values live in the template's
// `ui.defaultItem`, which insertMDX genuinely applies when the block is added.
// It must sit under `ui`: schema-tools' rich-text field resolution keeps only
// label/key/name/fields plus whatever `ui` carries, so a top-level defaultItem
// on a rich-text template is silently dropped (verified in the running editor).

/** @type {(name: string, label: string, opts?: FieldOpts) => Record<string, unknown>} */
const bool = (name, label, opts = {}) => ({
  name,
  label,
  type: 'boolean',
  ...opts,
})

/** A background-tone select. Labels are what the editor sees; values are the CSS tone. */
const TONE = {
  sand: { label: 'Sand', value: 'sand' },
  paper: { label: 'Paper (white)', value: 'paper' },
  forest: { label: 'Forest (dark)', value: 'forest' },
  none: { label: 'Plain (no band)', value: 'none' },
}
/** @type {(options: (keyof typeof TONE)[], opts?: FieldOpts) => Record<string, unknown>} */
const tone = (options, opts = {}) => ({
  name: 'tone',
  label: 'Background',
  type: 'string',
  options: options.map((o) => TONE[o]),
  ...opts,
})

/** Label a list's collapsed rows by one of its own fields, so a gallery isn't N identical bars. */
/** @type {(key: string, fallback: string) => Record<string, unknown>} */
const itemProps = (key, fallback) => ({
  itemProps: (/** @type {Record<string, string> | undefined} */ item) => ({
    label: item?.[key] || fallback,
  }),
})

/* ----------------------------------------------------------------------
 * Hero fields
 *
 * Which kind of hero a page gets is an explicit choice — the `variant` select
 * below — rather than something inferred from which optional fields happen to
 * be filled in. That inference is what this replaced: a photo hero was "the one
 * where `image` was set", so a photo hero saved without a photo silently became
 * a text-only header and nothing could flag it. `variant` is the discriminator
 * src/content.config.ts validates against, so now that mistake fails the build.
 *
 * It would be better still if picking a variant hid the fields it doesn't use,
 * and Tina can't do that. Two dead ends, both tried:
 *
 *   - Conditional visibility needs a React component in `ui.component` reading
 *     form state. This file is plain .mjs, importable without a build step, and
 *     config.ts deliberately holds no JSX.
 *   - `type: 'object'` with `templates` — the documented "pick a shape, see only
 *     its fields" mechanism — is only implemented for *lists*. Non-list is
 *     literally `component: field.list ? 'blocks' : 'not-implemented'`
 *     (@tinacms/schema-tools 2.8.3, the current release), and the form renders
 *     "Unrecognized field type" where the hero should be. Shipped once; don't
 *     try it again without checking that line first.
 *
 * So the variants are documented in each field's description instead, and the
 * editor reads rather than is shown. If Tina implements non-list templates, the
 * shape here maps onto them directly.
 *
 * `required` is deliberately absent except inside the photo list's image field.
 * These are collection fields: a required one becomes non-null in GraphQL, and
 * the indexer then rejects any already-saved page missing it (see the note in
 * tina/config.ts). Alt fields on photo slots are optional on purpose: blank
 * falls back to the photo catalog (see CATALOG_ALT above), and check-site.mjs
 * fails the build on an image that renders with no alt from either source.
 * -------------------------------------------------------------------- */

/** Which variants a field applies to, prepended to its description. */
/** @type {(which: string, rest: string) => string} */
const forVariants = (which, rest) => `Used by: ${which}. ${rest}`

/**
 * The description for every alt field on a *catalogued-photo* slot. Blank falls
 * back to the photo's entry in "Photo descriptions" (altFor, src/lib/photos.ts),
 * so the description is written once and inherited everywhere the photo appears.
 * Logo alt fields don't get this — logos aren't catalogued — and keep their own
 * required/validate treatment.
 */
const eyebrow = () =>
  text('eyebrow', 'Eyebrow', {
    description: 'A small label shown above the heading — e.g. “In the community”. Optional.',
  })

const CATALOG_ALT =
  'Usually leave this blank — the photo’s saved description (the “Photo descriptions” list) is used. Write one ' +
  'here only to say something specific to this page.'

/**
 * The variant the form currently has, wherever the callback finds itself: a field
 * nested under `hero` gets the whole document as `allValues`, but keep the direct
 * shape working too so the check can't silently die on a Tina change.
 * @type {(allValues: unknown) => string | undefined}
 */
const heroVariant = (allValues) => {
  const values = /** @type {{ hero?: { variant?: string }, variant?: string } | undefined} */ (allValues)
  return values?.hero?.variant ?? values?.variant
}

export const heroFields = [
  {
    name: 'variant',
    label: 'Kind of hero',
    type: 'string',
    options: [
      { label: 'Photo & text — a portrait photo beside the title', value: 'photo' },
      { label: 'Text only — a calm header, no photo', value: 'plain' },
      { label: 'Logo & photo — a programme wordmark instead of the title', value: 'wordmark' },
      { label: 'Cinematic — a full-width photo stack (the home page)', value: 'cinematic' },
    ],
    // No ui.defaultValue — it's a no-op (see the note above bool()). New pages
    // are seeded 'photo' by the collection's defaultItem in tina/config.ts.
    description:
      'Pick this first — it decides which fields below are used. Each field says which kinds it applies to, ' +
      'and anything a kind doesn’t use is ignored.',
  },
  // The two validates below mirror what the discriminated union in
  // src/content.config.ts will reject at build time — a "Photo & text" hero
  // saved without its photo used to preview fine and then fail a deploy the
  // editor never sees. Same rule, moved to where the editor is standing.
  image('image', 'Hero photo', {
    description: forVariants('Photo & text, Logo & photo', 'The single portrait photo beside the title.'),
    ui: {
      validate: (/** @type {unknown} */ value, /** @type {unknown} */ allValues) =>
        heroVariant(allValues) === 'photo' && !value ? 'A “Photo & text” hero needs a photo.' : undefined,
    },
  }),
  text('alt', 'Photo description (alt text)', {
    description: forVariants('Photo & text, Logo & photo', CATALOG_ALT),
  }),
  {
    name: 'photos',
    label: 'Photos (cinematic)',
    type: 'object',
    list: true,
    openFormOnCreate: true,
    description: forVariants('Cinematic', 'Shown in order, each cross-fading into the next. Around five works well.'),
    // No `ui.min: 1`, even though src/content.config.ts requires at least one photo for
    // a cinematic hero. `min` disables Delete at the floor, and this list is shared by
    // all four variants — a photo added by mistake on a Photo & text page could then
    // never be removed. The zod check is variant-aware; this field can't be.
    ui: itemProps('alt', 'Photo'),
    fields: [
      image('image', 'Photo', { required: true }),
      text('alt', 'Photo description (alt text)', { description: CATALOG_ALT }),
    ],
  },
  image('logo', 'Wordmark logo', {
    description: forVariants('Logo & photo', 'Stands in for the heading, e.g. the Pine Lake Kids wordmark.'),
    ui: {
      validate: (/** @type {unknown} */ value, /** @type {unknown} */ allValues) =>
        heroVariant(allValues) === 'wordmark' && !value ? 'A “Logo & photo” hero needs its wordmark logo.' : undefined,
    },
  }),
  text('logoAlt', 'Logo description (alt text)', {
    description: forVariants('Logo & photo', 'What the wordmark says, e.g. “Pine Lake Kids”.'),
    ui: {
      validate: (/** @type {unknown} */ value, /** @type {unknown} */ allValues) =>
        heroVariant(allValues) === 'wordmark' && !value
          ? 'A “Logo & photo” hero needs the logo description — it stands in for the page heading.'
          : undefined,
    },
  }),
  text('eyebrow', 'Eyebrow', { description: 'Used by: all. A small label shown above the heading.' }),
  text('subhead', 'Subhead', { description: 'Used by: all. A line between the heading and the intro.' }),
  textarea('lede', 'Intro line', {
    description: forVariants(
      'Photo & text, Text only, Logo & photo',
      'A one- or two-sentence opening. The heading comes from the page title. If it could describe any church, ' +
        'rewrite it with something only true of Pine Lake.'
    ),
  }),
  text('buttonLabel', 'Hero button label', { description: 'Used by: all. Optional.' }),
  text('buttonHref', 'Hero button link', { description: 'Used by: all. Optional.' }),
]

export const templates = [
  {
    name: 'Section',
    label: 'Rich text',
    description: 'A heading and formatted paragraphs — bold, links, lists. The default for written content.',
    // The only wrapper whose heading is optional, so its prose may be the first
    // thing under the page's h1 — h2 stays available here alone.
    fields: [eyebrow(), text('heading', 'Heading'), children(['h2', 'h3', 'h4'])],
  },
  {
    name: 'Split',
    label: 'Photo & text (split)',
    description:
      'A photo beside formatted text — left or right, on a tinted background. The main show-and-tell layout.',
    ui: { defaultItem: { tone: 'sand', reverse: false } },
    // `isTitle` puts the heading on the block's collapsed bar in the editor, so a
    // page of Splits doesn't read as identical grey bars. It demands
    // `required: true`, which on a template field is form-side only (see the top
    // of this file) — and every Split in the content already has a heading.
    // The same applies to the other isTitle fields below.
    fields: [
      image('image', 'Photo', { required: true }),
      text('alt', 'Photo description (alt text)', { description: CATALOG_ALT }),
      text('heading', 'Heading', { isTitle: true, required: true }),
      eyebrow(),
      bool('reverse', 'Photo on the right'),
      tone(['sand', 'paper', 'forest']),
      children(),
      text('buttonLabel', 'Button label', { description: '“Learn more” if left blank.' }),
      text('buttonHref', 'Button link', { description: 'Needed for the button to show — a label alone does nothing.' }),
    ],
  },
  {
    name: 'Callout',
    label: 'Callout',
    description: 'A small boxed aside that sets one point apart — a reassurance, a key fact, a heads-up.',
    fields: [text('heading', 'Heading', { isTitle: true, required: true }), children()],
  },
  {
    name: 'CaptionedPhoto',
    label: 'Photo',
    description: 'A single framed photo with an optional caption.',
    fields: [
      image('image', 'Photo', { required: true }),
      text('alt', 'Photo description (alt text)', { description: CATALOG_ALT }),
      text('caption', 'Caption'),
    ],
  },
  {
    name: 'Video',
    label: 'Video',
    description: 'A YouTube or Vimeo video in a photo-style frame — paste the link from your browser.',
    fields: [
      text('url', 'Video link', {
        required: true,
        // The same parse the renderer uses, so "will this link work?" is answered
        // in the form rather than by a broken preview.
        ui: { validate: (/** @type {unknown} */ value) => checkVideoUrl(value) },
        description:
          'The ordinary page address — https://www.youtube.com/watch?v=… or https://vimeo.com/… — not an embed code.',
      }),
      text('title', 'Video title', {
        isTitle: true,
        required: true,
        description: 'A few words saying what the video is — screen readers announce it, like a photo description.',
      }),
      text('caption', 'Caption'),
    ],
  },
  {
    // Was "Banner", a general-purpose tonal band with tone and flush as options.
    // Every one of its uses was a page's closing block, every one was forest, and
    // two of five had missed the flush tick its own description asked for — three
    // fields carrying no information and one already got wrong. Narrowing it to
    // the thing it was actually used for lets the layout be fixed in code.
    name: 'Closing',
    label: 'Closing banner',
    description:
      'The last block on a page — a dark band that closes it against the footer, with an optional button. A parting invitation.',
    fields: [
      eyebrow(),
      text('heading', 'Heading', { isTitle: true, required: true }),
      text('buttonLabel', 'Button label', { description: '“Learn more” if left blank.' }),
      text('buttonHref', 'Button link', { description: 'Needed for the button to show — a label alone does nothing.' }),
      children(),
    ],
  },
  {
    name: 'PhotoBand',
    label: 'Photo gallery',
    description: 'Several photos shown together as a staggered band — a visual break.',
    fields: [
      text('heading', 'Heading'),
      eyebrow(),
      {
        name: 'photos',
        label: 'Photos',
        type: 'object',
        list: true,
        openFormOnCreate: true,
        ui: itemProps('alt', 'Photo'),
        fields: [
          image('image', 'Photo', { required: true }),
          text('alt', 'Photo description (alt text)', { description: CATALOG_ALT }),
        ],
      },
    ],
  },
  {
    name: 'CardRow',
    label: 'Text cards',
    description: 'A row of small cards, each a short title and a line or two — for a few parallel points.',
    ui: { defaultItem: { columns: 'auto', large: false } },
    fields: [
      eyebrow(),
      text('heading', 'Heading'),
      textarea('intro', 'Intro', { description: 'An optional lead line shown above the cards.' }),
      {
        name: 'columns',
        label: 'Cards per row',
        type: 'string',
        options: [
          { label: 'Auto', value: 'auto' },
          { label: 'Two', value: '2' },
          { label: 'Three', value: '3' },
          { label: 'Four', value: '4' },
        ],
        description: 'Auto fits as many as will fit; a fixed count wraps the rest (e.g. four cards 2×2).',
      },
      bool('large', 'Large cards', {
        description: 'A roomier, more editorial card with a prominent serif title.',
      }),
      {
        name: 'cards',
        label: 'Cards',
        type: 'object',
        list: true,
        openFormOnCreate: true,
        ui: itemProps('title', 'Card'),
        fields: [
          text('title', 'Title', { required: true }),
          textarea('body', 'Text', { required: true }),
          text('href', 'Link (optional)', {
            description: 'Makes the whole card a link. The label below is optional.',
          }),
          text('linkLabel', 'Link label (optional)', {
            description: 'Shows a “label →” call-to-action at the foot of the card. Needs the link above.',
          }),
        ],
      },
    ],
  },
  {
    name: 'LinkCards',
    label: 'Link cards',
    description: 'A grid of cards that each link to another page — for signposting to related content.',
    fields: [
      text('heading', 'Heading', { isTitle: true, required: true }),
      {
        name: 'links',
        label: 'Links',
        type: 'object',
        list: true,
        openFormOnCreate: true,
        ui: itemProps('title', 'Link'),
        fields: [
          text('title', 'Title', { required: true }),
          text('meta', 'Description', { required: true }),
          text('href', 'Link', { required: true }),
        ],
      },
    ],
  },
  {
    name: 'Quote',
    label: 'Quote',
    description: 'A single featured pull-quote — a testimonial or short quotation set apart from the prose.',
    ui: { defaultItem: { tone: 'none' } },
    fields: [
      textarea('quote', 'Quote', { isTitle: true, required: true }),
      text('attribution', 'Attribution', {
        description: 'Who said it — e.g. "A recent attendee", or a scripture reference. Optional.',
      }),
      tone(['none', 'forest', 'sand', 'paper'], {
        description: 'Plain sets the quote in open space; a color renders it inside a band (a "verse band").',
      }),
    ],
  },
  {
    name: 'FeaturedEvents',
    label: 'Featured events',
    description:
      'A short list of upcoming events, pulled live from the events feed. In a stretch with no matching events, ' +
      'the block shows nothing at all.',
    ui: { defaultItem: { category: 'all', count: 3 } },
    fields: [
      text('heading', 'Heading'),
      {
        name: 'category',
        label: 'Category',
        type: 'string',
        description: 'Show only events tagged with this category.',
        options: [
          { label: 'All categories', value: 'all' },
          { label: 'Everyone', value: 'Everyone' },
          { label: 'Families', value: 'Families' },
          { label: 'Youth', value: 'Youth' },
          { label: 'Groups', value: 'Groups' },
          { label: 'Serve', value: 'Serve' },
        ],
      },
      {
        name: 'count',
        label: 'How many to show',
        type: 'number',
        description: 'Between 1 and 12; three fits most pages.',
        ui: {
          validate: (/** @type {unknown} */ value) =>
            typeof value === 'number' && (value < 1 || value > 12) ? 'Pick a number from 1 to 12.' : undefined,
        },
      },
    ],
  },
  {
    name: 'KeyPoints',
    label: 'Key points',
    description: 'A moss-accented grid of titled points — the core-tenets / emphases treatment.',
    ui: { defaultItem: { columns: '2' } },
    fields: [
      eyebrow(),
      text('heading', 'Heading'),
      {
        name: 'columns',
        label: 'Columns',
        type: 'string',
        options: [
          { label: 'Two across', value: '2' },
          { label: 'Three across', value: '3' },
        ],
      },
      {
        name: 'items',
        label: 'Points',
        type: 'object',
        list: true,
        openFormOnCreate: true,
        ui: itemProps('title', 'Point'),
        fields: [text('title', 'Title', { required: true }), textarea('body', 'Text', { required: true })],
      },
    ],
  },
  {
    name: 'LogoCards',
    label: 'Logo cards',
    description: 'A row of cards, each topped by a program or partner logo, with text and an optional link.',
    fields: [
      eyebrow(),
      text('heading', 'Heading', { isTitle: true, required: true }),
      {
        name: 'cards',
        label: 'Cards',
        type: 'object',
        list: true,
        openFormOnCreate: true,
        ui: itemProps('alt', 'Card'),
        fields: [
          image('image', 'Logo', { required: true }),
          text('alt', 'Logo description (alt text)', { required: true }),
          textarea('body', 'Text', { required: true }),
          text('linkLabel', 'Link label', { description: '“Learn more” if left blank.' }),
          text('href', 'Link URL', { description: 'Needed for the link to show — a label alone does nothing.' }),
        ],
      },
    ],
  },
  {
    name: 'Aside',
    label: 'Aside',
    description: 'A tinted note set apart from the page — formatted text beside an optional small logo.',
    fields: [
      eyebrow(),
      image('logo', 'Logo (optional)'),
      text('logoAlt', 'Logo description (alt text)', {
        description: 'What the logo says or shows. Needed whenever a logo is set.',
        ui: {
          validate: (/** @type {unknown} */ value, /** @type {unknown} */ allValues) =>
            /** @type {{ logo?: string } | undefined} */ (allValues)?.logo && !value
              ? 'A logo needs a description for people who can’t see it.'
              : undefined,
        },
      }),
      children(),
    ],
  },
  {
    name: 'YouthMomentsBlock',
    label: 'Youth moments',
    description: 'The signature youth tentpoles (trips, retreats), pulled live from the Youth moments list.',
    fields: [eyebrow(), text('heading', 'Heading')],
  },
  {
    name: 'QuoteCarousel',
    label: 'Quotes carousel',
    description: 'A rotating band of testimonials, pulled live from the Homepage quotes list.',
    ui: { defaultItem: { tone: 'sand' } },
    fields: [eyebrow(), text('heading', 'Heading'), textarea('intro', 'Intro line'), tone(['sand', 'paper', 'forest'])],
  },
  {
    name: 'Roadmap',
    label: 'Roadmap',
    description: 'A numbered timeline — steps as nodes on a connecting line, each with a title and a line.',
    fields: [
      eyebrow(),
      text('heading', 'Heading'),
      {
        name: 'steps',
        label: 'Steps',
        type: 'object',
        list: true,
        openFormOnCreate: true,
        ui: itemProps('title', 'Step'),
        fields: [text('title', 'Title', { required: true }), textarea('body', 'Text', { required: true })],
      },
    ],
  },
  {
    name: 'Letter',
    label: 'Letter',
    description: 'A personal letter — flowing prose beside a portrait, closing with a signature.',
    fields: [
      image('image', 'Portrait (optional)'),
      text('alt', 'Portrait description (alt text)', { description: CATALOG_ALT }),
      text('signoffName', 'Signature — name'),
      text('signoffRole', 'Signature — role/title'),
      children(),
    ],
  },
]

/**
 * The `rich-text` field definition the MDX parser/serializer expects.
 *
 * Deliberately without the `overrides` the same field carries in tina/config.ts: those
 * only constrain the editor's toolbar, and the harness parses and re-serialises rather
 * than editing. Nothing here needs to change when the toolbar does.
 */
export const bodyField = {
  name: 'content',
  label: 'Body',
  type: 'rich-text',
  isBody: true,
  templates,
}
