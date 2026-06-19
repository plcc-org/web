// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import react from '@astrojs/react'
import keystatic from '@keystatic/astro'
import cloudflare from '@astrojs/cloudflare'
import { siteConfig } from './src/config/site.ts'

// https://astro.build/config
// `site` and `base` are resolved per environment (development | staging | production)
// from DEPLOY_ENV — see src/config/site.ts. Defaults to the GitHub Pages staging
// target under GitHub Actions, and to a root-served localhost build otherwise.
// @astrojs/sitemap only emits when `site` is set (i.e. staging/production builds).
export default defineConfig({
  site: siteConfig.site,
  base: siteConfig.base,
  // Cloudflare Pages host. `output` stays static (the default): every public
  // page is prerendered to HTML at build time. Keystatic injects two routes
  // (`/keystatic`, `/api/keystatic/*`) that self-mark `prerender: false`; the
  // adapter ships only those as functions. React powers Keystatic's admin UI.
  // `imageService: 'compile'` keeps Astro's build-time (sharp) image
  // optimization for our prerendered pages — emitting static, content-hashed
  // _astro/*.webp — instead of the adapter's default runtime Cloudflare Images
  // service (which would defer every image to a paid runtime endpoint).
  adapter: cloudflare({ imageService: 'compile' }),
  integrations: [react(), keystatic(), sitemap()],
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
        values: ['curated', 'churchcenter', 'ics', 'pco'],
        optional: true,
      }),
    },
  },
  vite: {
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
