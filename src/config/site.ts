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

export function resolveDeployEnv(): DeployEnv {
  const explicit = process.env.DEPLOY_ENV?.toLowerCase()
  if (explicit === 'production' || explicit === 'staging' || explicit === 'development') {
    return explicit
  }
  // Back-compat: CI builds (GitHub Actions, or Cloudflare Workers/Pages builds)
  // default to the staging target when DEPLOY_ENV isn't set explicitly.
  if (process.env.GITHUB_ACTIONS || process.env.CF_PAGES || process.env.WORKERS_CI) {
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
