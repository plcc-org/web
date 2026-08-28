// Generates public/favicon.ico from the transparent logo.
//
// The pages already advertise their favicons via <link rel="icon"> (BaseLayout.astro),
// which is what every HTML-parsing client uses. This file exists for the clients that
// never read the page — bookmark and preview services, crawlers, monitoring tools —
// which blindly request /favicon.ico at the root and otherwise get a 404.
//
// Run with: npm run generate:favicon
// Re-run if the logo changes, then commit the .ico — the build serves the committed
// file from public/, it is not generated during `npm run build`.
//
// The images are stored as uncompressed 32-bit BMPs rather than embedded PNGs:
// PNG-in-ICO is fine in every browser, but the blind-fetching clients this file
// serves are exactly the ones old enough to expect classic BMP entries, and at
// these sizes the difference is a few kilobytes.

import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const SIZES = [16, 32, 48]
const srcPath = fileURLToPath(new URL('../src/assets/images/plcc-logo.png', import.meta.url))
const outPath = fileURLToPath(new URL('../public/favicon.ico', import.meta.url))

// One ICO directory entry's image payload: BITMAPINFOHEADER + BGRA rows bottom-up
// + an all-zero 1bpp AND mask (the alpha channel governs transparency, but the
// mask must still be present and 32-bit-row-padded for old parsers).
function bmpEntry(rgba, size) {
  const rowBytes = size * 4
  const maskRowBytes = Math.ceil(size / 32) * 4
  const header = Buffer.alloc(40)
  header.writeUInt32LE(40, 0) // biSize
  header.writeInt32LE(size, 4) // biWidth
  header.writeInt32LE(size * 2, 8) // biHeight: XOR + AND heights combined
  header.writeUInt16LE(1, 12) // biPlanes
  header.writeUInt16LE(32, 14) // biBitCount
  header.writeUInt32LE(size * rowBytes + size * maskRowBytes, 20) // biSizeImage

  const xor = Buffer.alloc(size * rowBytes)
  for (let y = 0; y < size; y++) {
    const srcRow = (size - 1 - y) * rowBytes // bottom-up
    for (let x = 0; x < size; x++) {
      const s = srcRow + x * 4
      const d = y * rowBytes + x * 4
      xor[d] = rgba[s + 2] // B
      xor[d + 1] = rgba[s + 1] // G
      xor[d + 2] = rgba[s] // R
      xor[d + 3] = rgba[s + 3] // A
    }
  }
  const andMask = Buffer.alloc(size * maskRowBytes)
  return Buffer.concat([header, xor, andMask])
}

const entries = await Promise.all(
  SIZES.map(async (size) => {
    const rgba = await sharp(srcPath)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .ensureAlpha()
      .raw()
      .toBuffer()
    return { size, image: bmpEntry(rgba, size) }
  })
)

const dir = Buffer.alloc(6)
dir.writeUInt16LE(1, 2) // type: icon
dir.writeUInt16LE(entries.length, 4)

let offset = 6 + 16 * entries.length
const dirEntries = entries.map(({ size, image }) => {
  const e = Buffer.alloc(16)
  e.writeUInt8(size === 256 ? 0 : size, 0) // width
  e.writeUInt8(size === 256 ? 0 : size, 1) // height
  e.writeUInt16LE(1, 4) // planes
  e.writeUInt16LE(32, 6) // bit count
  e.writeUInt32LE(image.length, 8)
  e.writeUInt32LE(offset, 12)
  offset += image.length
  return e
})

const ico = Buffer.concat([dir, ...dirEntries, ...entries.map((e) => e.image)])
await writeFile(outPath, ico)
console.log(`generate-favicon: wrote ${outPath} (${ico.length} bytes, sizes ${SIZES.join('/')})`)
