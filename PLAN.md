# Pine Lake Covenant Church — Before Launch

The prototype → release work is done (see git history): broken links fixed, live events,
image optimization, SEO/social/sitemap, a tidied codebase with CI, and a voice/homepage
polish pass. What remains is for closer to launch ("prime time").

## Content

- **Real testimonials.** All eight quotes in `src/content/quotes.yaml` are attributed to
  anonymous personas ("A recent attendee", "A middle-aged family"). Eight anonymous voices
  read as invented, which is exactly what the filter test in [voice.md](./docs/voice.md)
  exists to catch — and they sit under a heading that says "In their words." Replace with
  two or three real first names, and faces if consent allows; three named voices beat eight
  anonymous ones. (The carousel assumes ≥4 quotes — adjust it if there are fewer.)

## Production cutover (plcc.org)

- Build the production deploy with `DEPLOY_ENV=production` so `site` / `base` / indexing
  target plcc.org: `robots.txt` switches to `Allow` + sitemap, and OG/canonical URLs use the
  real domain. (`plcc.dev` staging stays noindex.)
- Stage DNS and commit redirects from the old site's URLs before pointing plcc.org at
  Cloudflare.

## Known residuals (optional, no user impact)

- Leadership portraits are 400×400 sources, so they're a little soft scaled into the cards —
  swap for higher-resolution files if available.
- Events still run on a nightly headless-browser capture of Church Center rather than an
  official API. It's stable and falls back to a curated list, but a Planning Center API key
  would remove the whole scraper. See [events.md](./docs/events.md) for the migration path.
