import { defineConfig } from 'tinacms'
// @ts-expect-error — plain-JS template palette, shared with the spike harness.
import { templates, heroFields } from './templates.mjs'

// CMS configuration. The `pages` collection carries the page frontmatter (including the
// nested `hero` object) and an 18-component body palette; the other three are YAML data
// files with no body. Must stay aligned with src/content.config.ts, which Astro validates
// the same files against at build time — see docs/cms.md.
//
// Collection order is the sidebar order, and it is the running order in docs/cms.md's
// "What's editable" table: `pages` first because it's what an editor is nearly always
// here for, then the shared lists that feed page blocks, then `shortLinks` — routing
// config rather than content, and the least often touched.
//
// A note on `required`: on a collection field it becomes a non-null GraphQL field, so the
// indexer rejects any existing document missing it and the build fails. Every one below was
// checked against the real content first. On a rich-text *template* field (tina/templates.mjs)
// it's editor-side validation only, with no build risk.
export default defineConfig({
  // Credentials come from the environment, never the repo. With both present,
  // scripts/build.mjs switches to `--content=local` and the deployed admin and
  // /tina-island talk to TinaCloud; with neither, the build emits a local client
  // and everything still works offline — which is what CI and a fresh clone get.
  // TINA_TOKEN is a secret and must stay one; the client ID is public by design
  // (it ships inside the admin bundle).
  //
  // `branch` is the branch a deployed editor commits to, and the one TinaCloud
  // indexes. It only matters when talking to the cloud; local builds read the
  // working tree.
  branch: process.env.TINA_BRANCH || 'main',
  clientId: process.env.PUBLIC_TINA_CLIENT_ID || null,
  token: process.env.TINA_TOKEN || null,
  localContentPath: undefined,
  build: { outputFolder: 'admin', publicFolder: 'public' },
  media: {
    tina: {
      // Our photo bytes live in src/assets/images so Astro's sharp pipeline can
      // process them, not in public/. imageFromRef (src/lib/images.ts) strips
      // everything up to `assets/images/`, so this path shape resolves as-is.
      publicFolder: 'src',
      mediaRoot: 'assets/images',
    },
  },
  schema: {
    collections: [
      {
        name: 'pages',
        label: 'Pages',
        path: 'src/content/pages',
        format: 'mdx',
        // Visual editing opens this URL in the admin iframe — the real page, now
        // that src/pages/[...slug].astro renders through Tina and carries the
        // field metadata the bridge maps clicks onto. `index.mdx` is the home
        // page and lives at `/`, not `/index/`; getStaticPaths carries the same
        // special case, and without it here the editor's preview opens on a 404.
        ui: {
          router: ({ document }) => {
            const crumbs = document._sys.breadcrumbs
            return crumbs.length === 1 && crumbs[0] === 'index' ? '/' : `/${crumbs.join('/')}/`
          },
        },
        // New pages start unpublished, as they did under the previous CMS. Without
        // this a page goes live the moment it's created.
        defaultItem: () => ({ draft: true }),
        fields: [
          {
            name: 'title',
            label: 'Title',
            type: 'string',
            isTitle: true,
            required: true,
            description: 'Also the page address — "MOMCo" → /momco/.',
          },
          {
            name: 'seoTitle',
            label: 'SEO title',
            type: 'string',
            description:
              'Optional. Overrides the browser-tab title, which is otherwise the page title followed by ' +
              '“| Pine Lake Covenant Church”. Only the home page needs this.',
          },
          {
            name: 'seoDescription',
            label: 'SEO description',
            type: 'string',
            description: 'A one-sentence summary for search results and link previews.',
          },
          {
            name: 'draft',
            label: 'Draft',
            type: 'boolean',
            description:
              "New pages start as drafts — they're visible in preview but not published. Untick to publish when ready.",
          },
          {
            name: 'hero',
            label: 'Hero',
            type: 'object',
            // A `variant` select decides which of these fields apply. It is not
            // `templates` — that would show only the chosen shape's fields, but
            // Tina implements object templates for lists only, and a non-list one
            // renders as "Unrecognized field type". See the note in templates.mjs.
            fields: heroFields,
          },
          {
            name: 'content',
            label: 'Body',
            type: 'rich-text',
            isBody: true,
            templates,
            description:
              'Type prose; use the insert menu to add styled blocks. Two habits carry most of the voice: start ' +
              'with the reader’s situation rather than our programme (“When life is overwhelming…”, not “We have ' +
              'a meals ministry”), and keep anything that changes — dates, times, one-off events — on What’s On ' +
              'rather than here.',
          },
        ],
      },
      {
        name: 'leadership',
        label: 'Leadership',
        path: 'src/content/leadership',
        format: 'yaml',
        defaultItem: () => ({ order: 0 }),
        fields: [
          { name: 'name', label: 'Name', type: 'string', isTitle: true, required: true },
          { name: 'title', label: 'Role / title', type: 'string', required: true },
          { name: 'portrait', label: 'Portrait', type: 'image', required: true },
          {
            name: 'portraitAlt',
            label: 'Portrait description (alt text)',
            type: 'string',
            required: true,
          },
          {
            name: 'bio',
            label: 'Bio',
            type: 'string',
            required: true,
            ui: { component: 'textarea' },
          },
          {
            name: 'order',
            label: 'Order',
            type: 'number',
            description: 'Lower numbers come first on the leadership page.',
          },
          {
            name: 'link',
            label: 'Link (optional)',
            type: 'object',
            fields: [
              { name: 'label', label: 'Link label', type: 'string' },
              { name: 'href', label: 'Link URL', type: 'string' },
            ],
          },
        ],
      },
      {
        name: 'youthMoments',
        label: 'Youth moments',
        path: 'src/content/youth-moments',
        format: 'yaml',
        defaultItem: () => ({ featured: false, order: 0 }),
        fields: [
          { name: 'title', label: 'Title', type: 'string', isTitle: true, required: true },
          {
            name: 'when',
            label: 'When',
            type: 'string',
            required: true,
            description: 'A human label — a date range ("August 10–17, 2026") or a cadence ("Each spring").',
          },
          {
            name: 'blurb',
            label: 'Blurb',
            type: 'string',
            required: true,
            ui: { component: 'textarea' },
          },
          {
            name: 'featured',
            label: 'Featured',
            type: 'boolean',
            description: 'Featured moments get a large card; the rest fall into a compact list.',
          },
          { name: 'order', label: 'Order', type: 'number' },
          {
            name: 'link',
            label: 'Link (optional)',
            type: 'object',
            fields: [
              { name: 'label', label: 'Link label', type: 'string' },
              { name: 'href', label: 'Link URL', type: 'string' },
            ],
          },
        ],
      },
      // One short ordered list in one YAML file. Tina has no singleton type, so it
      // sits in its own directory and is modelled as a one-document collection:
      // `allowedActions` removes create and delete, so the one file is the only file
      // and an editor can't add a second or remove it.
      //
      // Deliberately NOT `ui.global`. That flag moves a collection out of the sidebar
      // list into a separate settings area, which is right for the site configuration
      // it marks in Tina's own starter and wrong for this — it's content that happens
      // to live in one file, and splitting the sidebar in two hid half the editable
      // lists from the people who edit them. See docs/cms.md.
      {
        name: 'homeQuotes',
        label: 'Homepage quotes',
        path: 'src/content/quotes',
        format: 'yaml',
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          {
            name: 'quotes',
            label: 'Quotes',
            type: 'object',
            list: true,
            ui: { itemProps: (item) => ({ label: item?.by || item?.id || 'Quote' }) },
            fields: [
              { name: 'id', label: 'ID', type: 'string', required: true },
              { name: 'order', label: 'Order', type: 'number' },
              {
                name: 'text',
                label: 'Quote',
                type: 'string',
                required: true,
                ui: { component: 'textarea' },
              },
              { name: 'by', label: 'Attribution', type: 'string' },
            ],
          },
        ],
      },
      {
        name: 'shortLinks',
        label: 'Short links',
        path: 'src/content/short-links',
        format: 'yaml',
        // Tina has no list-view column configuration, so a 55-entry list shows
        // filenames only. Marking the fields you'd actually search by keeps a
        // link findable by the address printed on the flyer. See docs/cms.md.
        defaultItem: () => ({ kind: 'shortcut', permanent: false }),
        fields: [
          {
            name: 'name',
            label: 'Name',
            type: 'string',
            isTitle: true,
            required: true,
            searchable: true,
            description: 'Just a label for this list — it does not appear anywhere on the site.',
          },
          {
            name: 'from',
            label: 'Old address',
            type: 'string',
            required: true,
            searchable: true,
            description:
              'The address people are typing or following, starting with a slash — "/camp" for plcc.org/camp. ' +
              'It can have several parts, e.g. "/connect/about/leadership-team/".',
          },
          {
            name: 'destination',
            label: 'Sends people to',
            type: 'string',
            searchable: true,
            description:
              'Either a full address elsewhere (https://plcc.churchcenter.com/…) or a page on this site, ' +
              'written with slashes at both ends — "/visit/". Leave empty for a page that is gone for good.',
          },
          {
            name: 'kind',
            label: 'What kind of link is this?',
            type: 'string',
            required: true,
            options: [
              { label: 'A shortcut to a sign-up or another site', value: 'shortcut' },
              { label: 'A page that has permanently moved', value: 'moved' },
              { label: 'A page that is gone for good', value: 'gone' },
            ],
            description:
              'A shortcut stays ours to re-point later — use it for sign-ups and anything that changes year to year. ' +
              'Only pick "permanently moved" for a page that has genuinely moved for good: browsers remember those ' +
              'more or less forever, and it cannot be taken back. "Gone for good" tells search engines to drop the ' +
              'page rather than keep checking — use it when there is nowhere honest to send people.',
          },
          {
            name: 'permanent',
            label: 'This link never needs reviewing',
            type: 'boolean',
            description:
              'Only for a link to something the church simply has — the podcast, the giving page. Leave this ' +
              'unticked and set a date below for anything that could stop being true. If you tick it, leave the ' +
              'date empty.',
          },
          {
            name: 'expires',
            label: 'Review by',
            type: 'datetime',
            description:
              'Every short link gets a date so the list stays honest — otherwise nobody dares delete anything ' +
              'because nobody remembers what it was for. A sign-up shortcut: the date the thing it points at ends. ' +
              'A moved page: about a year, by which point search engines have caught up. The link keeps working ' +
              'past this date; the date is a prompt to check, not a switch. Required unless the box above is ticked.',
          },
          {
            name: 'note',
            label: 'What is this for?',
            type: 'string',
            searchable: true,
            ui: { component: 'textarea' },
            description: 'A line for whoever looks at this next — including what would need to change to renew it.',
          },
        ],
      },
    ],
  },
})
