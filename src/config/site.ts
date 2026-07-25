// Centralized, environment-aware site configuration.
//
// DEPLOY_ENV selects the target. We keep three environments:
//   - development: localhost, served from root, never indexed
//   - staging:     Cloudflare (plcc.dev), served from root, never indexed
//   - production:  plcc.org, served from root, indexed (future cutover)
//
// `site` and `base` are consumed by astro.config.mjs at build time. `indexable`
// drives robots.txt and (later) noindex meta. Resolving everything here keeps the
// hosting target a one-line change.
//
// The Cloudflare build must set DEPLOY_ENV=staging (build env var) so `site`
// resolves to https://plcc.dev and the sitemap emits.

export type DeployEnv = 'development' | 'staging' | 'production'

function isDeployEnv(value: unknown): value is DeployEnv {
  return value === 'production' || value === 'staging' || value === 'development'
}

export function resolveDeployEnv(): DeployEnv {
  // This module is loaded in two different places with two different envs:
  //
  //   1. astro.config.mjs, in Node, where process.env.DEPLOY_ENV is set.
  //   2. Inside the app bundle (robots.txt.ts and anything else that imports
  //      it), which Astro prerenders through a Vite SSR runner targeting
  //      workerd. There, `process` exists but `process.env` is an empty shim,
  //      so DEPLOY_ENV reads as undefined.
  //
  // Left to itself, (2) fell through to 'development' and emitted a blanket
  // `Disallow: /` robots.txt on *every* target, production included — which
  // would have quietly de-indexed plcc.org at cutover. astro.config.mjs pins
  // import.meta.env.DEPLOY_ENV to the value resolved in (1) so both agree;
  // that's the branch the bundle takes. Keep them in this order.
  const inlined = import.meta.env?.DEPLOY_ENV
  if (isDeployEnv(inlined)) return inlined

  const explicit = process.env?.DEPLOY_ENV?.toLowerCase()
  if (isDeployEnv(explicit)) return explicit

  // Back-compat: CI builds (GitHub Actions, or Cloudflare Workers/Pages builds)
  // default to the staging target when DEPLOY_ENV isn't set explicitly.
  if (process.env?.GITHUB_ACTIONS || process.env?.CF_PAGES || process.env?.WORKERS_CI) {
    return 'staging'
  }
  return 'development'
}

type SiteConfig = {
  env: DeployEnv
  /** Absolute origin, or undefined in dev (Astro serves from localhost). */
  site: string | undefined
  /** Base path with leading + trailing slash, or undefined for root. */
  base: string | undefined
  /** Whether search engines should index this deployment. */
  indexable: boolean
}

const CONFIGS: Record<DeployEnv, SiteConfig> = {
  development: { env: 'development', site: undefined, base: undefined, indexable: false },
  staging: { env: 'staging', site: 'https://plcc.dev', base: '/', indexable: false },
  production: { env: 'production', site: 'https://plcc.org', base: '/', indexable: true },
}

export const siteConfig: SiteConfig = CONFIGS[resolveDeployEnv()]
