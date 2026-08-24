// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import mdx from '@astrojs/mdx'
import cloudflare from '@astrojs/cloudflare'
import tina from '@tinacms/astro/integration'
import { siteConfig } from './src/config/site.ts'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

// Spike, dev only. Tina's media picker requests photos at /assets/images/<file>,
// but our bytes live in src/assets/images so Astro's sharp pipeline can process
// them — outside anything the dev server serves, so every thumbnail 404s and the
// picker shows a wall of broken images. Serving them here keeps the canonical
// location (and the build) untouched; the alternative, a public/ symlink, copies
// 41 MB of unoptimized originals into dist.
function tinaAssetsDevPlugin() {
  const root = new URL('./src/assets/images/', import.meta.url).pathname
  /** @type {Record<string, string>} */
  const TYPES = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.svg': 'image/svg+xml',
  }
  return {
    name: 'plcc:tina-assets-dev',
    apply: /** @type {const} */ ('serve'),
    /** @param {{ middlewares: { use: (fn: (req: any, res: any, next: () => void) => void) => void } }} server */
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = decodeURIComponent((req.url || '').split('?')[0])
        if (!path.startsWith('/assets/images/')) return next()
        const file = normalize(join(root, path.slice('/assets/images/'.length)))
        if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) return next()
        res.setHeader('Content-Type', TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream')
        res.setHeader('Cache-Control', 'no-cache')
        createReadStream(file).pipe(res)
      })
    },
  }
}

// https://astro.build/config
// `site` and `base` are resolved per environment (development | staging | production)
// from DEPLOY_ENV — see src/config/site.ts. Unset, it resolves to a root-served
// localhost build.
// @astrojs/sitemap only emits when `site` is set (i.e. staging/production builds).
export default defineConfig({
  site: siteConfig.site,
  base: siteConfig.base,
  // Cloudflare Workers host. `output` stays static (the default): every public
  // page is prerendered to HTML at build time. Tina injects one on-demand route
  // (`/tina-island/*`, which powers visual editing); the adapter ships only that
  // as a function.
  //
  // `imageService: 'compile'` keeps Astro's build-time (sharp) image
  // optimization for our prerendered pages — emitting static, content-hashed
  // _astro/*.webp — instead of the adapter's default runtime Cloudflare Images
  // service (which would defer every image to a paid runtime endpoint).
  //
  // Build/preview only. In `astro dev` (ASTRO_DEV=1) we skip the adapter so SSR
  // routes run on Node; dev serves every route fine without one.
  //
  // node:async_hooks, which Tina's request store needs on workerd, comes from
  // `nodejs_compat` in wrangler.jsonc.
  adapter: process.env.ASTRO_DEV ? undefined : cloudflare({ imageService: 'compile' }),
  integrations: [
    mdx(),
    tina(),
    // The admin SPA is a static file under public/admin, so unlike an SSR-only
    // route it *would* be picked up by the sitemap. The island endpoint is
    // on-demand and already excluded; the filter covers it as a guard. Mirrors
    // the Disallow list in src/pages/robots.txt.ts.
    sitemap({ filter: (page) => !/\/(admin|tina-island|api)(\/|$)/.test(new URL(page).pathname) }),
  ],
  // Self-hosted fonts via the Astro Fonts API. Sourced from version-pinned
  // @fontsource-variable npm packages (durable — no build-time fetch from a URL
  // that can rot) and emitted as content-hashed, CDN-cacheable static assets.
  // We point at the *full* variable woff2 so every axis the design uses survives:
  // Fraunces carries opsz (optical sizing) + SOFT + WONK; Instrument Sans carries
  // weight. Both include italic. See src/styles/tokens.css for how they're wired.
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Fraunces',
      cssVariable: '--font-fraunces',
      fallbacks: ['Georgia', 'serif'],
      options: {
        variants: [
          {
            weight: '100 900',
            style: 'normal',
            src: ['@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2'],
          },
          {
            weight: '100 900',
            style: 'italic',
            src: ['@fontsource-variable/fraunces/files/fraunces-latin-full-italic.woff2'],
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Instrument Sans',
      cssVariable: '--font-instrument-sans',
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [
          {
            weight: '400 700',
            style: 'normal',
            src: ['@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2'],
          },
          {
            weight: '400 700',
            style: 'italic',
            src: ['@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-italic.woff2'],
          },
        ],
      },
    },
  ],
  // Astro's default ('auto') inlines any CSS chunk under 4kB into every page that
  // imports it. Our component CSS sits just under that line, and the block
  // components are imported by the catch-all route, so a chunk gets stamped into
  // all ~20 pages the route generates whether or not they render the component —
  // ~66kB of duplicated inline CSS site-wide, most of it styling nothing. 'never'
  // emits those as shared, content-hashed files instead: fetched once, cached for
  // good, and with prefetchAll below they're already warm by the time a visitor
  // navigates. Costs one extra request on a cold first paint. The @font-face
  // blocks the Fonts API emits stay inline either way, which is what we want.
  build: { inlineStylesheets: 'never' },
  // Prefetch internal links on hover/focus for snappier navigation between pages.
  prefetch: { prefetchAll: true },
  // Type-safe, validated build-time selection of the events source (see
  // src/lib/events/provider.ts). Omitted → the provider picks a sensible default.
  env: {
    schema: {
      EVENTS_SOURCE: envField.enum({
        context: 'server',
        access: 'public',
        // Keep in sync with EventSource in src/lib/events/types.ts.
        values: ['curated', 'pco', 'ics'],
        optional: true,
      }),
    },
  },
  vite: {
    plugins: [tinaAssetsDevPlugin()],
    // Bundle Tina's Astro package into the SSR build rather than resolving it
    // per-module on every cold request — otherwise each import of
    // `@tinacms/astro/TinaMarkdown.astro` triggers a full Vite resolve and
    // Astro-plugin compile of the package's source .astro files on first hit.
    // From tinacms/tina-astro-starter.
    ssr: { noExternal: ['@tinacms/astro', '@tinacms/bridge'] },
    define: {
      // The prerender bundle runs against an empty `process.env` shim (the
      // Cloudflare adapter targets workerd), so src/config/site.ts can't read
      // DEPLOY_ENV there and would re-resolve to 'development' — emitting a
      // blanket `Disallow: /` robots.txt even on production. Pin the value
      // resolved here, in Node, so both contexts agree. See resolveDeployEnv().
      'import.meta.env.DEPLOY_ENV': JSON.stringify(siteConfig.env),
    },
    server: {
      allowedHosts: ['plcc-dev.internal', 'plcc.internal', 'localhost'],
      watch: process.env.ASTRO_CONTAINER_DEV
        ? {
            usePolling: true,
            interval: 250,
          }
        : undefined,
    },
  },
})
