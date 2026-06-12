import type { APIRoute } from 'astro'
import { siteConfig } from '../config/site'

// Environment-aware robots.txt. Only the production deployment (plcc.org) is
// indexable; development and the GitHub Pages staging site are disallowed so the
// staging URL never competes with production in search results.
export const GET: APIRoute = ({ site }) => {
  const body = siteConfig.indexable
    ? ['User-agent: *', 'Allow: /', site ? `Sitemap: ${new URL('sitemap-index.xml', site).href}` : '']
        .filter(Boolean)
        .join('\n')
    : ['User-agent: *', 'Disallow: /'].join('\n')

  return new Response(`${body}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
