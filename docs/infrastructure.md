# Infrastructure & Deployment

How the site is hosted and shipped. For the codebase and build scripts, see
[development.md](./development.md).

---

## Environments

Hosting is **environment-aware**, selected by the `DEPLOY_ENV` variable and resolved in
`src/config/site.ts` (consumed by `astro.config.mjs`):

| Env           | Site                            | Base         | Indexed |
| ------------- | ------------------------------- | ------------ | ------- |
| `development` | localhost (root)                | —            | no      |
| `staging`     | `timsneath.github.io/plcc-web/` | `/plcc-web/` | no      |
| `production`  | `plcc.org` (root)               | `/`          | yes     |

Because the base path differs between environments, **all internal links must use
`${import.meta.env.BASE_URL}`** (see [development.md](./development.md)).

---

## What changes per environment

- **Indexing.** `robots.txt` switches to `Allow` + sitemap only in `production`; staging
  and development stay `noindex`.
- **Canonical / social URLs.** OG and canonical URLs use the real domain in `production`.
- **Sitemap.** Emitted only when `site` is set (staging / production).

---

## CI / build

GitHub Actions (`.github/workflows/`) builds the **staging** target by default and
deploys to GitHub Pages. CI also runs `format:check` and `check` (see
[development.md](./development.md)).

### Production cutover (plcc.org)

Build with `DEPLOY_ENV=production` so `site` / `base` / indexing target plcc.org, then
stage DNS / redirects from the old site and confirm the GitHub Pages → plcc.org path.

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
