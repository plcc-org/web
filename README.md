# Pine Lake Covenant Church – Website Prototype

A fast-iteration prototype for the Pine Lake Covenant Church (PLCC) website, built
with a photo-rich, editorial visual style and optimized for young families and
first-time guests.

**Goals**

- Experiment with information architecture for new visitors
- Explore a photo-rich, editorial visual style
- Optimize for young families and first-time guests
- Stay static, fast, and GitHub Pages–friendly

**Non-goals (for now)**

- CMS integration
- Full Church Center API integration
- Long-term hosting decisions

## Tech stack

- **[Astro 6](https://astro.build/)** — static site generation (SSG)
- **TypeScript**
- **Vanilla CSS** with design tokens (`src/styles/`)
- Optimized images via Astro's `<Image>` (WebP, responsive)
- Deployed to **GitHub Pages** (staging) and **plcc.org** (production)

## Quick start

Requires Node.js (LTS) and npm.

```bash
npm install
npm run dev      # local dev server at http://localhost:4321/
npm run build    # production build to dist/
npm run preview  # preview the production build locally
```

Other scripts:

```bash
npm run check         # astro check (type + template diagnostics)
npm run format        # Prettier — write
npm run format:check  # Prettier — verify only
```

> Run `npm run format` before committing. CI runs `format:check` and `check`.

## Project structure

```
src/
  assets/images/    Photo library (source for the <Image> pipeline)
  components/       Astro components (Hero, Split, MomentsSection, cards, …)
  config/site.ts    Environment-aware site/base/index config
  data/             Data-driven content (nav links, doors, quotes, image catalogue)
  layouts/          BaseLayout.astro (head, header, footer, skip link)
  lib/              Image registry + events/messages helpers
  pages/            Routes (file-based)
  styles/           Design tokens + global CSS (entry: global.css)
public/             Static assets served as-is (favicon, video, manifest)
docs/               Project notes
nginx/, Dockerfile  Container image for serving the built site
```

## Design system

The visual language, tokens, layout system, and components are documented in
**[`DESIGN.md`](./DESIGN.md)** — start there before making visual changes. Content
strategy, voice, and the editorial guardrails live in **[`CLAUDE.md`](./CLAUDE.md)**.

A few load-bearing conventions:

- Reference design tokens (`var(--color-…)`, `var(--text-…)`, `var(--space-…)`) —
  don't hard-code colors, sizes, or shadows.
- Internal links use the base path: ``href={`${import.meta.env.BASE_URL}about/`}``.
- Repeating content belongs in `src/data/`, mapped over in pages.
- Photos render through the `<Photo>` component and are catalogued in
  `src/data/homePageImages.ts`. Favor **portrait** imagery.

## Deployment

Hosting target is environment-aware (`src/config/site.ts`, consumed by
`astro.config.mjs`), selected by `DEPLOY_ENV`:

| Env           | Site                            | Base         | Indexed |
| ------------- | ------------------------------- | ------------ | ------- |
| `development` | localhost (root)                | —            | no      |
| `staging`     | `timsneath.github.io/plcc-web/` | `/plcc-web/` | no      |
| `production`  | `plcc.org` (root)               | `/`          | yes     |

GitHub Actions builds the **staging** target by default (see
`.github/workflows/`). The sitemap is only emitted when `site` is set (staging /
production).

---

## Alternative: run with Apple `container` (macOS)

This project includes a `Dockerfile` that works with Apple's `container` CLI, for
serving the built site or running dev in isolation. The npm workflow above is the
simplest path; these are optional.

### Prerequisites

- Install and configure Apple's `container` tool
- Start container services:

```bash
container system start
```

Optional, for friendly local DNS names:

```bash
container system property set dns.domain internal
```

### Serve the built site

From the repo root:

```bash
container build --tag plcc-web .
container run --name plcc --detach --rm plcc-web
```

The site is served by NGINX on port `8080` inside the container. With
`dns.domain=internal`, open `http://plcc.internal:8080`; otherwise find the IP with
`container ls` and open `http://<container-ip>:8080`. Stop with `container stop plcc`
(auto-removed via `--rm`).

### Develop in a container (no host npm)

Run Astro dev inside a Node container with this repo bind-mounted:

```bash
npm run dev:container       # start
npm run dev:container:stop  # stop
```

Open `http://plcc-dev.internal:4321` (with `dns.domain=internal`) or
`http://localhost:4321`. Live reload works while editing local files; `node_modules`
stays inside the container (`tmpfs`), not in your repo.

### Troubleshooting

If a build fails due to Rosetta requirements and you only need ARM builds:

```bash
container system property set build.rosetta false
container system stop
container system start
```
