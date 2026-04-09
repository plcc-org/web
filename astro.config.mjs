// @ts-check
import { defineConfig } from 'astro/config'

// https://astro.build/config
// When building for GitHub Pages (in GitHub Actions), set site and base path.
// When building for a container, these are omitted so the site serves from root.
export default defineConfig({
  site: process.env.GITHUB_ACTIONS ? 'https://timsneath.github.io' : undefined,
  base: process.env.GITHUB_ACTIONS ? '/plcc-web/' : undefined,
  vite: {
    server: {
      allowedHosts: ['plcc-dev.internal', 'plcc.internal', 'localhost'],
    },
  },
})
