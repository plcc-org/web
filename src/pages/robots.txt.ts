import type { APIRoute } from 'astro'
import { siteConfig } from '../config/site'

// Environment-aware robots.txt. Only production (plcc.org) is indexable;
// development and the plcc.dev staging site are fully disallowed so the staging
// URL never competes with production in search results.
//
// NB: this route is prerendered, and `siteConfig.indexable` is only correct
// inside the bundle because astro.config.mjs pins import.meta.env.DEPLOY_ENV —
// see resolveDeployEnv() in src/config/site.ts. There is a post-build assertion
// in scripts/check-site.mjs, because getting this wrong is invisible until the
// site quietly drops out of search.

// Paths that must stay out of the index even on production. Keystatic's admin
// is behind Keystatic Cloud auth, so this isn't a security control — it stops a
// 2.7 MB admin bundle showing up in results for the church's own name.
const DISALLOWED = ['/keystatic', '/api/']

export const GET: APIRoute = ({ site }) => {
  const lines = ['User-agent: *']

  if (siteConfig.indexable) {
    lines.push('Allow: /', ...DISALLOWED.map((path) => `Disallow: ${path}`))
    if (site) lines.push('', `Sitemap: ${new URL('sitemap-index.xml', site).href}`)
  } else {
    lines.push('Disallow: /')
  }

  return new Response(`${lines.join('\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
