# CMS internals (TinaCMS)

How the site's editor is put together. **Using** the editor (pages, blocks, photos, the
weekly routines) is covered by the webmaster's manual, served on the site at `/webmaster/`
from [`manual/`](./manual/index.md). This doc is for whoever changes the editor itself.

The editor is [TinaCMS](https://tina.io), a Git-based CMS: every change an editor makes
becomes a commit, and the site rebuilds and deploys automatically. For the stack and
conventions, see [development.md](./development.md); for hosting, see
[infrastructure.md](./infrastructure.md).

---

## The big picture

- The editor lives at **`/admin`**, and it works two ways. The **forms view** lists a page's
  blocks and opens each one as a typed form. **Visual editing** shows the real rendered page
  beside the form: click anywhere in a section and its block's form focuses in the
  sidebar (the markers are per block, not per field), and typing updates the page live.
  A page is **built from blocks, never typed into** — the body is a list of components, and
  all prose sits inside one of them.
- **The public site stays static.** Editing produces a Git commit; the commit triggers a
  build; the build ships static HTML. Visitors never hit a server — the only on-demand routes
  are `/tina-island/*`, which re-renders a region while an editor is typing, and
  `/tina-preview/*`, which shows the editor a page that hasn't deployed yet.
- The config is **`tina/config.ts`** (collections and fields) plus **`tina/templates.mjs`**
  (the block palette), with **`tina/short-link-rules.mjs`** holding the per-entry short-link
  rules it shares with the build script. Its schemas must stay aligned with the Astro content
  schemas in `src/content.config.ts` — Astro validates the same files at build time, and the
  two catch different mistakes. **Change one, change the other.** (Two deliberate exceptions:
  `shortLinks` has no zod schema — nothing renders those files, and
  `scripts/generate-redirects.mjs` is their validator — and the `manual` collection has no
  Tina collection, because the guide is maintained with the code, in `docs/manual/`.)
- **`tina/tina-lock.json` is the third thing to change**, and the one nothing reminds you
  about. See below.

### The lock file is the schema TinaCloud sees

`tina/tina-lock.json` is not a lockfile in the npm sense. It is the **compiled schema**, and
TinaCloud reads it straight out of the GitHub repo — it is where the hosted editor and
`/tina-island` get their idea of what fields exist. The site's own schema is generated fresh
from `tina/config.ts` on every build. So the two are separate artefacts that can disagree.

**Nothing regenerates it on the path most changes take.** `tinacms build` never writes it;
only `tinacms dev` does. Edit `tina/config.ts` in an editor, commit, and the lock file
silently stays behind.

What follows is remote, late, and misdescribed at both stages:

1. The Cloudflare deploy fails in `tinacms build` with `ERR_CLOUD_CHECK_FAILED` and "the
   local Tina schema doesn't match the remote… please push up your changes to GitHub." The
   changes _are_ pushed. It reads like a race with TinaCloud's indexer, and waiting or
   retrying does nothing, because the file TinaCloud indexes is the stale one.
2. Skip that check and the deploy goes green — and the editor opens on **"GraphQL Schema
   Mismatch: if you just pushed changes, try pulling the latest."** Same wrong advice, now
   in front of an editor rather than a developer.

Both happened here, in that order, off a commit that removed one unused field.

So `postbuild` runs `scripts/check-tina-lock.mjs`, which rebuilds the lock from what codegen
just emitted and fails the build if the committed one differs — naming this file, which
neither upstream message does. The fix it points at:

```bash
npm run tina:lock
```

Then commit the result. Running `npm run dev:tina` also regenerates it as a side effect,
which is why the drift only shows up when a config change never went through local editing.

---

## What's editable, and why

A guiding principle keeps editing simple: **a collection or singleton earns its place only
when its data is reused across the site, or referenced from inside content.** Otherwise it's
just a page's content and belongs in that page's editor.

This table is also the **sidebar order**, top to bottom — `tina/config.ts` lists the
collections in exactly this sequence, and Tina renders them in schema order. Pages comes
first because it's what an editor is nearly always here for; Sunday links next, because
it changes every week; Site notice after them, so it's quick to find on a snowy morning;
the shared lists that feed page blocks follow; Short links sits
last, being routing config rather than content and the least often touched.

| In the CMS                   | What it is                                     | Kind    |
| ---------------------------- | ---------------------------------------------- | ------- |
| **Pages**                    | CMS-built pages (hero + a body of blocks)      | content |
| **Sunday links**             | This Sunday's links at `/links/`, one per week | weekly  |
| **Sunday links: every week** | The groups of links under every week           | content |
| **Site notice**              | A closure notice across the top of every page  | notice  |
| **Leadership**               | Pastors & staff, in page order                 | shared  |
| **Youth moments**            | Signature youth trips/retreats, in page order  | shared  |
| **Homepage quotes**          | Rotating testimonials (reusable social proof)  | shared  |
| **Photo descriptions**       | One alt-text description per photo, site-wide  | shared  |
| **Short links**              | Vanity URLs pointing off-site                  | routing |

All nine sit under one **Collections** heading. Six of them — **Sunday links: every
week**, **Site notice**, **Leadership**, **Youth moments**, **Homepage quotes** and
**Photo descriptions** — are a single file, so their list view shows a single row to
click through. Where the file is a list, its order is the order on the page: an editor
drags an item into place rather than numbering it. (Leadership and Youth moments were a
file per entry with an `order` number until editors, rather than counting in tens,
numbered them 1, 2, 3 — so slotting anyone in meant re-saving everyone below.) They offer no "add" or "delete" at the file level (`allowedActions` in
`tina/config.ts`): the one file is the only file. Adding and removing quotes _within_ the
list is the normal thing to do and works as usual. `src/content/quotes/` holds a second
file, `quotes-and-placeholders.yaml` — the draft pool the live quotes were chosen from,
which nothing renders. A `match` on the collection keeps it out of the admin.

None of the four is marked `ui.global`. That flag exists for genuine site configuration
and moves a collection out of the Collections list into the **Site** section next to Media
Manager — which, copied from Tina's own starter, split the sidebar in two and hid half the
editable lists from the people who edit them. This is content that happens to live in one
file, so it belongs in the list with everything else.

> **Link cards are page content, not data.** Every set of them now lives inline in the page
> that shows it: the `new` page folded its links into a **Link cards** block, the
> `neighbors` "common starting points" doors became **Text cards** (with a labelled link),
> and the homepage's four "Start here" doors are a **Link cards** block on the home page.
> Each set had exactly one reader, so by the rule above none of them earned a collection.

**Photo descriptions live in one place.** The catalog
(`src/content/photos/photos.json`, the **Photo descriptions** collection in the sidebar)
holds one alt-text description per photo, written once and inherited by every page that
shows the photo. A block's own "Different description for this page" field is a per-page
override, usually left blank; the form insists on it only when the photo isn't catalogued
(see [Gotchas](#gotchas)). The build's crawl fails on any content image that ends up with no
description from either source, so a miss can't ship silently.

### Sunday links

The editor-facing routine is [the manual's Sunday links page](./manual/sunday-links.md).

The rules and date logic live in `tina/sunday-links.mjs`, shared by the
form, the zod schema, the page and the prune script. `/links/` renders next week too,
inside a `<template>` the inline script swaps in on the day or under `?preview`.
`/links/next/` renders next week on its own, because it's what the collection's `router`
points a future week at: the admin builds its preview address from the route's path
alone, so `?preview` never reaches the page there. The date field's hooks live in
`tina/date-field.mjs` — Tina's own date picker shows and saves the wrong day west of UTC.
Two entries with the same date fail the build, because nothing can tell which one was
meant. The slim chrome is `BaseLayout chrome="slim"`
([design-system.md](./design-system.md#8-header--footer)).

### Site notice

The routine, and the "Live now" banner that shares the strip, are in
[the manual](./manual/post-a-closure-notice.md). The banner's window comes from
`church.service` in `src/config/church.ts`; the site is static, so the browser checks the clock.

The component is `src/components/chrome/SiteBanner.astro`, the time
window is `isStreamLive` in `src/lib/livestream.ts`, and the form's rules live in
`tina/site-notice.mjs`, shared with the zod schema.

### Short links

The routine, and why "Shortcut" is the default, are in [the manual](./manual/add-a-short-link.md).
`scripts/generate-redirects.mjs` turns each entry into a line of `public/_redirects` (302 for a
shortcut, 301 for a moved page, both with and without the trailing slash) or, for a "gone" entry,
a generated route returning 410, since `_redirects` can't. Redirects happen at Cloudflare's edge.
Old-site redirects live here too, as moved pages with a review date about a year out — one list
to review rather than two places to forget about. Every build prints the links due or overdue
for review. The per-entry rules are shared with the form; see [Gotchas](#gotchas).

---

## Uploaded photos

Photos live in `src/assets/images/`, and the media library reads that folder directly, so
the build optimizes everything an editor picks (responsive WebP) like every other image —
there's nothing to manage.

**JPEG, PNG, WebP and AVIF only.** The picker refuses anything else — in practice, an
iPhone's HEIC, which the manual tells editors to export as JPEG. The restriction is `media.accept` in `tina/config.ts` and it exists because
those four are exactly what the image pipeline resolves (the globs in `src/lib/images.ts`).
An unresolvable image doesn't fail the build — it just doesn't appear.

---

## How a page renders

- `src/pages/[...slug].astro` fetches each page through Tina's GraphQL client
  (`src/lib/tina/data.ts`), then renders it with `PageBody`, wrapped in `<TinaIsland>`.
- **Content comes from Tina, not `getCollection()` + `render()`.** That is what visual
  editing requires: the rendered DOM has to carry the `data-tina-field` markers the editor
  bridge maps forms onto, which a compiled content module can't provide. `src/content.config.ts`
  still declares the collection, so zod still validates the files at build time.
- **Pages without prerendered HTML are edited through `/tina-preview/`.** Visual editing
  opens a page at its real address, which a page saved since the last deploy doesn't have
  yet — nor does any draft, since production builds leave drafts out. So `404.astro`
  carries a script that, only inside the admin iframe, retries the address under
  `/tina-preview/`: an on-demand route (`src/pages/tina-preview/[...slug].astro`) that
  fetches the page from TinaCloud at request time and renders it through the same `page`
  island. It answers only framed requests (`Sec-Fetch-Dest: iframe`), so a draft has no
  shareable address; that's tidiness, not security — `/tina-island` renders any page to a
  same-site request anyway. Photos resolve against the build-time glob in
  `src/lib/images.ts`, so one uploaded since the last deploy renders blank there until the
  rebuild.
- The body is a `blocks` list. `PageBody.astro` maps each one to a component through
  **`src/components/blocks/tina/registry.ts`**, keyed by template name and recovered from the
  block's `__typename` (`PagesBlocks<Name>`). Wrapper blocks (those with prose inside —
  `Section`, `Split`, `Callout`, `Closing`, `Aside`, `Letter`) need a Tina-specific adapter in
  that folder, because their prose arrives as a `body` rich-text tree rather than a
  `<slot />`. The twelve self-closing blocks reuse their existing wrappers in
  **`src/components/blocks/mdx/`** unchanged. Either way it's the real site component doing
  the rendering.
- Each block is **spread into** its component rather than wrapped in a marker element:
  `.canvas` styles its direct children, so a wrapper `<div>` would drop the block out of
  every layout rule. `_content_source` rides along in the props and the adapter puts
  `data-tina-field` on the block's own root (`src/lib/tina/block-field.ts`).
- Internal code names differ from editor labels (the label is what editors see): `Section` =
  "Text", `Split` = "Photo beside text", `CaptionedPhoto` = "Photo", `Video` = "Video",
  `PhotoBand` = "Photo gallery", `CardRow` = "Text cards", `Callout` = "Callout",
  `LinkCards` = "Link cards", `Closing` = "Closing banner", `Quote` = "Quote",
  `FeaturedEvents` = "Featured events", `KeyPoints` = "Key points", `LogoCards` =
  "Logo cards", `Aside` = "Note with logo", `YouthMomentsBlock` = "Youth moments", `QuoteCarousel` =
  "Quotes carousel", `Roadmap` = "Roadmap", `Letter` = "Letter".
- Data blocks (Youth moments, Quotes carousel, Featured events) pull from a shared
  collection/singleton rather than inline content — they take only display options.
- Hero and block images arrive as path strings; the wrappers resolve them through
  `imageFromRef` (`src/lib/images.ts`), a registry that doesn't care how deeply a page or an
  upload is nested (`church-life.mdx`, `about/covenant.mdx`), and hand them to `<Photo>` for
  build-time optimization.
- **Block palette thumbnails** live in `public/block-previews/` and are regenerated by
  `scripts/generate-block-previews.mjs`. Each is a crop of the block as it renders on the
  first page that uses it — which the script derives, so there is no list to maintain. The
  capture half needs a browser and is a documented manual recipe in the script's header;
  the one trick worth knowing is that removing `reveal-ready` from `<html>` is what stops a
  screenshot driver capturing a blank page, since every reveal is gated on that class.
  `ui.visualSelector` on the body field turns the palette into the grid that shows them.
- Adding a block = a template in `tina/templates.mjs` **and** a matching component
  registered in `src/components/blocks/tina/registry.ts`. If the block has prose inside, give
  its template a `body` field of type `rich-text` (the `prose()` helper) and write an adapter
  that renders it via `TinaChildren`. Keep the two in step: an unregistered name throws at
  build time rather than dropping the block silently off the page.
- **A field name shared across templates has to agree on `required`.** Every template is a
  GraphQL type in one union, and two members may not return `String!` and `String` under the
  same name — codegen fails the build. `heading` and `image` are optional in some blocks by
  design, so they use `needed()` (editor-side validation) instead of `required: true`. That
  rules out `isTitle` on those fields too, since Tina demands `required` alongside it; the
  block's collapsed label comes from `ui.itemProps` instead.
- **Image fields are only ever declared with the `image()` helper** (`tina/templates.mjs`)
  — in blocks and in `tina/config.ts` collections alike. It bakes in the `imageRef` parse
  that pins the stored value to `/assets/images/<file>`, the one shape TinaCloud
  round-trips unchanged. A hand-rolled image field is the trap that looks fine locally and
  breaks only in the deployed admin (the photo catalog shipped it once);
  `test/image-fields.test.ts` now fails the build on one.

### What becomes a CMS page or block (and what stays as code)

Three tiers, narrowing — componentization (Astro's way) and editor surface (the CMS) are
different decisions:

1. **Component — always.** Every element is an Astro component, single-use included.
2. **CMS page** (an MDX entry: hero + blocks) — when the whole page is editor-territory and
   fits the hero-plus-blocks model.
3. **CMS block** (a palette entry) — only when its content repeats and an editor can safely
   compose it anywhere. Every block in the palette is a promise it's safe to insert on any
   page, so a one-off block makes the editor worse for the pages that aren't it.

By this rule, these stay **hand-built `.astro`**, not CMS pages: `events/*` (the
`EventsBoard` _is_ the page), `messages` (live video archive), and `about/leadership`
(modal and view-transition morph). They're already components; they just aren't editor
surface. A page leaves this list when its layout becomes reusable — that's how the
**Letter** block and the **Cinematic** hero came about.

### Variants, not more fields

A fourth decision sits under those three: when a thing has to do more than one job, does it
grow an option or split into named shapes?

Split into shapes. Tina has no conditional field visibility — a field is either on the form
or it isn't — so every option you add is one every editor reads on every page, including the
pages it can't apply to. Options also don't say what they're _for_: an editor faced with a
tickbox has to reconstruct the intent behind it, and will sometimes get it wrong.

Two places show the difference:

- **The hero** was one object with nine optional fields, and which of the three heroes you
  got depended on which of them you'd filled in. A photo hero saved without a photo silently
  became a text-only header, and nothing could flag it, because nothing had been declared.
  Naming the shape in a `variant` field makes the choice explicit and gives
  `src/content.config.ts` a discriminator, so that mistake now fails the build.
- **Closing banner** was "Banner", a general tonal band with `tone` and `flush` options. All
  five uses were a page's last block, all five were forest, and two had missed the `flush`
  tick its own description asked for. Three fields carrying no information, one already got
  wrong. Narrowed to the job it actually did, it's five fields and no layout choices.

Closing banner got _smaller_. That's the usual outcome, and it's the tell: if splitting a
block leaves you with two nearly identical entries in the palette, the split was wrong and
the option was real.

The corollary is that a genuinely new shape earns a new template, not a flag on an old one —
and an option that has never been set to anything but its default has earned deletion.

#### Where this stops: the hero can't hide its unused fields

Naming a shape and **showing only that shape's fields** are two different things, and Tina
gives you the first but not the second. The hero still shows all eleven fields whatever
variant you pick; the `variant` select and the "For …" note on each field's description
are the whole mitigation.

Two mechanisms look like they'd fix that. Neither does:

- **Conditional visibility** needs a React component in `ui.component` reading form state.
  `tina/templates.mjs` is plain `.mjs` so Node scripts can import it without a
  build step, and `tina/config.ts` deliberately holds no JSX.
- **`type: 'object'` with `templates`** is the documented "pick a shape, see only its fields"
  mechanism, and it is **only implemented for lists**. In `@tinacms/schema-tools` 2.10.0 the
  mapping is literally:

  ```js
  component: field.list ? 'blocks' : 'not-implemented'
  ```

  The page body is a list, so it gets the working half — the body and this are the same
  mechanism, which is why a blocks body works while a shape-picking hero doesn't. A non-list
  object with templates renders as **"Unrecognized field type"** where the field should be,
  which also breaks click-to-edit for it, since the form has nothing to focus.
  Nothing fails at build time: the schema compiles, the lock file matches, the site builds
  and deploys, and only the editor is broken. **This shipped once.** Check that line before
  reaching for `templates` on anything that isn't a list.

The only workaround that preserves the choose-then-see behaviour is a list capped at one
item (`list: true` with `ui.max: 1`), which makes the frontmatter an array and puts the hero
behind an extra click. Judged not worth it for a field every page has — but it's the option
if the field count becomes the bigger problem.

### Field labels and help text

Every form should read the same way to a volunteer who has never seen the schema. The
rules are written out at the top of `tina/templates.mjs`; in short:

- **One sentence of help, task-first.** Anything longer goes in the editor's guide, linked
  with `guide('<page>', '<text>')`. Tina renders a description as HTML, so the link is live.
- **"(optional)" in the label** for a field that may be blank, and nowhere else.
- **Shared helpers for shared ideas**: `eyebrow()`, `photoAlt()`, `button()` and
  `linkFields()`, so a button or a link has the same labels and the same URL check
  (`tina/link-rules.mjs`) in every block.
- **One field order**: small label, heading, intro, photo, text, list, button, then how it
  looks.

---

## Running the editor locally

```bash
npm run dev:tina
```

Then:

- **forms editor** — `http://localhost:4321/admin/index.html`
- **visual editing** — `http://localhost:4321/admin/index.html#/~/visit/` (any page path
  after `#/~/`)

Local mode writes straight to your working copy — edit, save, and the files change and the
site hot-reloads. No login or cloud account needed. `npm run dev` still runs the site alone
without the CMS.

Two things worth knowing about dev:

- Dev runs without the Cloudflare adapter (`ASTRO_DEV=1`), so routes run on Node.
- A dev-only Vite route serves `src/assets/images` at `/assets/images/*`, because that's
  where the media picker looks for thumbnails and Astro doesn't otherwise serve that folder.
  See `tinaAssetsDevPlugin` in `astro.config.mjs`. In production the same path is a
  generated redirect to TinaCloud's CDN, which mirrors the repo's media — see the note in
  `scripts/generate-redirects.mjs`.

---

## Deployed setup

**Every build reads content from the files on disk** — no network, no third party. What
changes with credentials is only the client the build emits, and `scripts/build.mjs` picks
between them:

| Environment                            | CMS flags         | The deployed client                             |
| -------------------------------------- | ----------------- | ----------------------------------------------- |
| No credentials (CI, a fresh clone)     | `--local`         | Points at `localhost:4001` — dead once deployed |
| `PUBLIC_TINA_CLIENT_ID` + `TINA_TOKEN` | `--content=local` | Talks to TinaCloud                              |

The HTML is identical either way, which is why CI still verifies what deploys despite
building without credentials. Only the client URL baked into the bundle differs.

**Both paths pass `--skip-cloud-checks`, deliberately.** The check it disables compares the
schema a build generated against the one TinaCloud has indexed — and TinaCloud gets its
schema by indexing `tina/tina-lock.json`. So it is asking whether the committed lock file is
in step with `tina/config.ts`, one round trip removed, at deploy time.
[`check-tina-lock.mjs`](#the-lock-file-is-the-schema-tinacloud-sees) asks that directly, in
CI, without credentials, naming the file. What the cloud check adds is two ways to fail
while nothing is wrong: it always checks `main` (`TINA_BRANCH` is unset), so a preview build
of a branch whose schema differs from main's fails however correct it is; and on the deploy
that lands a schema change it races TinaCloud's re-index of the new lock file.

The case that trade gives up is TinaCloud indexing something genuinely different, or failing
to index at all. That still surfaces — in the editor, as "GraphQL Schema Mismatch", which is
where a problem with the editor belongs. The public site does not stop deploying for it.

Whether `/admin` is compiled and shipped is a **separate** switch, `TINA_PUBLISH_ADMIN`.
Credentials alone don't ship the editor, deliberately — the two answer different questions,
and a deploy can reasonably want the island route live without the editor on it. All three
are Cloudflare build variables; `TINA_TOKEN` is a secret, the client ID is public by design
(it ships inside the admin bundle), and neither belongs in the repo.

**The backend is TinaCloud**, chosen over self-hosting. The free tier covers 2 editors, Team
is $24/mo for 3–10. The alternative — bring-your-own git provider, database adapter and auth
provider, per [Tina's self-hosted docs](https://tina.io/docs/self-hosted/overview) — is real
but a build: `TinaNodeBackend` expects Node's `(req, res)` and Workers speak Fetch, and the
reference Cloudflare implementation
([ailabs-hq/tinacms-cloudflare](https://github.com/ailabs-hq/tinacms-cloudflare)) bridges
that with ~50 untyped lines in a Next.js demo, alongside Auth.js and a KV adapter.

**Git remains the source of truth either way**, so this is reversible: content is plain text
in the repo, and moving to a self-hosted backend later changes the backend, not the content. That
is what makes starting on TinaCloud low-risk rather than a lock-in.

**Verify `/tina-island` before the login.** On staging without credentials it returned 500
(`Island render failed`) — the Worker was healthy and enforcing its own guards, so
`nodejs_compat` was fine, but the client pointed at `http://localhost:4001/graphql`, the
datalayer that only exists while a build runs. `--content=local` is the flag that fixes it.
It is the first thing to re-test after a credentials change, because it proves the deployed
backend is actually reachable; a working login does not.

**Git-backed media works against the deployed admin**, with one asymmetry to know about.
TinaCloud mirrors `src/assets/images` at its CDN (`assets.tina.io/<clientId>/<file>`) — the
media manager and its thumbnails come from there. On read it rewrites stored refs to that
CDN URL for _direct_ image fields only; an image field nested inside an object list
(PhotoBand photos, LogoCards cards) reaches the form un-rewritten, and on save the form
value is written into the page file verbatim. Two seams this repo owns keep that honest,
with no patch to Tina itself: every image field's `ui.parse` normalises what a save may
store to `/assets/images/<file>` (`imageRef` in `tina/templates.mjs`), and the tests in
`test/image-ref.test.ts` / `test/image-parse.test.ts` pin the stored form, the normaliser,
and its presence on every image field — so a Tina upgrade that changes shape turns CI red
instead of silently rotting content. `check-tina-lock.mjs` catches the schema side of the
same bumps.

Setting up the Cloudflare Worker, and the production cutover, are in
[infrastructure.md](./infrastructure.md#setting-up-the-worker).

---

## Gotchas

- **The build needs a 4 GB heap, and Node 22.** Both fail in the CMS's `Indexing local
files` step; see [infrastructure.md](./infrastructure.md#a-build-stuck-at-indexing-local-files).
- **`nodejs_compat` is load-bearing.** See
  [infrastructure.md](./infrastructure.md#setting-up-the-worker) — without it the build writes
  every page out empty and the island route 500s, both while exiting 0.
- **Keep the two schemas in sync** — a field in `tina/config.ts` with no counterpart in
  `src/content.config.ts` (or vice versa) will be invisible to the build or fail validation.
  They catch different things and both are worth having: zod rejected a page Tina created
  without a `hero`, and Tina's indexer rejects type mismatches zod would let through.
- **`tina/` is excluded from `astro check`.** Type-checking `tina/config.ts` runs the
  compiler out of memory — `defineConfig` from `tinacms` pulls in too large a type graph,
  even at `--max-old-space-size=4096`. The CMS schema is therefore the one file CI can't
  verify. See `tsconfig.json`.
- **All CMS content is Prettier-ignored** (`src/content/` in `.prettierignore`). The CMS
  owns its formatting, and an editor's save must never fail CI — a trailing space Tina left
  in a bio once failed `format:check`, which stops CI before tests and builds. Content is
  validated by zod and the build scripts instead.
- **The toolbar is deliberately short.** A block's **Text** field is the only place with
  one, and `overrides.toolbar` on it keeps seven controls and drops the rest: raw, table,
  code, code block, mermaid, highlight and strikethrough are all offered by default and
  **none of them are styled anywhere in `src/styles`**, so reaching one produced output
  nobody designed. Same principle as `npm run lint:css` — enforced, not requested. `image`
  is out because these blocks carry their own image fields, and `embed` because
  `TinaChildren.astro` renders a block's prose with the inline components alone — a block
  nested inside a block would save fine and then render as nothing. Prose starts at **H3**,
  because the block's own heading is the `<h2>` and the hero renders the page's only `<h1>`
  — except in a Text block, whose heading is optional, so H2 stays available there.
  `base.css` styles nothing below `h4`. Both settings are UI-only: content already saved
  with a disallowed level still renders. Removing `raw` is also what now enforces the old
  "no inline raw HTML" rule below.
- **No _inline_ raw HTML in a block's prose.** Now unreachable from the toolbar, but still
  true if you hand-edit a page file: `<br>` inside a paragraph fails to parse and the block
  renders as an "invalid markdown" node. For a line break, use a **Markdown hard break** —
  two trailing spaces; the editor normalises it to a backslash and Astro still renders
  `<br>`.
- **Smart quotes must be real characters.** Astro's MDX pipeline used to apply smartypants;
  the CMS renderer doesn't, so a straight `'` now renders straight. Type the real `’`.
- **Link hrefs go through an allowlist.** The CMS renderer rewrites any href it doesn't
  recognise to `#`, silently. Its own list is relative paths, `http(s)` and `mailto:` —
  which dropped every `tel:` link on the site until we overrode it. Relative, `http(s)`,
  `mailto:` and `tel:` all work; anything else needs adding to
  `src/lib/tina/rich-text-href.ts`, and it's an allowlist on purpose, because a
  `javascript:` href typed into a page body would be stored XSS. `scripts/check-site.mjs`
  is no help here — it skips these schemes, having no way to resolve them against `dist`.
- **A photo's own description is optional; a description isn't.** The per-photo field
  falls back to the Photo descriptions catalog, so it's never `required`. Instead
  `checkPhotoAlt` (`tina/block-rules.mjs`) refuses a save when the photo has no catalog
  entry and the field is blank. Its idea of the catalog is fixed when the admin is built, so
  a photo described since then still asks until the next deploy. A logo's description is
  required whenever there's a logo — logos are never catalogued. `scripts/check-site.mjs` stays the backstop for an
  image that was already saved, which form validation can't reach. Hero fields can't use
  `required` at all: they belong to a _collection_, where it becomes a non-null GraphQL
  field and the indexer rejects every already-saved page missing it (see the note at the
  top of `tina/config.ts`).
- **A page needs an SEO description or an intro line.** Either becomes the page's meta
  description, and the build's crawl fails a page with neither. `required` can't express
  "one of two", so `seoDescription` carries a `ui.validate` (`checkSeoDescription` in
  `tina/templates.mjs`) that asks for one only when the hero has no intro line — which
  includes every cinematic hero, since cinematic never shows its intro line.
- **The short-links list has no columns.** The CMS has no list-view column configuration, so
  400-odd entries show as filenames — which is why the filename is the short link itself. (The deployed admin has no search box: Tina's list search
  needs a TinaCloud search token this site doesn't configure, so `searchable` marks change
  nothing there. Scan by filename.)
- **Short-link rules run in two places, on purpose.** `tina/short-link-rules.mjs` holds
  everything decidable from one entry — the address shape, the reserved prefixes, the
  destination, and "a review date unless it's marked permanent" — and both
  `tina/config.ts` (as `ui.validate`) and `scripts/generate-redirects.mjs` import it, so an
  editor gets the message in the form instead of in a build they never see. The script stays
  the authority: it alone reads every entry, so duplicate addresses and the review-date
  warnings can only happen there. Add a per-entry rule to the shared module, not to one side.
- **Block descriptions don't show in the insert menu.** They're in the schema and worth
  keeping, but the menu renders labels only — the manual's [block chooser](./manual/blocks.md) is the
  substitute.
- **Slash (`/`) inserts headings and lists only**, inside a block's Text field. Blocks
  aren't in that menu — they're added with the **+** on the Body field.
- **The `pages` directory must exist** even when empty — add a `.gitkeep` if it's ever
  emptied.
