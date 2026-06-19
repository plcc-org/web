# Infrastructure & Deployment

How the site is hosted and shipped. For the codebase and build scripts, see
[development.md](./development.md).

---

## Environments

Hosting is on **Cloudflare Pages**, which builds from the GitHub repo on every push. The
target is selected by the `DEPLOY_ENV` variable, resolved in `src/config/site.ts` (consumed
by `astro.config.mjs`):

| Env           | Where                                  | Base | Indexed |
| ------------- | -------------------------------------- | ---- | ------- |
| `development` | localhost + Cloudflare preview deploys | `/`  | no      |
| `production`  | `plcc.org` (`DEPLOY_ENV=production`)   | `/`  | yes     |

Everything is served from the root, so `base` is `/`. Internal links still go through the
`withBase()` helper (harmless at root, and it keeps the subpath option open) — see
[development.md](./development.md).

The site is **static** except for Keystatic's two admin routes (`/keystatic`,
`/api/keystatic/*`), which run as Cloudflare functions. See [cms.md](./cms.md) for the CMS
and its one-time Cloudflare + GitHub App setup.

---

## What changes per environment

- **Indexing.** `robots.txt` switches to `Allow` + sitemap only in `production`; everything
  else stays `noindex`.
- **Canonical / social URLs.** OG and canonical URLs use the real domain in `production`.
- **Sitemap.** Emitted only when `site` is set (i.e. `production`).

---

## CI / build

**Cloudflare Pages** builds and deploys on every push: the production branch publishes to the
live domain, other branches get preview URLs. The build command is `npm run build`; the
adapter needs the `nodejs_compat` compatibility flag (see [cms.md](./cms.md)).

`.github/workflows/ci.yml` still runs the checks on every push — `format:check`, `check`,
`test`, `build`, `test:site` (see [development.md](./development.md)).

### Cutover from GitHub Pages

The site previously deployed to GitHub Pages via `.github/workflows/deploy.yml`. Because that
can't serve Keystatic's function routes, the cutover (point `plcc.org` DNS at Cloudflare,
retire `deploy.yml`) is covered in [cms.md](./cms.md#3-cutover-from-github-pages).

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
