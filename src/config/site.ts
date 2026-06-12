// Centralized, environment-aware site configuration.
//
// DEPLOY_ENV selects the target. We keep three environments:
//   - development: localhost, served from root, never indexed
//   - staging:     GitHub Pages (timsneath.github.io/plcc-web/), never indexed
//   - production:  plcc.org, served from root, indexed
//
// `site` and `base` are consumed by astro.config.mjs at build time. `indexable`
// drives robots.txt and (later) noindex meta. Resolving everything here keeps the
// hosting target a one-line change.

export type DeployEnv = 'development' | 'staging' | 'production'

export function resolveDeployEnv(): DeployEnv {
  const explicit = process.env.DEPLOY_ENV?.toLowerCase()
  if (explicit === 'production' || explicit === 'staging' || explicit === 'development') {
    return explicit
  }
  // Back-compat: CI (GitHub Actions) builds for the staging GitHub Pages target.
  if (process.env.GITHUB_ACTIONS) {
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
  staging: { env: 'staging', site: 'https://timsneath.github.io', base: '/plcc-web/', indexable: false },
  production: { env: 'production', site: 'https://plcc.org', base: '/', indexable: true },
}

export const siteConfig: SiteConfig = CONFIGS[resolveDeployEnv()]
