// Generates the social share card (Open Graph image) at
// src/assets/images/plcc-social-card.png.
//
// It reproduces the home-page hero "glow" (see `.hero__media` in
// src/styles/components.css) — a forest vertical gradient with a moss radial
// glow rising from the bottom-centre — and composites the white wordmark on
// top. No photo, so the card looks consistent everywhere it's shared.
//
// Run with: npm run generate:social-card
// Re-run whenever the glow colours (tokens.css) or the wordmark change, then
// commit the regenerated PNG — the build reads the committed file, it is not
// generated during `npm run build`.

import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const W = 1200
const H = 630
const root = new URL('../src/assets/images/', import.meta.url)
const logoPath = fileURLToPath(new URL('Horizontal-Logo-White-on-Transparent.png', root))
const outPath = fileURLToPath(new URL('plcc-social-card.png', root))

// Glow recipe mirrors `.hero__media` / `.hero__media::before`:
//   base: linear forest-2 → forest
//   r2:   radial(140% 120% at 50% 115%)  moss-2 0.5 → transparent
//   r3:   radial(65% 55% at 50% 100%)    moss 0.72 → transparent
// SVG radial gradients are circular, so each ellipse is faked by scaling Y
// about its centre via gradientTransform (matrix sy, ty = cy * (1 - sy)).
const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgb(45,77,24)"/>
      <stop offset="100%" stop-color="rgb(26,46,12)"/>
    </linearGradient>
    <radialGradient id="r2" gradientUnits="userSpaceOnUse" cx="600" cy="724.5" r="1680" gradientTransform="matrix(1,0,0,0.45,0,398.475)">
      <stop offset="0%" stop-color="rgb(115,148,59)" stop-opacity="0.5"/>
      <stop offset="55%" stop-color="rgb(45,77,24)" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="r3" gradientUnits="userSpaceOnUse" cx="600" cy="630" r="780" gradientTransform="matrix(1,0,0,0.444,0,350.28)">
      <stop offset="0%" stop-color="rgb(106,149,41)" stop-opacity="0.72"/>
      <stop offset="70%" stop-color="rgb(106,149,41)" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#base)"/>
  <rect width="${W}" height="${H}" fill="url(#r2)"/>
  <rect width="${W}" height="${H}" fill="url(#r3)"/>
</svg>`

const background = await sharp(Buffer.from(svg)).png().toBuffer()

const logoWidth = 680
const logo = await sharp(logoPath).resize({ width: logoWidth }).png().toBuffer()
const { height: logoHeight } = await sharp(logo).metadata()

await sharp(background)
  .composite([{ input: logo, left: Math.round((W - logoWidth) / 2), top: Math.round((H - logoHeight) / 2) }])
  .png()
  .toFile(outPath)

console.log(`Wrote ${outPath} (${W}x${H}), wordmark ${logoWidth}x${logoHeight}`)
