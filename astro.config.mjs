// @ts-check
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import { siteConfig } from './src/config/site.ts'

// https://astro.build/config
// `site` and `base` are resolved per environment (development | staging | production)
// from DEPLOY_ENV — see src/config/site.ts. Defaults to the GitHub Pages staging
// target under GitHub Actions, and to a root-served localhost build otherwise.
// @astrojs/sitemap only emits when `site` is set (i.e. staging/production builds).
export default defineConfig({
  site: siteConfig.site,
  base: siteConfig.base,
  integrations: [sitemap()],
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
