import type { APIRoute } from 'astro'
import { brand, church } from '../config/church'
import { squareIcon } from '../lib/icons'

// Web app manifest with build-time generated PNG icons.
export const GET: APIRoute = async () => {
  const icon192 = await squareIcon(192)
  const icon512 = await squareIcon(512)

  const manifest = {
    name: church.name,
    short_name: church.shortName,
    description: church.description,
    start_url: import.meta.env.BASE_URL,
    scope: import.meta.env.BASE_URL,
    display: 'standalone',
    background_color: brand.background,
    theme_color: brand.theme,
    icons: [
      { src: icon192.src, sizes: '192x192', type: 'image/png' },
      { src: icon512.src, sizes: '512x512', type: 'image/png' },
    ],
  }

  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  })
}
