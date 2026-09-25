// Centralized, environment-aware site configuration.
//
// DEPLOY_ENV selects the target. We keep three environments:
//   - development: localhost, served from root, never indexed
//   - staging:     Cloudflare (plcc.dev), served from root, never indexed
//   - production:  plcc.org, served from root, indexed (future cutover)
//
// `site` and `base` are consumed by astro.config.mjs at build time. `indexable`
// drives robots.txt, through isIndexableSite. Resolving everything here keeps the
// hosting target a one-line change.
//
// The Cloudflare build must set DEPLOY_ENV=staging (build env var) so `site`
// resolves to https://plcc.dev and the sitemap emits.

type DeployEnv = 'development' | 'staging' | 'production'

function isDeployEnv(value: unknown): value is DeployEnv {
  return value === 'production' || value === 'staging' || value === 'development'
}

// Only meaningful in Node (astro.config.mjs). Inside the app bundle, which Astro
// prerenders through a Vite SSR runner targeting workerd, `process.env` is an
// empty shim and this resolves to 'development' — so nothing in the bundle may
// branch on it. Routes read the configured `site` instead (isIndexableSite).
export function resolveDeployEnv(): DeployEnv {
  const explicit = process.env?.DEPLOY_ENV?.toLowerCase()
  if (isDeployEnv(explicit)) return explicit

  // Cloudflare's build settings live in its dashboard, not this repo, so a build
  // can arrive here with DEPLOY_ENV unset. Falling back to staging is the safe
  // guess — never-indexed, and it still produces a `site` so canonical URLs and
  // the sitemap are correct — but it *is* a guess about where this build is
  // going, so say so. Silence here is how a target gets mis-set for months.
  //
  // GitHub Actions is deliberately not in this list: every workflow sets
  // DEPLOY_ENV explicitly, and a CI run should fail loudly rather than infer a
  // deploy target it has no business inferring.
  if (process.env?.CF_PAGES || process.env?.WORKERS_CI) {
    console.warn('[site] DEPLOY_ENV is unset on a Cloudflare build — assuming "staging".')
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

/**
 * Whether a build for `site` — the `site` Astro hands every route — should be
 * indexed. This is how the bundle learns the deploy target: Astro bakes the
 * configured `site` in, where DEPLOY_ENV itself is invisible (see resolveDeployEnv).
 */
export function isIndexableSite(site: URL | undefined): boolean {
  return Object.values(CONFIGS).some((config) => config.indexable && config.site === site?.origin)
}
