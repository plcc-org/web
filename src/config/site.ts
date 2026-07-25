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
  // Without the inlined value, (2) resolves to 'development' and robots.txt
  // emits a blanket `Disallow: /` on every target, production included — a
  // failure with no symptom short of the site vanishing from search.
  // astro.config.mjs pins import.meta.env.DEPLOY_ENV to the value resolved in
  // (1) so both agree; that's the branch the bundle takes. Keep this order.
  const inlined = import.meta.env?.DEPLOY_ENV
  if (isDeployEnv(inlined)) return inlined

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
