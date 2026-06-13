# Pine Lake Covenant Church — Before Launch

The prototype → release work is done (see git history): broken links fixed, live events,
image optimization, SEO/social/sitemap, a tidied codebase with CI, and a voice/homepage
polish pass. What remains is for closer to launch ("prime time").

## Content

- **Real testimonials.** `src/data/quotes.ts` still mixes a few genuine quotes with
  fabricated "placeholder" personas feeding the homepage carousel. Replace with real,
  attributed quotes and drop the fakes. (The carousel currently assumes ≥4 quotes — adjust
  if there are fewer.)

## Production cutover (plcc.org)

- Build the production deploy with `DEPLOY_ENV=production` so `site` / `base` / indexing
  target plcc.org: `robots.txt` switches to `Allow` + sitemap, and OG/canonical URLs use the
  real domain. (Staging stays noindex on GitHub Pages.)
- Stage DNS / redirects from the old site and confirm the GitHub Pages → plcc.org path.

## Known residuals (optional, no user impact)

- ~5 MB of unused `pickImageByAnyTag` pool originals are emitted to `dist` (never referenced
  or served). Prune, or replace the random-pick pools with explicit images.
- Events use an undocumented Church Center read-token endpoint — it works and falls back to a
  curated list, but a public iCal feed URL or a Planning Center API token would be more durable.
- Leadership portraits are 400×400 sources, so they're a little soft scaled into the cards —
  swap for higher-resolution files if available.
