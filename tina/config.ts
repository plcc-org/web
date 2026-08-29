import { defineConfig } from 'tinacms'
// @ts-expect-error — plain-JS template palette, shared with Node scripts.
import { templates, heroFields, imageRef } from './templates.mjs'
// @ts-expect-error — plain-JS, shared with scripts/generate-redirects.mjs.
import { checkFrom, checkDestination, checkReview } from './short-link-rules.mjs'

/**
 * A page address: lowercase, hyphen-separated, slashes kept so a page can sit in a
 * folder. Used for both halves of the filename field — see the note on `filename` below
 * for why one function can't cover it.
 *
 * Accents fold to their base letters (Café → cafe) rather than vanishing, and slash
 * runs collapse with their surrounding hyphens ("About / Us" → about/us) — Tina's own
 * filename guard permits leading, trailing and doubled slashes, each of which makes a
 * broken URL.
 */
const slug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, '-')
    .replace(/-*\/+-*/g, '/')
    .replace(/-+/g, '-')
    .replace(/^[-/]+|[-/]+$/g, '')

/** The flat form for data files (leadership, youth moments, short links): no folders. */
const flatSlug = (value: string) => slug(value).replace(/\//g, '-')

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
  // TINA_TOKEN is a secret and must stay one; the client ID is public by design.
  //
  // Both are read here in Node, at build time. Note what that means for anything
  // added alongside them: the CLI inlines only TINA_PUBLIC_*, NEXT_PUBLIC_*,
  // NODE_ENV and HEAD into the admin bundle's `process.env` (filterPublicEnv in
  // @tinacms/cli), so `PUBLIC_TINA_CLIENT_ID` is undefined in the browser and the
  // browser-side copy of this config sees `clientId: null`. Nothing depends on it:
  // the CLI bakes the ID into the content API URL, and the admin reads that. But a
  // future PUBLIC_* variable meant for admin code would silently be undefined —
  // name it TINA_PUBLIC_* if it needs to reach the browser.
  //
  // `branch` is the branch a deployed editor commits to, and the one TinaCloud
  // indexes. It only matters when talking to the cloud; local builds read the
  // working tree.
  branch: process.env.TINA_BRANCH || 'main',
  clientId: process.env.PUBLIC_TINA_CLIENT_ID || null,
  token: process.env.TINA_TOKEN || null,
  localContentPath: undefined,
  build: { outputFolder: 'admin', publicFolder: 'public' },
  // A per-document link out to the file's commit history on GitHub, so "when did this
  // change, and who changed it" is answerable from the editor.
  //
  // The two admin views disagree about what they hand this callback: the visual-editing
  // header passes the form's repo-relative path ("src/content/pages/families.mdx"), the
  // collection-edit header the collection-relative one ("families.mdx"), and nothing
  // else — no collection — comes with it. A repo-relative path passes through untouched.
  // A bare `.mdx` can only be a page (the one mdx collection), so it gets that prefix.
  // A bare YAML filename could belong to any of the sibling YAML collections, so it
  // drops the button instead: a history link pointing at the wrong file is worse than
  // none.
  repoProvider: {
    defaultBranchName: 'main',
    historyUrl: ({ relativePath, branch }) => {
      const path = relativePath.startsWith('src/')
        ? relativePath
        : relativePath.endsWith('.mdx')
          ? `src/content/pages/${relativePath}`
          : ''
      return {
        url: path ? `https://github.com/plcc-org/web/commits/${branch}/${path}` : '',
      }
    },
  },
  media: {
    tina: {
      // Our photo bytes live in src/assets/images so Astro's sharp pipeline can
      // process them, not in public/. imageFromRef (src/lib/images.ts) strips
      // everything up to `assets/images/`, so this path shape resolves as-is.
      publicFolder: 'src',
      mediaRoot: 'assets/images',
    },
    // Exactly the formats the glob in src/lib/images.ts resolves. Tina's default
    // accepts far more — HEIC, SVG, PDF, video, 3D models — and anything outside
    // this list uploads cleanly and then doesn't render: imageFromRef finds no
    // loader, returns undefined, and the photo silently disappears. A volunteer
    // uploading straight from an iPhone is the case this exists for.
    accept: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
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
          // The filename is the URL, so it's the first thing an editor sees rather than
          // the last. Tina seeds it from the title and stops the moment the field is
          // edited, so a long title can still get a short address — "Church Safety
          // Policy" at /safety/, not /church-safety-policy/. That's the case this exists
          // for; buried at the foot of the form, nobody noticed the choice was theirs.
          //
          // The field renders locked behind a padlock and unlocks on click, which is
          // Tina's own affordance, not something set here — hence "click it" in the
          // description rather than "type over it".
          //
          // `slugify` is spelled out rather than left to the `isTitle` default, because
          // that default is `replace(/ /g, '-').replace(/[^a-zA-Z0-9-]/g, '')` — it keeps
          // capitals, so "Church Safety Policy" seeds `Church-Safety-Policy` and the page
          // ships at /Church-Safety-Policy/. `parse` can't save it: the seed is written
          // with form.change(), which bypasses field-level parse. Both are needed —
          // `slugify` for the seed, `parse` for what an editor types.
          //
          // No `readonly`: renaming has to stay possible.
          filename: {
            showFirst: true,
            description:
              'The page address: "safety" makes plcc.org/safety/. It starts from the title — click it to set your ' +
              'own, and it stops following. Keep it short: these get read aloud and printed on things. Lowercase ' +
              'letters, numbers and hyphens. Changing it later breaks every existing link to the page.',
            slugify: (values) => slug(values?.title ?? ''),
            parse: (value) => slug(value),
          },
        },
        // New pages start unpublished, as they did under the previous CMS. Without
        // this a page goes live the moment it's created.
        //
        // `hero.variant` must be seeded here: Tina's select renders with no
        // placeholder option, so an empty value *displays* as the first option
        // ("Photo & text") while the stored value stays '' — and the untouched
        // page then fails the discriminated-union check in src/content.config.ts
        // on a save the editor was shown as complete. (Field-level
        // `ui.defaultValue` can't do this: tinacms never forwards it to the
        // rendered field — only defaultItem works.)
        defaultItem: () => ({ draft: true, hero: { variant: 'photo' } }),
        fields: [
          {
            name: 'title',
            label: 'Title',
            type: 'string',
            isTitle: true,
            required: true,
            description:
              'The page’s heading, and its name in the browser tab. The address is the separate field above — ' +
              'it starts from this, but the two don’t have to match.',
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
            ui: { component: 'textarea' },
            description:
              'A one-sentence summary for search results and link previews — aim for under about 155 characters, ' +
              'or search engines trim it mid-sentence.',
          },
          {
            name: 'draft',
            label: 'Hidden from the public site (draft)',
            type: 'boolean',
            description:
              'New pages start hidden — visible in preview, not published. Untick to put the page live on the next save.',
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
            // The toolbar is trimmed to the controls this site can actually render.
            // Raw HTML, tables, code, code blocks, mermaid, highlight and strikethrough
            // are all offered by default and none of them are styled anywhere in
            // src/styles — an editor reaching one produces output nobody designed. This
            // is the same principle as `npm run lint:css`: enforced, not requested.
            //
            // Headings stop at h2 because the hero renders the page's only h1, and at h4
            // because base.css styles h1–h4 and nothing below. Both settings are UI-only:
            // content already saved with a disallowed level still renders.
            //
            // `embed` leads because this list is also the drop order: the toolbar renders
            // left to right and pushes whatever doesn't fit into an overflow menu, so the
            // tail is what disappears. It disappears at the width visual editing actually
            // runs at — the sidebar, not the full-width form — and the block insert menu
            // is the control a page body is mostly built out of. Anywhere but first, it's
            // the first thing an editor loses.
            overrides: {
              toolbar: ['embed', 'heading', 'link', 'image', 'quote', 'ul', 'ol', 'bold', 'italic', 'hr'],
              headingLevels: ['h2', 'h3', 'h4'],
            },
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
        // Without `slugify`, Tina's default keeps capitals — "Becca Worl" seeds
        // `Becca-Worl.yaml` next to the existing `becca-worl.yaml`. Same trap the
        // pages collection documents; same fix, minus the folders pages allow.
        ui: {
          filename: {
            description: 'The file this is saved as — set automatically from the name.',
            slugify: (values) => flatSlug(values?.name ?? ''),
            parse: (value: string) => flatSlug(value),
          },
        },
        defaultItem: () => ({ order: 0 }),
        fields: [
          { name: 'name', label: 'Name', type: 'string', isTitle: true, required: true },
          {
            name: 'title',
            label: 'Role / title',
            type: 'string',
            required: true,
            description: 'As it should read under the name — "Lead Pastor", "Director, Communications".',
          },
          // ui.parse pins the stored shape to /assets/images/<file> — see imageRef
          // in templates.mjs for why every image field carries it.
          {
            name: 'portrait',
            label: 'Portrait',
            type: 'image',
            required: true,
            ui: { parse: imageRef },
            description: 'A portrait-orientation photo — the page crops it 4:5, so landscape shots lose their edges.',
          },
          {
            name: 'portraitAlt',
            label: 'Portrait description (alt text)',
            type: 'string',
            description: 'Usually leave blank — "Name, Role" is used. Write one only if the photo needs more.',
          },
          {
            name: 'bio',
            label: 'Bio',
            type: 'string',
            required: true,
            ui: { component: 'textarea' },
            description: 'A few short paragraphs. Markdown works here — links, bold, paragraphs.',
          },
          {
            name: 'order',
            label: 'Order',
            type: 'number',
            description:
              'Lower numbers come first on the leadership page. Leave gaps (10, 20, 30 …) so someone new can ' +
              'slot in without renumbering.',
          },
          {
            name: 'link',
            label: 'Link (optional)',
            type: 'object',
            description: 'An optional "read more" line under the bio. Both parts are needed for it to show.',
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
        ui: {
          filename: {
            description: 'The file this is saved as — set automatically from the title.',
            slugify: (values) => flatSlug(values?.title ?? ''),
            parse: (value: string) => flatSlug(value),
          },
        },
        defaultItem: () => ({ featured: false, order: 0 }),
        fields: [
          { name: 'title', label: 'Title', type: 'string', isTitle: true, required: true },
          {
            name: 'when',
            label: 'When',
            type: 'string',
            description: 'A human label — a date range ("August 10–17, 2026") or a cadence ("Each spring"). Optional.',
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
          {
            name: 'order',
            label: 'Order',
            type: 'number',
            description:
              'Lower numbers come first. Leave gaps (10, 20, 30 …) so a new moment can slot in without renumbering.',
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
            openFormOnCreate: true,
            // Rows show in the order they appear on the site — drag to reorder.
            ui: { itemProps: (item) => ({ label: item?.by || item?.text || 'Quote' }) },
            fields: [
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
      // The photo catalog (src/content/photos/photos.json): one description per
      // photo, written once and inherited by every page that shows it — a block's
      // own "Photo description" field is a per-page override, not a requirement
      // (altFor in src/lib/photos.ts). Modelled like Homepage quotes: a single
      // JSON file as a one-document collection, create/delete removed.
      //
      // `id` is the catalog key — the bare filename in src/assets/images. The
      // image picker hands the field a full path/URL, so `parse` strips it to the
      // basename on save, and `format` re-prefixes the stored form so the picker
      // and thumbnail still recognise it.
      {
        name: 'photoCatalog',
        label: 'Photo descriptions',
        path: 'src/content/photos',
        format: 'json',
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          {
            name: 'photos',
            label: 'Photos',
            type: 'object',
            list: true,
            openFormOnCreate: true,
            ui: { itemProps: (item) => ({ label: item?.id || 'Photo' }) },
            fields: [
              {
                name: 'id',
                label: 'Photo file',
                type: 'image',
                required: true,
                ui: {
                  parse: (value: unknown) =>
                    typeof value === 'string' && value ? (value.split('/').pop()?.split('?')[0] ?? value) : value,
                  format: (value: unknown) =>
                    typeof value === 'string' && value && !value.includes('/') ? `/assets/images/${value}` : value,
                },
              },
              {
                name: 'alt',
                label: 'Description (alt text)',
                type: 'string',
                required: true,
                ui: { component: 'textarea' },
                description:
                  'Say what someone who can’t see the photo would need — “A volunteer making coffee before the ' +
                  'service”, not “coffee”. Every page that shows this photo uses this description unless it sets ' +
                  'its own.',
              },
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
        ui: {
          filename: {
            description: 'The file this is saved as — set automatically from the name.',
            slugify: (values) => flatSlug(values?.name ?? ''),
            parse: (value: string) => flatSlug(value),
          },
        },
        defaultItem: () => ({ kind: 'shortcut', permanent: false }),
        fields: [
          {
            name: 'name',
            label: 'Name',
            type: 'string',
            isTitle: true,
            required: true,
            searchable: true,
            description:
              'Names this entry in the list (and its file behind the scenes) — it never appears on the public ' +
              'site. The address people actually visit is "Old address" below.',
          },
          {
            name: 'from',
            label: 'Old address',
            type: 'string',
            required: true,
            searchable: true,
            // scripts/generate-redirects.mjs runs the same checks at build time and
            // remains the authority — it alone can see that two entries claim the same
            // address. This is the same rule, moved to where the editor is standing.
            ui: { validate: (value: string) => checkFrom(value) },
            description:
              'The address people are typing or following, starting with a slash — "/camp" for plcc.org/camp. ' +
              'It can have several parts, e.g. "/connect/about/leadership-team/".',
          },
          {
            name: 'destination',
            label: 'Sends people to',
            type: 'string',
            searchable: true,
            ui: {
              validate: (value: string, allValues: { kind?: string }) => checkDestination(value, allValues?.kind),
            },
            description:
              'Either a full address elsewhere (https://plcc.churchcenter.com/…) or a page on this site, ' +
              'written with slashes at both ends — "/visit/". Leave empty for a page that is gone for good — ' +
              'anything typed here is ignored for those.',
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
            // The cross-field rule: required unless the box above is ticked, forbidden
            // when it is. Both halves used to surface only as a failed build.
            //
            // `dateFormat` keeps the picker date-only, and `parse` stores the bare
            // date — without it the picker writes a full ISO timestamp, which every
            // hand-written file avoids and which leaks into the generated
            // `_redirects` comments as "review by 2026-09-30T00:00:00.000Z".
            ui: {
              dateFormat: 'YYYY-MM-DD',
              parse: (value: unknown) => (typeof value === 'string' ? value.split('T')[0] : value),
              validate: (value: string, allValues: { permanent?: boolean }) => checkReview(allValues?.permanent, value),
            },
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
