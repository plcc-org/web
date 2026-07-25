// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import react from '@astrojs/react'
import keystatic from '@keystatic/astro'
import mdx from '@astrojs/mdx'
import cloudflare from '@astrojs/cloudflare'
import { siteConfig } from './src/config/site.ts'

// https://astro.build/config
// `site` and `base` are resolved per environment (development | staging | production)
// from DEPLOY_ENV — see src/config/site.ts. Unset, it resolves to a root-served
// localhost build.
// @astrojs/sitemap only emits when `site` is set (i.e. staging/production builds).
export default defineConfig({
  site: siteConfig.site,
  base: siteConfig.base,
  // Cloudflare Workers host. `output` stays static (the default): every public
  // page is prerendered to HTML at build time. Keystatic injects two routes
  // (`/keystatic`, `/api/keystatic/*`) that self-mark `prerender: false`; the
  // adapter ships only those as functions. React powers Keystatic's admin UI.
  // `imageService: 'compile'` keeps Astro's build-time (sharp) image
  // optimization for our prerendered pages — emitting static, content-hashed
  // _astro/*.webp — instead of the adapter's default runtime Cloudflare Images
  // service (which would defer every image to a paid runtime endpoint).
  //
  // Build/preview only. In `astro dev` (ASTRO_DEV=1, set by `npm run dev`) we
  // skip the adapter so SSR routes run on Node: the Cloudflare workerd dev
  // runtime can't supply the Node globals Keystatic's admin needs ("module is
  // not defined"). Dev serves every route fine without an adapter.
  adapter: process.env.ASTRO_DEV ? undefined : cloudflare({ imageService: 'compile' }),
  integrations: [
    react(),
    keystatic(),
    mdx(),
    // SSR-only routes are already excluded, so /keystatic doesn't appear today.
    // The filter is a guard: if Keystatic ever prerenders its shell, or another
    // admin route is added, it would otherwise be advertised to crawlers
    // silently. Mirrors the Disallow list in src/pages/robots.txt.ts.
    sitemap({ filter: (page) => !/\/(keystatic|api)(\/|$)/.test(new URL(page).pathname) }),
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
        values: ['curated', 'snapshot', 'ics', 'pco'],
        optional: true,
      }),
    },
  },
  vite: {
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
