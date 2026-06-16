import { defineConfig } from 'vitest/config'

// Unit tests only (test/*.test.ts) — pure logic with no Astro runtime. The
// post-build site integrity check is a separate script (scripts/check-site.mjs).
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
})
