# Editing the site (TinaCMS)

The site has a built-in content editor so non-technical people can change copy, swap photos,
and build new pages without touching code. It's [TinaCMS](https://tina.io) — a Git-based CMS:
every change an editor makes becomes a commit, and the site rebuilds and deploys
automatically.

For the stack and conventions, see [development.md](./development.md); for hosting, see
[infrastructure.md](./infrastructure.md).

---

## The big picture

- The editor lives at **`/admin`**, and it works two ways. The **forms view** lists a page's
  blocks and opens each one as a typed form. **Visual editing** shows the real rendered page
  beside the form: click a heading or a photo on the page and its field focuses in the
  sidebar, and typing updates the page live.
- **The public site stays static.** Editing produces a Git commit; the commit triggers a
  build; the build ships static HTML. Visitors never hit a server — the only on-demand route
  is `/tina-island/*`, which re-renders a region while an editor is typing.
- The config is **`tina/config.ts`** (collections and fields) plus **`tina/templates.mjs`**
  (the block palette). Its schemas must stay aligned with the Astro content schemas in
  `src/content.config.ts` — Astro validates the same files at build time, and the two catch
  different mistakes. **Change one, change the other.**
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
first because it's what an editor is nearly always here for; the shared lists that feed
page blocks follow; Short links sits last, being routing config rather than content and
the least often touched.

| In the CMS          | What it is                                    | Kind    |
| ------------------- | --------------------------------------------- | ------- |
| **Pages**           | CMS-built pages (hero + a body of blocks)     | content |
| **Leadership**      | Pastors & staff — reusable people entities    | shared  |
| **Youth moments**   | Signature youth trips/retreats (curated)      | shared  |
| **Homepage quotes** | Rotating testimonials (reusable social proof) | shared  |
| **Short links**     | Vanity URLs pointing off-site                 | routing |

All five sit under one **Collections** heading. One of them — **Homepage quotes** — is a
single YAML file holding one list, so clicking it skips the list view and opens that form
directly. It offers no "add" or "delete" at the file level (`allowedActions` in
`tina/config.ts`): the one file is the only file. Adding and removing quotes _within_ the
list is the normal thing to do and works as usual.

It is deliberately not marked `ui.global`. That flag exists for genuine site configuration
and moves a collection out of the Collections list into the **Site** section next to Media
Manager — which, copied from Tina's own starter, split the sidebar in two and hid half the
editable lists from the people who edit them. This is content that happens to live in one
file, so it belongs in the list with everything else.

> **Link cards are page content, not data.** Every set of them now lives inline in the page
> that shows it: the `new` page folded its links into a **Link cards** block, the
> `neighbors` "common starting points" doors became **Text cards** (with a labelled link),
> and the homepage's four "Start here" doors are an array in `src/pages/index.astro`. Each
> set had exactly one reader, so by the rule above none of them earned a collection. The
> homepage's are in code rather than the CMS because the homepage itself is hand-built (see
> [What becomes a CMS page or block](#what-becomes-a-cms-page-or-block-and-what-stays-as-code))
> — changing them is a code change.

**Photos are deliberately not a collection.** The 110-entry catalog (`src/content/photos.json`)
is build-time infrastructure for the hand-built pages. Editors add photos by **uploading them
into a page block**, where the photo and its (required) description live together.

### Short links

`plcc.org/camp` → a Church Center registration page. These go on flyers and get read out
from the platform, so the short link has to outlive whatever it points at — Church Center
mints a new event ID every year, and the printed URL can't change.

Add one under **Short links**. The "Short link" field is the bit after `plcc.org/`, and the
file is named from it, so typing `camp` gives you `plcc.org/camp`. Two things worth knowing:

- **Leave the kind as "a shortcut" unless you're certain.** A shortcut stays yours to
  re-point next year. "Permanently moved" tells browsers to remember the destination more
  or less forever — they'll stop asking the site at all, so re-pointing it later won't
  reach anyone who has already followed it. Use it only for a page that has genuinely moved
  for good.
- **A short link can't be named after an existing page.** `camp` is fine; `visit` would hide
  `/visit/`. The build fails if you try, rather than quietly taking a page off the site.

**Every short link needs a "Review by" date.** A sign-up shortcut: when the thing it points
at ends. A moved page: about a year, by which point search engines have caught up. The list
view shows these dates, so it's obvious at a glance what needs attention.

The date is a prompt, not a switch — **the link keeps working past it.** A URL printed on a
flyer doesn't stop existing because a date passed, and quietly 404ing it would be a worse
failure than letting it run on. What the date buys you is a list you can actually review:
without one, nobody deletes anything, because nobody remembers what it was for. Builds print
which links are due or overdue.

The exception is a link to something the church simply has — the podcast, for instance.
There's no date at which that stops being true, and a review that always ends in "yes, still"
just trains people to ignore the list. Tick **"This link never needs reviewing"** and leave
the date empty. Ticking it _and_ setting a date fails the build, because a later reader can't
tell which one to believe.

Both forms work — `plcc.org/camp` and `plcc.org/camp/` — so it doesn't matter which one
gets printed. The redirect happens at Cloudflare's edge, so there's no page load in between.

Old-site redirects live here too, as "a page that has permanently moved", with a date about
a year out — one list to review rather than two places to forget about.

---

## Pages: hero + a body of blocks

A page has two parts:

1. **A hero** (in the page's form): an eyebrow, the page title (its `<h1>`), an optional
   subhead, an intro line, and optionally a photo. Leave the photo blank for a calm,
   text-only header (used by reading pages like Contact). A wordmark **logo** and a hero
   **button** are also available. Every page gets a hero.
2. **A body** — a **rich-text editor** where you type formatted prose and insert **blocks**
   from the "+" / insert menu. Each block is a pre-styled section, so anything you build
   stays on-brand. Blocks show inline as labelled cards (with a photo thumbnail where
   relevant), and you edit a block's text right on the card.

To make a new page: add a **Pages** entry, give it a title and a URL slug (`momco` →
`/momco/`), fill the hero, and stack blocks. New pages start as **drafts** — visible in
preview but not on the published site — so uncheck **Draft** to publish when it's ready.

### The block palette

| Block                    | Use it for                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **Rich text**            | A heading and formatted paragraphs — the default for written content.                                               |
| **Photo & text (split)** | A photo beside text (left or right, tinted background) — show-and-tell.                                             |
| **Photo**                | A single framed photo with an optional caption.                                                                     |
| **Photo gallery**        | Several photos shown together as a visual break.                                                                    |
| **Video**                | A YouTube or Vimeo video in a photo-style frame — paste the ordinary link, not an embed code.                       |
| **Text cards**           | A row of small cards (title + a line) — a few parallel points.                                                      |
| **Link cards**           | A grid of cards that link elsewhere — signposting to other pages.                                                   |
| **Callout**              | A boxed aside that sets one point apart — a reassurance, a key fact.                                                |
| **Banner**               | A full-width colored band that makes a statement, with an optional button.                                          |
| **Quote**                | A single featured pull-quote — a testimonial, quotation, or verse. A background color renders it as a "verse band." |
| **Featured events**      | A short list of upcoming events, pulled live from the events feed.                                                  |
| **Key points**           | A moss-accented grid of titled points — core tenets, emphases, principles.                                          |
| **Logo cards**           | A row of cards each topped by a program or partner logo, with an optional link.                                     |
| **Aside**                | A tinted note set apart from the page — text beside an optional small logo.                                         |
| **Youth moments**        | The signature youth tentpoles (trips, retreats), pulled live from the Youth moments list.                           |
| **Quotes carousel**      | A rotating band of testimonials, pulled live from the Homepage quotes list.                                         |
| **Roadmap**              | A numbered timeline — steps as nodes on a connecting line (e.g. "in three movements").                              |
| **Letter**               | A personal letter — flowing prose beside a portrait, closing with a signature (a welcome or note).                  |

Notes for editors:

- **Photos** are drag-and-drop. Always fill the **photo description (alt text)** — it's
  required (the site won't build without it) and it's what makes the site accessible.
- **Text** accepts Markdown: `**bold**`, `_italic_`, `[links](…)`, and `- bullet` lists.
  Straight quotes and dashes become curly typographic forms automatically.
- Internal links should be root-relative: `/visit/`, `/kids/`.

### Which block do I use?

The palette above tells you what each block _is_. This is the question you actually have:
**I have something to say — where does it go?**

Start here and take the first match:

| If what you have is…                               | Reach for         |
| -------------------------------------------------- | ----------------- |
| A few paragraphs that just need to be read         | **Rich text**     |
| Something better _shown_ than described            | **Photo & text**  |
| One point you don't want people to skim past       | **Callout**       |
| One sentence someone said, worth its own space     | **Quote**         |
| Three or four parallel things, each a line or two  | **Text cards**    |
| Three or four places to go next                    | **Link cards**    |
| A sequence where the order matters                 | **Roadmap**       |
| A set of principles where the order doesn't        | **Key points**    |
| A single photo that needs explaining               | **Photo**         |
| A minute of video that says it better than a page  | **Video**         |
| A moment of visual breathing room                  | **Photo gallery** |
| The one thing you want the reader to do at the end | **Banner**        |
| A personal note in someone's own voice             | **Letter**        |

Three rules of thumb behind that table:

- **Order matters → Roadmap. Order doesn't → Key points.** They look similar in the palette
  and they're not interchangeable: numbering things that aren't sequential tells the reader
  a lie about how to read them.
- **Cards are for parallel things.** If your three cards aren't the same _kind_ of thing,
  they should be prose.
- **One Banner per page, at the end.** It's the loudest block. A second one in the middle
  makes both quieter.

### A page, block by block

`/visit/` — the page a first-time guest actually reads. Why each block is what it is:

| Block             | On the page                               | Why this one                                                                                                                                        |
| ----------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(hero)_          | "Plan a Visit" + a reassuring lede        | Every page gets one. The lede does the emotional work before any logistics.                                                                         |
| **Rich text**     | "Sundays at 10:00am" — when & where       | Facts someone may be scanning for. Prose, not a card — they need to be _read_, and cards invite skimming.                                           |
| **Photo**         | The building, captioned                   | "What am I looking for when I arrive?" A caption can say the thing a photo can't — where to park.                                                   |
| **Photo & text**  | "What happens on a Sunday"                | Show-and-tell: the description is more believable next to the photo of it happening.                                                                |
| **Callout**       | "Will I stand out or be put on the spot?" | The single biggest fear, answered where it can't be skimmed past. This is what a Callout is for — not decoration, but the one point that must land. |
| **Photo & text**  | "We make Sundays smooth for parents"      | Same pattern, second audience. The alternating tint (`paper` then `sand`) is what keeps two adjacent splits from reading as one long block.         |
| **Rich text**     | "What should I wear?"                     | A short practical answer. Doesn't need a photo, doesn't need a box.                                                                                 |
| **Photo gallery** | Three photos, no words                    | Breathing room before the close, and the last impression is faces rather than logistics.                                                            |
| **Banner**        | "A place to belong" + the CTA             | One action, at the end, on a dark band so it reads as the page's conclusion.                                                                        |

The shape underneath: **reassure → orient → show → answer the fear → show again → practical
detail → breathe → invite.** Most guest-facing pages want roughly that arc. You're not
obliged to follow it, but if a page feels flat, compare it against this one.

### Choosing photos

- **Portrait, not landscape.** The whole layout is built around vertical images; a wide crop
  will be cut off or letterboxed.
- **People over places.** A room with nobody in it says nothing. A photo with faces in it
  answers "would I be out of place here?" — which is the question the whole site exists for.
- **Candid over posed.** Nobody lined up looking at the camera.
- **Real, not stock.** Ever.
- **Look at the whole frame before you choose it.** Check the background and the edges — a
  crop lands where you don't expect, and the thing you didn't notice is the thing everyone
  sees.
- **Don't use the same photo twice on one page.** Across pages is fine.

**Alt text** is required and the build fails without it. Write what a person who can't see
the photo would need in order to follow the page — _"A volunteer making coffee at the
welcome café before the service"_, not _"coffee"_ and not _"photo of church"_. If the photo
shows people doing something, say what they're doing.

### Before you publish: the voice check

The full reference is [voice.md](./voice.md). At the moment of writing, five questions:

1. **Could this sentence describe any church?** If yes, rewrite it with something only true
   of Pine Lake. This is the test everything else follows from.
2. **Would a person with no church background understand every word?** Cut "fellowship",
   "discipleship", "ministry", "outreach", "plug in".
3. **Am I describing a program, or a person's situation?** Start with the situation. Not
   _"We have a meals ministry"_ but _"When life is overwhelming, even simple tasks can feel
   heavy."_
4. **Will this still be true in a year?** Dates, times and specific events belong in What's
   On, not in narrative copy.
5. **Am I saying "no pressure" more than once?** Say it once, then show it through structure.

### Where uploaded photos go

Photos live in `src/assets/images/`, and the media library reads that folder directly, so
the build optimizes everything an editor picks (responsive WebP) like every other image —
there's nothing to manage. Existing curated photos elsewhere on the site still come from the
catalog via `<Photo filename>`.

---

## For developers: how a page renders

- `src/pages/[...slug].astro` fetches each page through Tina's GraphQL client
  (`src/lib/tina/data.ts`), then renders it with `PageBody`, wrapped in `<TinaIsland>`.
- **Content comes from Tina, not `getCollection()` + `render()`.** That is what visual
  editing requires: the rendered DOM has to carry the `data-tina-field` markers the editor
  bridge maps forms onto, which a compiled MDX module can't provide. `src/content.config.ts`
  still declares the collection, so zod still validates the files at build time.
- The body renders through `<TinaMarkdown>` with the component map in
  **`src/components/blocks/tina/registry.ts`**. Wrapper blocks (those with prose inside —
  `Section`, `Split`, `Callout`, `Cta`, `Aside`, `Letter`) need a Tina-specific adapter in
  that folder, because their body arrives as a `children` rich-text tree rather than a
  `<slot />`. The twelve self-closing blocks reuse their existing wrappers in
  **`src/components/blocks/mdx/`** unchanged. Either way it's the real site component doing
  the rendering.
- Internal code names differ from editor labels (the label is what editors see): `Section` =
  "Rich text", `Split` = "Photo & text", `CaptionedPhoto` = "Photo", `Video` = "Video",
  `PhotoBand` = "Photo gallery", `CardRow` = "Text cards", `Cta` = "Banner", `Quote` = "Quote",
  `FeaturedEvents` = "Featured events", `KeyPoints` = "Key points", `LogoCards` =
  "Logo cards", `Aside` = "Aside", `YouthMomentsBlock` = "Youth moments", `QuoteCarousel` =
  "Quotes carousel", `Roadmap` = "Roadmap", `Letter` = "Letter".
- Data blocks (Youth moments, Quotes carousel, Featured events) pull from a shared
  collection/singleton rather than inline content — they take only display options.
- Hero/block image references are resolved by `imageFromRef`, a nesting-agnostic registry,
  so a page works whether it's flat (`church-life.mdx`) or nested (`about/covenant.mdx`).
- Block images arrive as path strings; the wrappers resolve them through `imageFromRef`
  (`src/lib/images.ts`), a recursive registry that handles the nested `<slug>/` uploads, and
  hand them to `<Photo>` for build-time optimization.
- Adding a block = a template in `tina/templates.mjs` **and** a matching component
  registered in `src/components/blocks/tina/registry.ts`. If the block has prose inside, give
  its template a field named `children` of type `rich-text` — Tina's MDX parser treats that
  name specially — and write an adapter that renders it via `TinaChildren`. Keep the two in
  step: an unregistered name renders as a visible red placeholder rather than failing the
  build.

### What becomes a CMS page or block (and what stays as code)

Three tiers, narrowing — componentization (Astro's way) and editor surface (the CMS) are
different decisions:

1. **Component — always.** Every element is an Astro component, single-use included.
2. **CMS page** (an MDX entry: hero + blocks) — when the whole page is editor-territory and
   fits the hero-plus-blocks model.
3. **CMS block** (a palette entry) — only when its content repeats and an editor can safely
   compose it anywhere. Every block in the "+" menu is a promise it's safe to insert on any
   page, so a one-off block makes the editor worse for the pages that aren't it.

By this rule, these stay **hand-built `.astro`**, not CMS pages: `index` (home — a bespoke
full-bleed hero with a drifting photo stack), `events/*` (the `EventsBoard` _is_ the page),
`messages` (live video archive), and `about/leadership` (modal + view-transition morph). They're already
components; they just aren't editor surface. (The pastor's letter _was_ here until its
layout became the reusable **Letter** block.)

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
  See `tinaAssetsDevPlugin` in `astro.config.mjs`. Production needs its own answer here —
  currently unresolved.

---

## Deployed setup

**Every build reads content from the files on disk** — no network, no third party. What
changes with credentials is only the client the build emits, and `scripts/build.mjs` picks
between them:

| Environment                            | CMS flags                     | The deployed client                             |
| -------------------------------------- | ----------------------------- | ----------------------------------------------- |
| No credentials (CI, a fresh clone)     | `--local --skip-cloud-checks` | Points at `localhost:4001` — dead once deployed |
| `PUBLIC_TINA_CLIENT_ID` + `TINA_TOKEN` | `--content=local`             | Talks to TinaCloud                              |

The HTML is identical either way, which is why CI still verifies what deploys despite
building without credentials. Only the client URL baked into the bundle differs.

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

**Git remains the source of truth either way**, so this is reversible: content is MDX in the
repo, and moving to a self-hosted backend later changes the backend, not the content. That
is what makes starting on TinaCloud low-risk rather than a lock-in.

**Verify `/tina-island` before the login.** On staging without credentials it returned 500
(`Island render failed`) — the Worker was healthy and enforcing its own guards, so
`nodejs_compat` was fine, but the client pointed at `http://localhost:4001/graphql`, the
datalayer that only exists while a build runs. `--content=local` is the flag that fixes it.
It is the first thing to re-test after a credentials change, because it proves the deployed
backend is actually reachable; a working login does not.

Also unresolved: Tina's FAQ lists **git-backed media** as TinaCloud-only. Repo-based media
works here, but has only ever been exercised locally.

### Cloudflare (staging → `plcc.dev`)

1. Cloudflare dashboard → **Workers & Pages → Create** → **Import a repository** (Workers
   Builds), pick `timsneath/plcc-web` and the deploy branch.
2. Build settings: **build command** `npm run build`, **deploy command**
   `npx wrangler deploy`. The adapter emits the Worker config (`main`, `assets` from
   `dist/client`, the `SESSION` KV binding); `wrangler deploy` picks it up automatically.
3. **`wrangler.jsonc` at the repo root** sets `nodejs_compat`. This is required, not
   optional: Tina keeps its per-request store in an `AsyncLocalStorage`, so the Worker bundle
   imports `node:async_hooks`. Without the flag the build prerenders every page to a 0-byte
   file _and_ the deployed `/tina-island` route 500s — both silently, with the build exiting 0. (A root config used to break `virtual:keystatic-config`; that constraint left with
   Keystatic.)
4. **KV namespace (`SESSION`)**: wrangler auto-provisions it on first deploy; if CI can't do
   interactive provisioning, create a KV namespace named `SESSION` in the dashboard first.
5. **Environment variables**: `DEPLOY_ENV=staging` (targets `plcc.dev`, `noindex`). Set
   `NODE_VERSION` to a current LTS if Cloudflare's default lags.
6. **Custom domain**: add `plcc.dev` to the Worker.

A push to the connected branch builds and deploys; other branches get preview URLs. To deploy
by hand: `npm run build && npx wrangler deploy`.

### Cutover and production

Cloudflare is the only host; `plcc.dev` serves staging. The `plcc.org` production cutover is
future work: add a Worker environment with `DEPLOY_ENV=production`, bind `plcc.org`, and
point its DNS at Cloudflare. Redirects from the old site's URLs need to land in the same
change, or every existing inbound link breaks.

---

## Gotchas

- **The build needs a 4 GB heap, and Node 22.** Both are pinned in the repo (`build` in
  `package.json`, `.node-version`) rather than left to a host's defaults, because both
  failures land in the same place — the CMS's `Indexing local files` step — and neither
  looks like a CMS problem. The heap: the indexer needs more than the 2 GB Node defaults
  to in a build container, and dies with _"Ineffective mark-compacts near heap limit"_.
  The Node version: on 25, a race in the CMS's datalayer client makes it connect before
  its own server is listening, and every query then queues forever
  ([tinacms/tinacms#7295](https://github.com/tinacms/tinacms/pull/7295), unfixed as of
  `@tinacms/graphql@2.4.9`). **Don't "modernise" either one** without reading that PR.
- **`nodejs_compat` is load-bearing.** See the deploy section — without it the build writes
  every page out empty and the island route 500s, both while exiting 0.
- **Keep the two schemas in sync** — a field in `tina/config.ts` with no counterpart in
  `src/content.config.ts` (or vice versa) will be invisible to the build or fail validation.
  They catch different things and both are worth having: zod rejected a page Tina created
  without a `hero`, and Tina's indexer rejects type mismatches zod would let through.
- **`tina/` is excluded from `astro check`.** Type-checking `tina/config.ts` runs the
  compiler out of memory — `defineConfig` from `tinacms` pulls in too large a type graph,
  even at `--max-old-space-size=4096`. The CMS schema is therefore the one file CI can't
  verify. See `tsconfig.json`.
- **CMS pages are Prettier-ignored** (`src/content/pages/` in `.prettierignore`) — Prettier's
  MDX reflow breaks block-component children. The CMS owns their formatting.
- **No _inline_ raw HTML in page bodies.** `<br>` inside a paragraph fails to parse and the
  block renders as an "invalid markdown" node. Block-level HTML (a standalone `<div>…</div>`)
  does round-trip, but there's rarely a reason to reach for it. For a line break, use a
  **Markdown hard break** — two trailing spaces; the editor normalises it to a backslash and
  Astro still renders `<br>`.
- **Object props need identifier keys.** Tina's MDX parser accepts
  `items={[{title: "A"}]}` but not `items={[{"title": "A"}]}`, and rejects bare boolean
  attributes (`reverse` must be `reverse={true}`). The editor always writes the accepted
  form; this only bites when hand-editing MDX. `spike/codemod.mjs` normalises a file.
- **Smart quotes must be real characters.** Astro's MDX pipeline used to apply smartypants;
  the CMS renderer doesn't, so a straight `'` now renders straight. Type the real `’`.
- **Link hrefs go through an allowlist.** The CMS renderer rewrites any href it doesn't
  recognise to `#`, silently. Its own list is relative paths, `http(s)` and `mailto:` —
  which dropped every `tel:` link on the site until we overrode it. Relative, `http(s)`,
  `mailto:` and `tel:` all work; anything else needs adding to
  `src/lib/tina/rich-text-href.ts`, and it's an allowlist on purpose, because a
  `javascript:` href typed into a page body would be stored XSS. `scripts/check-site.mjs`
  is no help here — it skips these schemes, having no way to resolve them against `dist`.
- **`alt` is required** on every image field, so an image can't be saved without a
  description. `scripts/check-site.mjs` stays the backstop — it catches an image that was
  already saved, which is the case field validation can't reach. The two hero alt fields are
  deliberately _not_ required: the CMS has no conditional-required, and enforcing them would
  block every text-only hero page.
- **The short-links list has no columns.** The CMS has no list-view column configuration, so
  55 entries show as filenames. `from`, `destination` and `note` are marked searchable, so
  search the list by the address printed on the flyer rather than scrolling it.
- **Block descriptions don't show in the insert menu.** They're in the schema and worth
  keeping, but the menu renders labels only — the "which block do I use?" table above is the
  substitute.
- **The `pages` directory must exist** even when empty (kept via `.gitkeep`).
