// The page block palette, ported from keystatic.config.ts's `fields.mdx({ components })`.
//
// Keystatic's `wrapper()` (a component with MDX children) becomes a template with a
// field named `children` of type `rich-text` — Tina's MDX parser treats that name
// specially. Keystatic's `block()` (self-closing) is a template without one.
//
// Kept in .mjs so the round-trip harness can import it without a build step.

const tone = (label, options, defaultValue) => ({
  name: 'tone',
  label,
  type: 'string',
  options,
  ui: { defaultValue },
})

const children = { name: 'children', label: 'Content', type: 'rich-text' }
const text = (name, label, opts = {}) => ({ name, label, type: 'string', ...opts })
const textarea = (name, label) => ({ name, label, type: 'string', ui: { component: 'textarea' } })
const image = (name, label) => ({ name, label, type: 'image' })
const bool = (name, label, defaultValue = false) => ({
  name,
  label,
  type: 'boolean',
  ui: { defaultValue },
})

export const templates = [
  {
    name: 'Section',
    label: 'Rich text',
    fields: [text('eyebrow', 'Eyebrow'), text('heading', 'Heading'), children],
  },
  {
    name: 'Split',
    label: 'Photo & text (split)',
    fields: [
      image('image', 'Photo'),
      text('alt', 'Photo description (alt text)'),
      text('heading', 'Heading'),
      text('eyebrow', 'Eyebrow'),
      bool('reverse', 'Photo on the right'),
      tone('Background', ['sand', 'paper', 'forest'], 'sand'),
      children,
    ],
  },
  {
    name: 'Callout',
    label: 'Callout',
    fields: [text('heading', 'Heading'), children],
  },
  {
    name: 'CaptionedPhoto',
    label: 'Photo',
    fields: [image('image', 'Photo'), text('alt', 'Photo description (alt text)'), text('caption', 'Caption')],
  },
  {
    name: 'Video',
    label: 'Video',
    fields: [text('url', 'Video link'), text('title', 'Video title'), text('caption', 'Caption')],
  },
  {
    name: 'Cta',
    label: 'Banner',
    fields: [
      tone('Background', ['forest', 'sand', 'paper'], 'forest'),
      text('eyebrow', 'Eyebrow'),
      text('heading', 'Heading'),
      text('buttonLabel', 'Button label'),
      text('buttonHref', 'Button link'),
      bool('flush', 'Sit flush against the footer'),
      children,
    ],
  },
  {
    name: 'PhotoBand',
    label: 'Photo gallery',
    fields: [
      text('heading', 'Heading'),
      text('eyebrow', 'Eyebrow'),
      {
        name: 'photos',
        label: 'Photos',
        type: 'object',
        list: true,
        fields: [image('image', 'Photo'), text('alt', 'Photo description (alt text)')],
      },
    ],
  },
  {
    name: 'CardRow',
    label: 'Text cards',
    fields: [
      text('eyebrow', 'Eyebrow'),
      text('heading', 'Heading'),
      textarea('intro', 'Intro'),
      {
        name: 'columns',
        label: 'Cards per row',
        type: 'string',
        options: ['auto', '2', '3', '4'],
        ui: { defaultValue: 'auto' },
      },
      bool('large', 'Large cards'),
      {
        name: 'cards',
        label: 'Cards',
        type: 'object',
        list: true,
        fields: [
          text('title', 'Title'),
          textarea('body', 'Text'),
          text('href', 'Link (optional)'),
          text('linkLabel', 'Link label (optional)'),
        ],
      },
    ],
  },
  {
    name: 'LinkCards',
    label: 'Link cards',
    fields: [
      text('heading', 'Heading'),
      {
        name: 'links',
        label: 'Links',
        type: 'object',
        list: true,
        fields: [text('title', 'Title'), text('meta', 'Description'), text('href', 'Link')],
      },
    ],
  },
  {
    name: 'Quote',
    label: 'Quote',
    fields: [
      textarea('quote', 'Quote'),
      text('attribution', 'Attribution'),
      tone('Background', ['none', 'forest', 'sand', 'paper'], 'none'),
    ],
  },
  {
    name: 'FeaturedEvents',
    label: 'Featured events',
    fields: [
      text('heading', 'Heading'),
      {
        name: 'category',
        label: 'Category',
        type: 'string',
        options: ['all', 'Everyone', 'Families', 'Youth', 'Groups', 'Serve'],
        ui: { defaultValue: 'all' },
      },
      { name: 'count', label: 'How many to show', type: 'number', ui: { defaultValue: 3 } },
    ],
  },
  {
    name: 'KeyPoints',
    label: 'Key points',
    fields: [
      text('eyebrow', 'Eyebrow'),
      text('heading', 'Heading'),
      {
        name: 'columns',
        label: 'Columns',
        type: 'string',
        options: ['2', '3'],
        ui: { defaultValue: '2' },
      },
      {
        name: 'items',
        label: 'Points',
        type: 'object',
        list: true,
        fields: [text('title', 'Title'), textarea('body', 'Text')],
      },
    ],
  },
  {
    name: 'LogoCards',
    label: 'Logo cards',
    fields: [
      text('eyebrow', 'Eyebrow'),
      text('heading', 'Heading'),
      {
        name: 'cards',
        label: 'Cards',
        type: 'object',
        list: true,
        fields: [
          image('image', 'Logo'),
          text('alt', 'Logo description (alt text)'),
          textarea('body', 'Text'),
          text('linkLabel', 'Link label'),
          text('href', 'Link URL'),
        ],
      },
    ],
  },
  {
    name: 'Aside',
    label: 'Aside',
    fields: [
      text('eyebrow', 'Eyebrow'),
      image('logo', 'Logo (optional)'),
      text('logoAlt', 'Logo description (alt text)'),
      children,
    ],
  },
  {
    name: 'YouthMomentsBlock',
    label: 'Youth moments',
    fields: [text('eyebrow', 'Eyebrow'), text('heading', 'Heading')],
  },
  {
    name: 'QuoteCarousel',
    label: 'Quotes carousel',
    fields: [
      text('eyebrow', 'Eyebrow'),
      text('heading', 'Heading'),
      textarea('intro', 'Intro line'),
      tone('Background', ['sand', 'paper', 'forest'], 'sand'),
    ],
  },
  {
    name: 'Roadmap',
    label: 'Roadmap',
    fields: [
      text('eyebrow', 'Eyebrow'),
      text('heading', 'Heading'),
      {
        name: 'steps',
        label: 'Steps',
        type: 'object',
        list: true,
        fields: [text('title', 'Title'), textarea('body', 'Text')],
      },
    ],
  },
  {
    name: 'Letter',
    label: 'Letter',
    fields: [
      image('image', 'Portrait (optional)'),
      text('alt', 'Portrait description (alt text)'),
      text('signoffName', 'Signature — name'),
      text('signoffRole', 'Signature — role/title'),
      children,
    ],
  },
]

/** The `rich-text` field definition the MDX parser/serializer expects. */
export const bodyField = {
  name: 'content',
  label: 'Body',
  type: 'rich-text',
  isBody: true,
  templates,
}
