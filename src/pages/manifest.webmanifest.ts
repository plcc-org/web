import type { APIRoute } from 'astro'
import { getImage } from 'astro:assets'
import iconSource from '../assets/images/plcc-logo-icon.jpg'
import { brand } from '../config/church'

// Web app manifest with build-time generated PNG icons.
export const GET: APIRoute = async () => {
  const icon192 = await getImage({ src: iconSource, width: 192, height: 192, fit: 'cover', format: 'png' })
  const icon512 = await getImage({ src: iconSource, width: 512, height: 512, fit: 'cover', format: 'png' })

  const manifest = {
    name: 'Pine Lake Covenant Church',
    short_name: 'Pine Lake',
    description: 'A church in Sammamish, discovering life with Jesus together.',
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
