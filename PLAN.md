# Pine Lake Covenant Church — Before Launch

The prototype → release work is done (see git history): broken links fixed, live events,
image optimization, SEO/social/sitemap, a tidied codebase with CI, and a voice/homepage
polish pass. A full launch-readiness audit (2026-08-24) closed out the repo-side items;
what remains splits into two lists — work that needs a human before launch, and the
cutover itself.

## Before launch — needs a human

- [ ] **Real testimonials.** All eight quotes in `src/content/quotes/quotes.yaml` are
      attributed to anonymous personas ("A recent attendee", "A middle-aged family"). Eight
      anonymous voices read as invented, which is exactly what the filter test in
      [voice.md](./docs/voice.md) exists to catch — and they sit under a heading that says
      "In their words." Replace with two or three real first names, and faces if consent
      allows; three named voices beat eight anonymous ones. (The carousel handles as few as
      two; below four the dots row just thins.)
- [ ] **Rotate the Planning Center token.** The PAT in the local `.env` was never committed,
      but rotation is cheap and the token dies with its owner's account anyway. Mint a new
      one and update the `PCO_APP_ID` / `PCO_SECRET` repository secrets on GitHub.
- [ ] **Re-point the `/camp` short link.** `src/content/short-links/camp.yaml` expires
      2026-09-30 and needs the next Church Center event ID (minted fresh each year). Build
      logs start warning from 2026-08-31.
- [ ] **Decide who authenticates at `/admin`** — TinaCloud free tier (2 editors) vs Team
      vs self-hosted auth; see [cms.md](./docs/cms.md). Production media is resolved (the
      `/assets/images/*` redirect to TinaCloud's CDN ships with the build).
- [ ] **Decide on analytics.** There is none today — no beacon, no Search Console
      verification. Cloudflare Web Analytics is the zero-config option if wanted; also fine
      to launch without.

## Day 0 — the cutover (plcc.org)

Redirects from the old site's URLs are already in the build (`src/content/short-links/`
generates `_redirects` plus the two 410 routes), so old inbound links survive the switch.
What remains is dashboard and DNS work, in order:

1. Create the production Worker environment. Set `DEPLOY_ENV=production` in the dashboard —
   this is the one variable with no repo-side safety net: forget it and the build falls back
   to staging with only a build-log warning, and plcc.org ships `Disallow: /`. Set
   `PUBLIC_TINA_CLIENT_ID` / `TINA_TOKEN` too if the editor ships at launch.
2. Leave the Worker's Node version unset so `.node-version` wins.
3. Bind `plcc.org` to the Worker and point DNS at Cloudflare.
4. Verify post-deploy: `robots.txt` says `Allow: /` with a `Sitemap:` line, canonical and OG
   URLs say `https://plcc.org`, and `/tina-island` loads **before** testing any editor login
   (a working login does not prove the deployed backend is reachable — see
   [cms.md](./docs/cms.md)).
5. Sanity-check the Worker bundle against the 3 MB free-plan limit. Measured 2026-08-24 at
   ~274 KB gzipped, so there's headroom; only worth re-measuring if the island route grows.

(`plcc.dev` staging stays noindex throughout.)

## Known residuals (optional, no user impact)

- Leadership portraits are 400×400 sources, so they're a little soft scaled into the cards —
  swap for higher-resolution files if available.
