# Editing the site (Keystatic CMS)

The site has a built-in content editor so non-technical people can change copy, swap photos,
and build new pages without touching code. It's [Keystatic](https://keystatic.com) — a free,
Git-based CMS: every change an editor makes is committed to the GitHub repo, and the site
rebuilds and deploys automatically.

For the stack and conventions, see [development.md](./development.md); for hosting, see
[infrastructure.md](./infrastructure.md).

---

## The big picture

- The editor lives at **`/keystatic`**. In local development it reads and writes the files
  in your working copy directly. On the deployed site editors sign in through **Keystatic
  Cloud**, and their saves are committed to the GitHub repo.
- **The public site stays static.** Editing produces a Git commit; the commit triggers a
  build; the build ships static HTML. Visitors never hit a server — only the two `/keystatic`
  admin routes run on demand.
- The config is **`keystatic.config.ts`** at the repo root. Its schemas must stay aligned
  with the Astro content schemas in `src/content.config.ts` (Astro validates the same files
  at build time). **Change one, change the other.**

---

## What's editable, and why

A guiding principle keeps editing simple: **a collection or singleton earns its place only
when its data is reused across the site, or referenced from inside content.** Otherwise it's
just a page's content and belongs in that page's editor.

| In the CMS           | What it is                                    | Kind      |
| -------------------- | --------------------------------------------- | --------- |
| **Pages**            | CMS-built pages (hero + a body of blocks)     | content   |
| **Leadership**       | Pastors & staff — reusable people entities    | shared    |
| **Youth moments**    | Signature youth trips/retreats (curated)      | shared    |
| **Homepage quotes**  | Rotating testimonials (reusable social proof) | shared    |
| **Start-here links** | Homepage link cards                           | page data |

> **Start-here links** remains because the homepage (still hand-built; see below) renders its
> `home` group. Page-specific cards that used to be stored as data now live inline in the
> page that shows them: the `new` page folded its links into a **Link cards** block, and the
> `neighbors` "common starting points" doors are now **Text cards** (with a labelled link)
> in the page itself — they were only ever used on that one page, so they're content, not
> shared data.

**Photos are deliberately not a collection.** The 442-entry catalog (`src/content/photos.json`)
is build-time infrastructure for the hand-built pages. Editors add photos by **uploading them
into a page block**, where the photo and its (required) description live together.

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

### Where uploaded photos go

When you upload a photo into a block, Keystatic stores it under
`src/assets/images/<page-slug>/…` and the build optimizes it (responsive WebP) like every
other image — there's nothing to manage. Existing curated photos elsewhere on the site still
come from the catalog via `<Photo filename>`.

---

## For developers: how a page renders

- `src/pages/[...slug].astro` loads each `pages` entry, renders the hero with `PageHero`,
  then renders the MDX body with `<Content components={…} />`.
- The MDX body is authored via Keystatic's `fields.mdx` (`keystatic.config.ts`), whose
  `components` are content-components (`block`/`wrapper`). Each maps by name to a thin Astro
  wrapper in **`src/components/blocks/mdx/`** (e.g. `Split` → `SplitMdx.astro`), which calls
  the real site component. So everything reuses the existing components and their styles.
- Internal code names differ from editor labels (the label is what editors see): `Section` =
  "Rich text", `Split` = "Photo & text", `CaptionedPhoto` = "Photo", `PhotoBand` =
  "Photo gallery", `CardRow` = "Text cards", `Cta` = "Banner", `Quote` = "Quote",
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
- Adding a block = a content-component in `keystatic.config.ts` (with a `ContentView`
  preview) **and** a matching wrapper in `src/components/blocks/mdx/` registered in the
  `[...slug].astro` components map. Keep the two in step.

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
full-bleed video hero), `events/*` (the `EventsBoard` _is_ the page), `messages` (live
video archive), and `about/leadership` (modal + view-transition morph). They're already
components; they just aren't editor surface. (The pastor's letter _was_ here until its
layout became the reusable **Letter** block.)

---

## Running the editor locally

```bash
npm run dev      # then open http://localhost:4321/keystatic
```

Local mode writes straight to your working copy — edit, save, and the files change and the
site hot-reloads. No login or cloud needed. (Dev intentionally runs without the Cloudflare
adapter so the admin works on Node; see `astro.config.mjs`.)

---

## Deployed setup (one-time)

Editors sign in through **Keystatic Cloud** and their saves are committed to the repo. This
needs a host that can run Keystatic's two server routes; the `@astrojs/cloudflare` adapter
ships them as a Cloudflare **Worker** while the public pages stay static.

> **⚠️ Keystatic Cloud is a temporary workaround, not the long-term choice.** We'd prefer
> self-hosted **GitHub mode** (`storage: { kind: 'github' }`) — fully free, no third-party
> service — but it's currently broken on Astro 6 + Cloudflare Workers: the OAuth login sets
> no state cookie, so the callback 401s ([Thinkmill/keystatic#1497](https://github.com/Thinkmill/keystatic/issues/1497),
> open/unfixed as of 2026-07). Cloud sidesteps it and is **free for our usage** — the free
> tier covers up to **3 editors** with GitHub auth, and our images live in the repo (so we
> never touch paid Cloud Images). **Revisit when #1497 is fixed, or if editors exceed 3**
> (Cloud Pro is $10/mo + $5/user beyond 3). The switch is a one-line change in
> `keystatic.config.ts`.

### 1. Cloudflare (staging → `plcc.dev`)

1. Cloudflare dashboard → **Workers & Pages → Create** → **Import a repository** (Workers
   Builds), pick `timsneath/plcc-web` and the deploy branch.
2. Build settings: keep Cloudflare's defaults — **build command** `npm run build`, **deploy
   command** `npx wrangler deploy`. `npm run build` runs `astro build` plus the `prebuild`
   hook (clears a stale Vite cache) and depends on the install step's `postinstall`
   (`patch-package`, which re-applies the Astro 6 fix — Workers Builds runs `npm ci` first, so
   this happens automatically). The adapter emits the Worker config (`main`, `assets` from
   `dist/client`, and the `SESSION` KV binding); `wrangler deploy` picks it up from the repo
   root automatically. **Do not add a root `wrangler.jsonc`** — the `@cloudflare/vite-plugin`
   treats it as authoritative and Keystatic's `virtual:keystatic-config` fails to build.
3. **KV namespace (`SESSION`)**: the adapter enables Astro's session API against a `SESSION`
   KV binding. Wrangler auto-provisions it on first deploy; if your CI can't do interactive
   provisioning, create a KV namespace named `SESSION` in the dashboard first.
4. **Environment variables**: set `DEPLOY_ENV=staging` (targets `plcc.dev`, `noindex`).
   Set `NODE_VERSION` to a current LTS if Cloudflare's default lags.
5. **Custom domain**: add `plcc.dev` to the Worker (the domain is already in the Cloudflare
   account).

A push to the connected branch builds and deploys; other branches get preview URLs. To
deploy by hand instead: `npm run build && npx wrangler deploy` from the repo root.

> **`nodejs_compat`:** the adapter emits `compatibility_flags: []`, and a local `wrangler dev`
> run served both `/keystatic` and `/api/keystatic/*` without it. If the _live_ editor hits a
> Node-API error during sign-in or save, add `nodejs_compat` — but because a root
> `wrangler.jsonc` breaks the build (above), inject it into `dist/server/wrangler.json` as a
> post-build step in the deploy command rather than via a root config file.

### 2. Keystatic Cloud (auth for the live editor)

`keystatic.config.ts` uses `storage: { kind: 'cloud' }` with `cloud.project` in production.

1. Create the project at **[keystatic.cloud](https://keystatic.cloud)** and connect it to the
   `timsneath/plcc-web` GitHub repo.
2. Make sure `cloud.project` in `keystatic.config.ts` matches the project slug
   (`<team>/<project>`).
3. Invite editors to the Keystatic Cloud project. They then sign in at `/keystatic` on the
   deployed site and their saves become commits. No GitHub App or `KEYSTATIC_GITHUB_*` secrets
   are needed.

### 3. Cutover and production

Cloudflare is the only host; `plcc.dev` serves staging. The `plcc.org` production cutover
is future work: add a Worker environment with `DEPLOY_ENV=production`, bind `plcc.org`, and
point its DNS at Cloudflare. Redirects from the old site's URLs need to land in the same
change, or every existing inbound link breaks.

---

## Gotchas

- **Astro 6 patch (`patch-package`).** `@keystatic/astro@5.2.0`'s server route reads
  `Astro.locals.runtime.env`, which Astro 6 removed — under Cloudflare's workerd that throws
  and makes every `/api/keystatic/*` request 500. `patches/@keystatic+astro+5.2.0.patch` wraps
  that read so it falls back safely (verified under `wrangler dev`). It's re-applied on install
  by the `postinstall: patch-package` script — don't remove that script, and re-generate the
  patch (`npx patch-package @keystatic/astro`) if you bump `@keystatic/astro`.
- **Keep the two schemas in sync** — a field in `keystatic.config.ts` with no counterpart in
  `src/content.config.ts` (or vice versa) will be invisible to the build or fail validation.
- **CMS pages are Prettier-ignored** (`src/content/pages/` in `.prettierignore`) — Prettier's
  MDX reflow breaks block-component children. Keystatic owns their formatting.
- **No raw HTML in page bodies** — an MDX body must be **Markdown plus the registered block
  components only** (the capitalized components listed above). A raw HTML tag like `<br>`,
  `<span>`, or `<div>` is treated by Keystatic's editor as a content-component that must be
  registered, so the page fails to load with `Missing component definition`. For a line break,
  use a **Markdown hard break** (two trailing spaces at the end of a line); Astro still renders
  it as `<br>`.
- **`alt` is required** on every image field, so an image can't be saved without a
  description.
- **The `pages` directory must exist** even when empty (kept via `.gitkeep`).
