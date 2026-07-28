# Pine Lake Covenant Church — Website

The website for Pine Lake Covenant Church (PLCC): a photo-rich, editorial site built for
young families and first-time guests, with a clear information architecture and a
welcoming, grounded tone. Built with [Astro](https://astro.build/) + TypeScript and
statically generated — fast, cheap to host, and easy to extend.

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
npm run lint:css      # Stylelint — enforces the design tokens
npm test              # Vitest unit tests
npm run test:site     # crawl the built site (run after npm run build)
npm run format        # Prettier — write
npm run format:check  # Prettier — verify only
```

> Run `npm run format` before committing. CI runs all of the above, and builds and crawls
> both deploy targets. Cloudflare does **not** run them — GitHub Actions is the only gate.

## Documentation

The thinking, voice, design, and engineering behind the site live in **[`docs/`](./docs/)**.
Start with the [docs index](./docs/README.md), or jump straight in:

- **[Philosophy & guardrails](./docs/philosophy.md)** — why the site exists and what belongs on it.
- **[Editorial voice](./docs/voice.md)** — tone and word choices.
- **[Editing the site](./docs/cms.md)** — the TinaCMS editor: pages, blocks, photos, short links.
- **[Design system](./docs/design-system.md)** — visual language, tokens, layout, components.
- **[Development & architecture](./docs/development.md)** — stack, structure, conventions, the image system.
- **[The events subsystem](./docs/events.md)** — how "What's On" gets its data.
- **[Infrastructure & deployment](./docs/infrastructure.md)** — environments, hosting, and container workflows.

[`CLAUDE.md`](./CLAUDE.md) is a condensed rule sheet for AI coding agents that points into
the same docs.

## Deployment

Hosting is Cloudflare Workers, environment-aware via `DEPLOY_ENV`: `development`
(localhost), `staging` (`plcc.dev`), and `production` (`plcc.org`). Cloudflare builds and
deploys on push; GitHub Actions runs the checks. Full details — including the Apple
`container` workflow — are in [infrastructure.md](./docs/infrastructure.md).
