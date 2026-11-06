// Renders the PWA icons in public/ from public/icon.svg.
// Run after editing the SVG, then commit the PNGs:
//   npm run icons
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const pub = fileURLToPath(new URL('../public/', import.meta.url))
const svg = await readFile(`${pub}icon.svg`)

/** Full-bleed square: maskable icons and the iOS home screen (iOS rounds it). */
const square = (size) => sharp(svg, { density: 300 }).resize(size, size).png()

/** Rounded square with transparent corners for purpose "any". */
const rounded = async (size) => {
  const r = Math.round(size * 0.22)
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<rect width="${size}" height="${size}" rx="${r}" ry="${r}"/></svg>`,
  )
  const base = await square(size).toBuffer()
  return sharp(base)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
}

const outputs = [
  ['pwa-192.png', () => rounded(192)],
  ['pwa-512.png', () => rounded(512)],
  ['maskable-192.png', () => square(192)],
  ['maskable-512.png', () => square(512)],
  ['apple-touch-icon.png', () => square(180)],
]

for (const [name, make] of outputs) {
  await (await make()).toFile(`${pub}${name}`)
  console.log(`public/${name}`)
}
