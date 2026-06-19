# Editing the site (Keystatic CMS)

The site has a built-in content editor so non-technical people can change copy, swap photos,
and build new pages without touching code. It's [Keystatic](https://keystatic.com) — a
free, Git-based CMS: every change an editor makes is committed to the GitHub repo, and the
site rebuilds and deploys automatically.

For the stack and conventions, see [development.md](./development.md); for hosting, see
[infrastructure.md](./infrastructure.md).

---

## The big picture

- The editor lives at **`/keystatic`**. In local development it reads and writes the files
  in your working copy directly. In production it signs in with GitHub and commits changes
  to the repo.
- **Nothing about the public site is dynamic.** Editing produces a Git commit; the commit
  triggers a build; the build ships static HTML. Visitors never hit a server.
- The config is **`keystatic.config.ts`** at the repo root. Its collection/field shapes are
  kept in step with the Astro content schemas in `src/content.config.ts` (which validate the
  same files at build time). **If you change one, change the other.**

---

## What's editable

| In the CMS           | What it is                                  | Stored as                           |
| -------------------- | ------------------------------------------- | ----------------------------------- |
| **Pages**            | Stack-of-blocks pages (see below)           | `src/content/pages/*.yaml`          |
| **Leadership**       | Pastors & staff (name, role, portrait, bio) | `src/content/leadership/*.md`       |
| **Youth moments**    | Signature youth trips/retreats              | `src/content/youth-moments/*.md`    |
| **Homepage quotes**  | The rotating testimonials                   | `src/content/quotes.yaml`           |
| **Neighbor doors**   | The "For Our Neighbors" cards               | `src/content/neighbor-doors.yaml`   |
| **Start-here links** | Homepage / "I'm New" link cards             | `src/content/start-here-links.yaml` |

**Photos are deliberately not a CMS collection.** The 442-entry catalog
(`src/content/photos.json`) is build-time infrastructure that backs the hand-built pages.
Editors add photos by **uploading them into a page block** (below), where the photo and its
alt text live together — no catalog to maintain.

---

## Pages: building from blocks

A page is an ordered list of **blocks**. Each block is a pre-styled section that maps 1:1 to
a site component, so anything an editor builds stays on-brand. To make a new page, an editor
adds a Pages entry, gives it a title and URL slug (`momco` → `/momco/`), and stacks blocks.
Drafts are visible in preview but excluded from the published site.

The block palette:

| Block               | What it renders                                                          |
| ------------------- | ------------------------------------------------------------------------ |
| **Page header**     | The page hero: a photo, eyebrow, big title, and intro line               |
| **Text**            | A column of prose (Markdown), with an optional eyebrow                   |
| **Split**           | A photo beside Markdown text — forward or reversed, on sand/paper/forest |
| **Card row**        | A row of titled cards (each with optional link)                          |
| **Callout**         | A bordered "aside" panel for one emphasized point                        |
| **Captioned photo** | A single framed photo with a caption                                     |
| **Photo band**      | A staggered band of photos                                               |
| **Link cards**      | A grid of link cards (title + description + link)                        |
| **Call to action**  | A full-bleed closing band with an optional button                        |

Notes for editors:

- **Photos** (in Split, Photo band, Captioned photo, Page header) are **drag-and-drop
  uploads**. Always fill in the "Photo description" — it's the alt text that makes the site
  accessible (the build fails without it).
- **Text fields accept Markdown:** `**bold**`, `_italic_`, `[links](https://…)`, and
  `- bullet` lists. Straight quotes and `--` become curly quotes and em-dashes automatically.
- Internal links should be root-relative: `/visit/`, `/kids/`.

### How it renders (for developers)

`src/pages/[...slug].astro` loads each Pages entry and hands its blocks to
`src/components/blocks/Blocks.astro`, which switches on the block type and renders the
matching component (`Split`, `CardRow`, `Callout`, `MomentsSection`, `LinkCardSection`,
`Band`, …). The block array is a Zod discriminated union in `src/content.config.ts` whose
`{ discriminant, value }` shape mirrors how Keystatic serializes a conditional field — keep
the two definitions aligned. Block prose is rendered through `src/lib/markdown.ts`.

**Which pages use blocks:** new content pages, plus `church-life` and `visit`. The rest stay
hand-built `.astro` files — either because they're dynamic (`youth` pulls the events feed;
`neighbors` and `about` render collections) or because they have bespoke layouts
(`pastors-letter`) or elements the palette doesn't cover (logos inside cards on `kids` /
`families`). Add new block types if a recurring need appears; don't force a page into blocks
if it degrades it.

---

## Running the editor locally

```bash
npm run dev      # then open http://localhost:4321/keystatic
```

Local mode (`storage: { kind: 'local' }` in `keystatic.config.ts`) writes straight to your
working copy — edit, save, and you'll see the files change and the site hot-reload. No login,
no GitHub, no Cloudflare needed. This is the fastest way to try the editor or add content.

---

## Production setup (one-time)

Editors log in with GitHub and commit to the repo. This needs two things: a host that can run
Keystatic's two server routes (`/keystatic`, `/api/keystatic/*`), and a GitHub App for auth.
The public pages stay static either way — only those two routes run as functions.

### 1. Cloudflare Pages

1. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**, and
   pick the `timsneath/plcc-web` repo.
2. Build settings: **build command** `npm run build`, **output directory** `dist`. (The
   `@astrojs/cloudflare` adapter emits the static site to `dist/client` and the function
   bundle to `dist/server`; Cloudflare wires them up from `dist`.)
3. Under **Settings → Functions → Compatibility flags**, add **`nodejs_compat`**, and set a
   recent compatibility date.
4. **Environment variables:** set `DEPLOY_ENV=production` on the production environment so the
   build targets `plcc.org` and is indexable. Preview/branch deploys can leave it unset (they
   build as the unindexed, root-served "development" target — fine for previews).
5. Node version: set `NODE_VERSION` to a current LTS (e.g. `22`) if Cloudflare's default lags.

A push to the connected branch now builds and deploys automatically. Branch/PR pushes get
preview URLs; the production branch publishes to the live domain.

### 2. GitHub App (auth for the live editor)

Keystatic has a guided flow: deploy with `storage` set to `github` (already the case in
production — see `keystatic.config.ts`), visit `/keystatic` on the deployed site, and follow
the prompt to **create a GitHub App**. It generates the app and hands you the credentials.
Put them in Cloudflare's environment variables:

- `KEYSTATIC_GITHUB_CLIENT_ID`
- `KEYSTATIC_GITHUB_CLIENT_SECRET`
- `KEYSTATIC_SECRET` (any long random string)
- `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` (the app's slug)

Install the app on the `timsneath/plcc-web` repo and grant the people who should edit access
to the repo. After that, an editor visits `/keystatic`, signs in with GitHub, and their saves
become commits.

### 3. Cutover from GitHub Pages

The site previously deployed to GitHub Pages via `.github/workflows/deploy.yml`. That path
can't serve Keystatic's function routes, so at cutover:

- Point the `plcc.org` DNS at Cloudflare Pages.
- Remove or disable `deploy.yml` (the GitHub Pages deploy) so merges don't publish a broken
  static-only build. Keep `ci.yml` — it still validates every push.

---

## Gotchas

- **Keep the two schemas in sync.** A field in `keystatic.config.ts` with no counterpart in
  `src/content.config.ts` (or vice versa) will either be invisible to the build or fail
  validation. Add to both.
- **The `pages` directory must exist.** It's kept in Git via `.gitkeep` so the collection
  loads even when empty.
- **Single-file lists are arrays in the CMS.** Quotes, neighbor-doors, and start-here-links
  are each one YAML file edited as an array; the loader in `src/content.config.ts`
  (`yamlList`) reads both the hand-authored and CMS-written shapes.
