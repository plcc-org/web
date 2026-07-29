// The page block palette: every component an editor can insert into a page body.
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
// Kept in .mjs so the round-trip harness (spike/roundtrip.mjs) can import it without a
// build step.

const children = { name: 'children', label: 'Content', type: 'rich-text' }
const text = (name, label, opts = {}) => ({ name, label, type: 'string', ...opts })
const textarea = (name, label, opts = {}) => ({
  name,
  label,
  type: 'string',
  ui: { component: 'textarea' },
  ...opts,
})
const image = (name, label, opts = {}) => ({ name, label, type: 'image', ...opts })
const bool = (name, label, defaultValue = false, opts = {}) => ({
  name,
  label,
  type: 'boolean',
  ui: { defaultValue },
  ...opts,
})

/** A background-tone select. Labels are what the editor sees; values are the CSS tone. */
const TONE = {
  sand: { label: 'Sand', value: 'sand' },
  paper: { label: 'Paper (white)', value: 'paper' },
  forest: { label: 'Forest (dark)', value: 'forest' },
  none: { label: 'Plain (no band)', value: 'none' },
}
const tone = (options, defaultValue, opts = {}) => ({
  name: 'tone',
  label: 'Background',
  type: 'string',
  options: options.map((o) => TONE[o]),
  ui: { defaultValue },
  ...opts,
})

/** Label a list's collapsed rows by one of its own fields, so a gallery isn't N identical bars. */
const itemProps = (key, fallback) => ({ itemProps: (item) => ({ label: item?.[key] || fallback }) })

export const templates = [
  {
    name: 'Section',
    label: 'Rich text',
    description: 'A heading and formatted paragraphs — bold, links, lists. The default for written content.',
    fields: [text('eyebrow', 'Eyebrow (small label above the heading)'), text('heading', 'Heading'), children],
  },
  {
    name: 'Split',
    label: 'Photo & text (split)',
    description:
      'A photo beside formatted text — left or right, on a tinted background. The main show-and-tell layout.',
    fields: [
      image('image', 'Photo', { required: true }),
      text('alt', 'Photo description (alt text)', { required: true }),
      text('heading', 'Heading'),
      text('eyebrow', 'Eyebrow'),
      bool('reverse', 'Photo on the right'),
      tone(['sand', 'paper', 'forest'], 'sand'),
      children,
    ],
  },
  {
    name: 'Callout',
    label: 'Callout',
    description: 'A small boxed aside that sets one point apart — a reassurance, a key fact, a heads-up.',
    fields: [text('heading', 'Heading'), children],
  },
  {
    name: 'CaptionedPhoto',
    label: 'Photo',
    description: 'A single framed photo with an optional caption.',
    fields: [
      image('image', 'Photo', { required: true }),
      text('alt', 'Photo description (alt text)', { required: true }),
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
        description:
          'The ordinary page address — https://www.youtube.com/watch?v=… or https://vimeo.com/… — not an embed code.',
      }),
      text('title', 'Video title', {
        required: true,
        description: 'A few words saying what the video is — screen readers announce it, like a photo description.',
      }),
      text('caption', 'Caption'),
    ],
  },
  {
    name: 'Cta',
    label: 'Banner',
    description:
      'A full-width colored band that interrupts the page to make a statement, with an optional button — a welcome, an invitation, a closing message.',
    fields: [
      tone(['forest', 'sand', 'paper'], 'forest'),
      text('eyebrow', 'Eyebrow'),
      text('heading', 'Heading'),
      text('buttonLabel', 'Button label'),
      text('buttonHref', 'Button link'),
      bool('flush', 'Sit flush against the footer', false, {
        description: 'Use only when this banner is the last block on the page.',
      }),
      children,
    ],
  },
  {
    name: 'PhotoBand',
    label: 'Photo gallery',
    description: 'Several photos shown together as a staggered band — a visual break.',
    fields: [
      text('heading', 'Heading'),
      text('eyebrow', 'Eyebrow'),
      {
        name: 'photos',
        label: 'Photos',
        type: 'object',
        list: true,
        ui: itemProps('alt', 'Photo'),
        fields: [
          image('image', 'Photo', { required: true }),
          text('alt', 'Photo description (alt text)', { required: true }),
        ],
      },
    ],
  },
  {
    name: 'CardRow',
    label: 'Text cards',
    description: 'A row of small cards, each a short title and a line or two — for a few parallel points.',
    fields: [
      text('eyebrow', 'Eyebrow'),
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
        ui: { defaultValue: 'auto' },
        description: 'Auto fits as many as will fit; a fixed count wraps the rest (e.g. four cards 2×2).',
      },
      bool('large', 'Large cards', false, {
        description: 'A roomier, more editorial card with a prominent serif title.',
      }),
      {
        name: 'cards',
        label: 'Cards',
        type: 'object',
        list: true,
        ui: itemProps('title', 'Card'),
        fields: [
          text('title', 'Title', { required: true }),
          textarea('body', 'Text', { required: true }),
          text('href', 'Link (optional)'),
          text('linkLabel', 'Link label (optional)', {
            description: 'Shows a “label →” call-to-action at the foot of the card.',
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
      text('heading', 'Heading'),
      {
        name: 'links',
        label: 'Links',
        type: 'object',
        list: true,
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
    fields: [
      textarea('quote', 'Quote', { required: true }),
      text('attribution', 'Attribution', {
        description: 'Who said it — e.g. "A recent attendee", or a scripture reference. Optional.',
      }),
      tone(['none', 'forest', 'sand', 'paper'], 'none', {
        description: 'Plain sets the quote in open space; a color renders it inside a band (a "verse band").',
      }),
    ],
  },
  {
    name: 'FeaturedEvents',
    label: 'Featured events',
    description: 'A short list of upcoming events, pulled live from the events feed.',
    fields: [
      text('heading', 'Heading'),
      {
        name: 'category',
        label: 'Category',
        type: 'string',
        options: [
          { label: 'All categories', value: 'all' },
          { label: 'Everyone', value: 'Everyone' },
          { label: 'Families', value: 'Families' },
          { label: 'Youth', value: 'Youth' },
          { label: 'Groups', value: 'Groups' },
          { label: 'Serve', value: 'Serve' },
        ],
        ui: { defaultValue: 'all' },
      },
      { name: 'count', label: 'How many to show', type: 'number', ui: { defaultValue: 3 } },
    ],
  },
  {
    name: 'KeyPoints',
    label: 'Key points',
    description: 'A moss-accented grid of titled points — the core-tenets / emphases treatment.',
    fields: [
      text('eyebrow', 'Eyebrow'),
      text('heading', 'Heading'),
      {
        name: 'columns',
        label: 'Columns',
        type: 'string',
        options: [
          { label: 'Two across', value: '2' },
          { label: 'Three across', value: '3' },
        ],
        ui: { defaultValue: '2' },
      },
      {
        name: 'items',
        label: 'Points',
        type: 'object',
        list: true,
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
      text('eyebrow', 'Eyebrow'),
      text('heading', 'Heading'),
      {
        name: 'cards',
        label: 'Cards',
        type: 'object',
        list: true,
        ui: itemProps('alt', 'Card'),
        fields: [
          image('image', 'Logo', { required: true }),
          text('alt', 'Logo description (alt text)', { required: true }),
          textarea('body', 'Text', { required: true }),
          text('linkLabel', 'Link label'),
          text('href', 'Link URL'),
        ],
      },
    ],
  },
  {
    name: 'Aside',
    label: 'Aside',
    description: 'A tinted note set apart from the page — formatted text beside an optional small logo.',
    fields: [
      text('eyebrow', 'Eyebrow'),
      image('logo', 'Logo (optional)'),
      text('logoAlt', 'Logo description (alt text)', {
        description: 'Required only when a logo is set.',
      }),
      children,
    ],
  },
  {
    name: 'YouthMomentsBlock',
    label: 'Youth moments',
    description: 'The signature youth tentpoles (trips, retreats), pulled live from the Youth moments list.',
    fields: [text('eyebrow', 'Eyebrow'), text('heading', 'Heading')],
  },
  {
    name: 'QuoteCarousel',
    label: 'Quotes carousel',
    description: 'A rotating band of testimonials, pulled live from the Homepage quotes list.',
    fields: [
      text('eyebrow', 'Eyebrow'),
      text('heading', 'Heading'),
      textarea('intro', 'Intro line'),
      tone(['sand', 'paper', 'forest'], 'sand'),
    ],
  },
  {
    name: 'Roadmap',
    label: 'Roadmap',
    description: 'A numbered timeline — steps as nodes on a connecting line, each with a title and a line.',
    fields: [
      text('eyebrow', 'Eyebrow'),
      text('heading', 'Heading'),
      {
        name: 'steps',
        label: 'Steps',
        type: 'object',
        list: true,
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
      text('alt', 'Portrait description (alt text)', {
        description: 'Required only when a portrait is set.',
      }),
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
