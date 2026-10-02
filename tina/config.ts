import { defineConfig } from 'tinacms'
import { templates, heroFields, image, checkSeoDescription, guide } from './templates.mjs'
import { checkFrom, checkDestination, checkReview } from './short-link-rules.mjs'
import { checkSunday, churchToday, linkListField, nextSunday, toIsoDate } from './sunday-links.mjs'
import { dateOnly } from './date-field.mjs'
import { checkNoticeLink, checkNoticeMessage } from './site-notice.mjs'
import { checkOptionalLink } from './link-rules.mjs'
import { checkClosingBanner } from './block-rules.mjs'
import { pageProblems } from './save-check.mjs'
import { church } from '../src/config/church'

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

/** The flat form for data files (short links): no folders. */
const flatSlug = (value: string) => slug(value).replace(/\//g, '-')

// CMS configuration. The `pages` collection carries the page frontmatter (including the
// nested `hero` object) and an 18-component body palette; the rest are YAML or JSON
// data files with no body. Must stay aligned with src/content.config.ts, which Astro validates
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
          // Tina checks a block's fields only while the block is open, so a problem it
          // pointed out is forgotten once the editor goes back to the page, and the save
          // goes through to a build that rejects it. This runs every one of those checks
          // over the whole page at Save, and refuses the save with the block named.
          // Throwing is how a save is refused; the alert is what the editor sees.
          beforeSubmit: async ({ cms, values }) => {
            const problems = pageProblems(values, { heroFields, templates })
            if (problems.length === 0) return values
            cms.alerts.error(`Not saved yet. ${problems.slice(0, 3).join(' ')}`, 15000)
            throw new Error(problems.join(' '))
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
              '“safety” makes plcc.org/safety/. Click to change it, and keep it short: addresses get read aloud and ' +
              'printed. Changing it later breaks existing links.',
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
            description: 'The page’s heading, and its name in the browser tab.',
          },
          {
            name: 'draft',
            label: 'Hidden from the public site (draft)',
            type: 'boolean',
            description: 'New pages start hidden. Untick to publish the page when you next save.',
          },
          {
            name: 'hero',
            label: 'Top of page',
            type: 'object',
            // A `variant` select decides which of these fields apply. It is not
            // `templates` — that would show only the chosen shape's fields, but
            // Tina implements object templates for lists only, and a non-list one
            // renders as "Unrecognized field type". See the note in templates.mjs.
            fields: heroFields,
          },
          {
            name: 'blocks',
            label: 'Body',
            type: 'object',
            list: true,
            templates,
            // The palette opens as a grid of thumbnails rather than a list of names —
            // each template carries a `previewSrc` picture of itself (see `preview()` in
            // templates.mjs). Eighteen labels take reading; eighteen pictures don't, and
            // the labels are still there under them.
            // The one rule about how blocks sit together that an editor can break by
            // dragging: see checkClosingBanner.
            ui: { visualSelector: true, validate: (value: unknown) => checkClosingBanner(value) },
            // A page is assembled, never typed into: every top-level thing on it is one of
            // the blocks in `templates`, and prose lives inside a block's own rich-text
            // field rather than loose on the page. A `rich-text` body would offer a prose
            // editor that also accepts blocks, which invites text no layout was designed
            // for — it renders as a bare paragraph in the `.canvas` grid, framed by
            // nothing. A blocks list can't express that value at all.
            //
            // This is the field Tina's own Astro starter uses for a page body, and it
            // carries drag-to-reorder and click-to-edit natively.
            description:
              'The page, built from blocks: add one with the + button, drag to reorder, click one to edit. ' +
              `${guide('blocks', 'Which block to use')} · ${guide('voice', 'Editorial voice')}`,
          },
          {
            name: 'seoTitle',
            label: 'Search title (optional)',
            type: 'string',
            description:
              'Replaces “Title | Pine Lake Covenant Church” in search results and the browser tab. Only the home page needs one.',
          },
          {
            name: 'seoDescription',
            label: 'Search summary',
            type: 'string',
            ui: {
              component: 'textarea',
              validate: (value: string, allValues: unknown) => checkSeoDescription(value, allValues),
            },
            description:
              'One sentence, under about 155 characters, for search results and link previews. Can be blank when ' +
              'the top of the page has an intro line.',
          },
        ],
      },
      // The links behind the NFC tags and QR codes in the building (/links/), one file
      // per Sunday. The page shows the latest Sunday on or before today, so next week's
      // list can be prepared any time and goes live by itself — at the nightly build
      // early on Sunday, with an inline date check on the page as the safety net. Past
      // weeks are deleted by the nightly job (scripts/prune-sunday-links.mjs), which is
      // why there is no archive to manage. See docs/cms.md, "Sunday links".
      //
      // Second in the sidebar: after Pages, it's the thing an editor opens most often —
      // every week.
      {
        name: 'sundayLinks',
        label: 'Sunday links',
        path: 'src/content/sunday-links',
        format: 'yaml',
        ui: {
          // Flat on purpose: the page, the zod loader and the prune script all read the
          // top level of the directory only, so a week filed in a folder would vanish.
          allowedActions: { createFolder: false, createNestedFolder: false },
          // A week that hasn't started yet opens on /links/next/, which renders it
          // directly. Not /links/?preview: the admin builds its preview address from the
          // route's path alone, so a query string never reaches the page.
          router: ({ document }) =>
            toIsoDate(document.sunday) > churchToday(church.timezone) ? '/links/next/' : '/links/',
          // The file is named for its Sunday and follows the date field, including on
          // Duplicate — which reopens the create form seeded with the copied values, so
          // changing the date is also what moves the copy off the original's filename.
          filename: {
            readonly: true,
            description: 'Named for the Sunday — set from the date below.',
            slugify: (values) => toIsoDate(values?.sunday) || nextSunday(churchToday(church.timezone)),
          },
        },
        defaultItem: () => ({ sunday: nextSunday(churchToday(church.timezone)) }),
        fields: [
          {
            name: 'sunday',
            label: 'Sunday',
            type: 'datetime',
            required: true,
            // A bare date on disk, shown as that same day in the picker — see
            // tina/date-field.mjs for the day-shift it prevents.
            ui: { ...dateOnly, validate: (value: unknown) => checkSunday(value) },
            description:
              'They go live early that morning; preview them before then at /links/next/. To start a new week, ' +
              `Duplicate last week’s list and change this date. ${guide('sunday-links', 'More')}`,
          },
          linkListField('Top to bottom, as on the page. Links that never change are under “Sunday links: every week”.'),
        ],
      },
      // The groups under the weekly list ("Next steps", "Additional resources"). One file
      // holding one list, modelled like Homepage quotes: create and delete removed.
      {
        name: 'sundayLinksEveryWeek',
        label: 'Sunday links: every week',
        path: 'src/content/sunday-links-every-week',
        format: 'yaml',
        ui: { allowedActions: { create: false, delete: false }, router: () => '/links/' },
        fields: [
          {
            name: 'groups',
            label: 'Groups',
            type: 'object',
            list: true,
            openFormOnCreate: true,
            description: 'Shown under the weekly links, in this order. Drag to reorder.',
            ui: { itemProps: (item) => ({ label: item?.heading || 'New group' }) },
            fields: [
              { name: 'heading', label: 'Heading', type: 'string', required: true },
              linkListField('Top to bottom as they appear on the page.'),
            ],
          },
        ],
      },
      // The site notice: one message across the top of every page, switched on by hand
      // and left on until someone switches it off — a snow closure, say. Modelled like
      // Homepage quotes: one file, create and delete removed. Saving rebuilds the site,
      // so it goes live in a few minutes, not instantly. See docs/cms.md, "Site notice".
      //
      // No `router`: the banner isn't rendered through a TinaIsland, so a router would
      // open the visual editor on a page with nothing bound to this form, and the
      // admin would show that page's own fields instead. Without one it's a plain form.
      {
        name: 'siteNotice',
        label: 'Site notice',
        path: 'src/content/site-notice',
        format: 'yaml',
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          {
            name: 'enabled',
            label: 'Show this notice on every page',
            type: 'boolean',
            description:
              'Stays up until you switch it off, and replaces the Sunday-morning “Live now” banner while it’s on. ' +
              guide('post-a-closure-notice', 'More'),
          },
          {
            name: 'message',
            label: 'Notice',
            type: 'string',
            description: 'One short sentence, like “Sunday’s service is canceled because of snow.”',
            ui: {
              validate: (value: unknown, data: { enabled?: boolean } | undefined) =>
                checkNoticeMessage(value, data?.enabled),
            },
          },
          {
            name: 'linkLabel',
            label: 'Link text (optional)',
            type: 'string',
            description: 'Leave blank for “Details”.',
          },
          {
            name: 'link',
            label: 'Links to (optional)',
            type: 'string',
            description: 'Somewhere to read more: a page here like /events/, or a full https:// address.',
            ui: { validate: (value: unknown) => checkNoticeLink(value) },
          },
        ],
      },
      // Pastors and staff, and the youth year's big moments: each one ordered list in one
      // YAML file, modelled like Homepage quotes (one document, create and delete
      // removed). The position in the list is the order on the page, so an editor drags
      // someone into place instead of renumbering everyone below them — which is what
      // per-file `order` numbers came to in practice.
      {
        name: 'leadership',
        label: 'Leadership',
        path: 'src/content/leadership',
        format: 'yaml',
        match: { include: 'leadership' },
        // No `router`, for the reason given on the site notice: the leadership page isn't
        // rendered through a TinaIsland, so there's nothing for visual editing to bind.
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          {
            name: 'people',
            label: 'People',
            type: 'object',
            list: true,
            openFormOnCreate: true,
            description: 'In the order they appear on the leadership page. Drag to reorder.',
            ui: { itemProps: (item) => ({ label: item?.name || 'New person' }) },
            fields: [
              // The page's deep links (#becca-worl) are made from the name, so
              // renaming someone changes theirs — see slugOf in src/content.config.ts.
              { name: 'name', label: 'Name', type: 'string', required: true },
              {
                name: 'title',
                label: 'Role / title',
                type: 'string',
                required: true,
                description: 'As it reads under the name, like “Lead Pastor”.',
              },
              // image() pins the stored shape to /assets/images/<file> — see the
              // helper in templates.mjs for why no image field is written by hand.
              image('portrait', 'Portrait', {
                required: true,
                description: 'A portrait-shaped photo; a wide one loses its edges.',
              }),
              {
                name: 'portraitAlt',
                label: 'Portrait description (optional)',
                type: 'string',
                description: 'Leave blank to use their name and role.',
              },
              // Rich text rather than a Markdown textarea, so bold and links come from a
              // toolbar instead of syntax. Tina stores rich text as a Markdown string in
              // YAML too, so the page renders it exactly as before (renderMarkdown).
              {
                name: 'bio',
                label: 'Bio',
                type: 'rich-text',
                required: true,
                overrides: { toolbar: ['link', 'bold', 'italic'] },
                description: 'A few short paragraphs.',
              },
              {
                name: 'link',
                label: 'Read-more link (optional)',
                type: 'object',
                description: 'A line under the bio. It shows only when both parts are filled in.',
                fields: [
                  { name: 'label', label: 'Link text', type: 'string' },
                  {
                    name: 'href',
                    label: 'Links to',
                    type: 'string',
                    description: 'A page here like /about/, or a full https:// address.',
                    ui: { validate: (value: unknown) => checkOptionalLink(value) },
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'youthMoments',
        label: 'Youth moments',
        path: 'src/content/youth-moments',
        format: 'yaml',
        match: { include: 'youth-moments' },
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          {
            name: 'moments',
            label: 'Moments',
            type: 'object',
            list: true,
            openFormOnCreate: true,
            description: 'In the order they appear on the youth page. Drag to reorder.',
            ui: { itemProps: (item) => ({ label: item?.title || 'New moment' }) },
            fields: [
              { name: 'title', label: 'Title', type: 'string', required: true },
              {
                name: 'when',
                label: 'When (optional)',
                type: 'string',
                description: 'A date range or a season, like “August 10–17, 2026” or “Each spring”.',
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
        // The directory also holds quotes-and-placeholders.yaml, a reference copy
        // of the draft pool that nothing renders. Pin the collection to
        // quotes.yaml so the admin lists one document, not two.
        match: { include: 'quotes' },
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
              { name: 'by', label: 'Who said it (optional)', type: 'string' },
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
      // `id` stores `/assets/images/<file>` via the shared imageRef hook — the
      // one shape every image field uses, because it is the only one TinaCloud
      // round-trips unchanged (see imageRef in tina/templates.mjs). A bare
      // filename was tried first and broke the deployed admin's thumbnails:
      // TinaCloud's resolver mangles any other shape on read. The Astro loader
      // strips the path back to the filename the catalog is keyed by
      // (src/content.config.ts).
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
            // Rows label by filename — the stored value carries the path prefix.
            ui: { itemProps: (item) => ({ label: item?.id?.split('/').pop() || 'Photo' }) },
            fields: [
              image('id', 'Photo file', { required: true }),
              {
                name: 'alt',
                label: 'Description',
                type: 'string',
                required: true,
                ui: { component: 'textarea' },
                description:
                  'What someone who can’t see it needs: “A volunteer making coffee before the service”, not ' +
                  `“coffee”. Used wherever the photo appears. ${guide('add-a-photo', 'More')}`,
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
        // Tina has no list-view column configuration, so the list shows filenames
        // only. The filename is the short link itself, so the list reads as the
        // addresses people actually type. See docs/cms.md.
        ui: {
          filename: {
            description: 'Set automatically from the short link.',
            slugify: (values) => flatSlug(values?.from ?? ''),
            parse: (value: string) => flatSlug(value),
          },
        },
        defaultItem: () => ({ kind: 'shortcut', permanent: false }),
        fields: [
          {
            name: 'from',
            label: 'Short link',
            type: 'string',
            isTitle: true,
            required: true,
            searchable: true,
            // scripts/generate-redirects.mjs runs the same checks at build time and
            // remains the authority — it alone can see that two entries claim the same
            // address. This is the same rule, moved to where the editor is standing.
            ui: { validate: (value: string) => checkFrom(value) },
            description: `“/camp” makes plcc.org/camp. ${guide('add-a-short-link', 'More')}`,
          },
          {
            name: 'kind',
            label: 'What kind of link',
            type: 'string',
            required: true,
            options: [
              { label: 'Shortcut: can be re-pointed later', value: 'shortcut' },
              { label: 'Old page that has moved for good', value: 'moved' },
              { label: 'Old page that is gone (leave “Links to” empty)', value: 'gone' },
            ],
            description: 'If unsure, choose Shortcut. Browsers remember a moved page for good.',
          },
          {
            name: 'destination',
            label: 'Links to',
            type: 'string',
            searchable: true,
            ui: {
              validate: (value: string, allValues: { kind?: string }) => checkDestination(value, allValues?.kind),
            },
            description: 'A page here like /visit/, or a full https:// address.',
          },
          {
            name: 'permanent',
            label: 'Never needs reviewing',
            type: 'boolean',
            description: 'For things the church will always have, like the podcast.',
          },
          {
            name: 'expires',
            label: 'Review by',
            type: 'datetime',
            // The cross-field rule: required unless the box above is ticked, forbidden
            // when it is. Both halves used to surface only as a failed build.
            //
            // `dateOnly` keeps the picker date-only and stores the bare date — without
            // it the picker writes a full ISO timestamp, which every hand-written file
            // avoids and which leaks into the generated `_redirects` comments as
            // "review by 2026-09-30T00:00:00.000Z". It also stops the picker showing,
            // and saving, the wrong day west of UTC (tina/date-field.mjs).
            ui: {
              ...dateOnly,
              validate: (value: string, allValues: { permanent?: boolean }) => checkReview(allValues?.permanent, value),
            },
            description: 'When to check it’s still right, like when a sign-up closes. The link keeps working after.',
          },
          {
            name: 'note',
            label: 'Notes',
            type: 'string',
            searchable: true,
            ui: { component: 'textarea' },
            description: 'Anything the next person should know.',
          },
        ],
      },
    ],
  },
})
