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

The site is **static** except for two CMS routes — the visual-editing endpoint
(`/tina-island/*`) and the editor's preview of pages not yet deployed (`/tina-preview/*`) —
which run as a Cloudflare function. See [cms.md](./cms.md) for the CMS and its one-time
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

`.github/workflows/capture-events.yml` runs nightly (12:00 UTC) and is the **second way a
deploy happens**: it captures the Planning Center calendar, verifies it with a full build and
crawl, and commits the refreshed capture — and that commit to `main` is what triggers the
Cloudflare rebuild. So the site redeploys daily even when nobody touches it, which is also
what ages past events off "What's On". If the calendar ever looks stale, check this workflow
before anything else. See [events.md](./events.md).

Cloudflare is the only host, and the site needs it to stay that way: visual editing depends
on its function routes (`/tina-island/*`, `/tina-preview/*`), so a static-only host
can't serve the CMS. The production cutover (point `plcc.org` DNS at Cloudflare) is covered
in [cms.md](./cms.md#3-cutover-and-production).

### Settings that live in the Cloudflare dashboard

These can't be committed. `@astrojs/cloudflare` generates `dist/server/wrangler.json`
itself; the repo's root `wrangler.jsonc` only adds `nodejs_compat` on top of it (required —
see [cms.md](./cms.md)). Everything else has to be set in the dashboard, so the settings
below are recorded here because nothing in the repo can assert them:

| Setting                 | Value                                  | If it's wrong                                                                                                 |
| ----------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Build command           | `npm run build`                        | Without the CMS wrapper the build fails at prerendering with `fetch failed`                                   |
| `DEPLOY_ENV`            | `staging` (production: `production`)   | Falls back to staging with a build-log warning; on the production Worker that means the site is never indexed |
| Node version            | _not set_ — comes from `.node-version` | Cloudflare's default (22.16.0) trips an `EBADENGINE` warning; Node 25 risks a datalayer hang (see cms.md)     |
| CMS auth credentials    | per the CMS backend (see cms.md)       | Editors can't sign in to /admin                                                                               |
| `TINA_PUBLISH_ADMIN`    | `true` on deploys that ship the editor | `/admin` 404s — the SPA is neither compiled nor deployed (see development.md)                                 |
| `PUBLIC_TINA_CLIENT_ID` | the TinaCloud project's client ID      | Beyond auth, it feeds the `/assets/images/*` → CDN redirect; unset, admin thumbnails and previews 404         |

`DEPLOY_ENV` is the one with no safety net in the repo: it's read at build time by
`astro.config.mjs`, and Workers Builds only takes build variables from the dashboard.
`resolveDeployEnv()` warns when it has to guess — see `src/config/site.ts`.

### A branch build is not a main build

`TINA_TOKEN` is stored as a **secret**, and a build off a branch does not appear to get
it — its log says `build: no TinaCloud credentials — emitting a local client`, while the
deploy off `main` has them. The plain variables (`PUBLIC_TINA_CLIENT_ID`,
`TINA_PUBLISH_ADMIN`, `DEPLOY_ENV`) arrive either way.

So that line in a **branch** build's log is expected, not a misconfiguration. On `main` it
would be a real problem, and the one-line check that it isn't happening needs no dashboard:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  -H 'Content-Type: application/x-tina-preview+json' \
  'https://plcc.dev/tina-island/page?relativePath=visit.mdx'
```

`200` means the deploy has working credentials — the island route only renders when
`scripts/build.mjs` took its `--content=local` branch, which needs both halves. A bare
`GET` returns `405` by design and tells you nothing.

It also decides which build path runs: without the token `build.mjs` passes `--local`,
which starts the local datalayer — the step below that can stall. Branch builds take that
path; `main` doesn't.

### A build stuck at "Indexing local files"

Two documented causes land there, and both are pinned in the repo: a heap under 4 GB
(`scripts/build.mjs` forces 4096 MB) and Node 25 (`.node-version` pins 22). If a build
hangs there with **both already correct**, it is a Cloudflare-side stall, not this repo —
one sat for 24 minutes and then failed on its own.

The tell is in the _other_ commits: Workers Builds runs one build at a time per Worker, so
a hung build holds the queue and later commits get **no Workers check at all** — not a
queued one, simply absent. GitHub's `verify` on the same commit passing in ~2 minutes
confirms it, since it runs the same build.

Cancel the stuck build in the dashboard; the queue releases and the waiting commits build
immediately. `wrangler` can't do it — its OAuth token is rejected by the builds API
(`10000 Authentication error`), so this one needs the dashboard.

---

## Optional: run with Apple `container` (macOS)

The repo includes a `Dockerfile` that works with Apple's `container` CLI, for building
and serving the site, or running dev, with no Node on the host. The npm workflow in
[development.md](./development.md) is the simplest path; these are optional.

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

The image builds the staging target (`--build-arg DEPLOY_ENV=production` for the other)
and serves it with `astro preview` on port `8080` inside the container. That is the
Cloudflare adapter's own preview, running the built Worker in workerd, so short links,
the `_headers` security headers, the 410 routes and the 404 page all behave as deployed.
With `dns.domain=internal`, open `http://plcc.internal:8080`; otherwise find the IP with
`container ls` and open `http://<container-ip>:8080`. `--publish` doesn't forward to
`localhost` on this CLI, so use the container's own address. Stop with
`container stop plcc` (auto-removed via `--rm`).

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
