# Infrastructure & Deployment

How the site is hosted and shipped. For the codebase and build scripts, see
[development.md](./development.md).

---

## Environments

Hosting is on **Cloudflare**, which builds from the GitHub repo on every push. The adapter
(`@astrojs/cloudflare`) targets the **Workers** platform (static assets + the one CMS
function routes); it emits a `wrangler.json` under `dist/server/` at build time. The target
is selected by the `DEPLOY_ENV` variable, resolved in `src/config/site.ts` (consumed by
`astro.config.mjs`):

| Env           | Where                                  | Base | Indexed |
| ------------- | -------------------------------------- | ---- | ------- |
| `development` | localhost + Cloudflare preview deploys | `/`  | no      |
| `staging`     | `plcc.dev` (`DEPLOY_ENV=staging`)      | `/`  | no      |
| `production`  | `plcc.org` (`DEPLOY_ENV=production`)   | `/`  | yes     |

`plcc.dev` is the current live staging target; `plcc.org` (production) is a future cutover.

Everything is served from the root, so `base` is `/`. Internal links still go through the
`withBase()` helper (harmless at root, and it keeps the subpath option open) — see
[development.md](./development.md).

The site is **static** except for the CMS's visual-editing endpoint (`/tina-island/*`),
which runs as a Cloudflare function. See [cms.md](./cms.md) for the CMS and its one-time
Cloudflare setup.

---

## What changes per environment

- **Indexing.** `robots.txt` switches to `Allow` + sitemap only in `production`; everything
  else stays `noindex`.
- **Canonical / social URLs.** OG and canonical URLs use the real domain in `production`.
- **Sitemap.** Emitted only when `site` is set (i.e. `staging` and `production`).

---

## CI / build

**Cloudflare** builds and deploys on every push (via Cloudflare's Git integration / Workers
Builds): the connected branch publishes to `plcc.dev`, other branches get preview URLs. The
build command is `npm run build`; the adapter needs the `nodejs_compat` compatibility flag
(see [cms.md](./cms.md)).

`.github/workflows/ci.yml` runs the checks on every pull request and every push to `main`
— `format:check`, `lint:css`, `check`, `test`, then a build and crawl of _both_ deploy
targets (see [development.md](./development.md)). Cloudflare does not run these, so this
workflow is the only gate.

`.github/workflows/scrape-events.yml` runs nightly (12:00 UTC) and is the **second way a
deploy happens**: it captures the Church Center calendar, verifies it with a full build and
crawl, and commits the refreshed snapshot — and that commit to `main` is what triggers the
Cloudflare rebuild. So the site redeploys daily even when nobody touches it, which is also
what ages past events off "What's On". If the calendar ever looks stale, check this workflow
before anything else. See [events.md](./events.md).

Cloudflare is the only host, and the site needs it to stay that way: visual editing depends
on one function route (`/tina-island/*`), so a static-only host
can't serve the CMS. The production cutover (point `plcc.org` DNS at Cloudflare) is covered
in [cms.md](./cms.md#3-cutover-and-production).

### Settings that live in the Cloudflare dashboard

These can't be committed. `@astrojs/cloudflare` generates `dist/server/wrangler.json`
itself; the repo's root `wrangler.jsonc` only adds `nodejs_compat` on top of it (required —
see [cms.md](./cms.md)). Everything else has to be set in the dashboard, so the settings
below are recorded here because nothing in the repo can assert them:

| Setting              | Value                                  | If it's wrong                                                                                                 |
| -------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Build command        | `npm run build`                        | Without the CMS wrapper the build fails at prerendering with `fetch failed`                                   |
| `DEPLOY_ENV`         | `staging` (production: `production`)   | Falls back to staging with a build-log warning; on the production Worker that means the site is never indexed |
| Node version         | _not set_ — comes from `.node-version` | Cloudflare's default (22.16.0) trips an `EBADENGINE` warning; Node 25 risks a datalayer hang (see cms.md)     |
| CMS auth credentials | per the CMS backend (see cms.md)       | Editors can't sign in to /admin                                                                               |

`DEPLOY_ENV` is the one with no safety net in the repo: it's read at build time by
`astro.config.mjs`, and Workers Builds only takes build variables from the dashboard.
`resolveDeployEnv()` warns when it has to guess — see `src/config/site.ts`.

---

## Optional: run with Apple `container` (macOS)

The repo includes a `Dockerfile` that works with Apple's `container` CLI, for serving the
built site or running dev in isolation. The npm workflow in [development.md](./development.md)
is the simplest path; these are optional.

### Prerequisites

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

NGINX serves the site on port `8080` inside the container. With `dns.domain=internal`,
open `http://plcc.internal:8080`; otherwise find the IP with `container ls` and open
`http://<container-ip>:8080`. Stop with `container stop plcc` (auto-removed via `--rm`).

### Develop in a container (no host npm)

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
