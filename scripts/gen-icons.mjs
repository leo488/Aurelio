// Generates PWA icons from the Aurelio app mark (design/Aurelio Prototype sidebar header).
// Run with `npm run icons`; output goes to public/.
import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'

const EMBER = `<path d="M18 8.5c3.9 4 6.8 7.3 6.8 11.3A6.8 6.8 0 0 1 18 26.6a6.8 6.8 0 0 1-6.8-6.8c0-4 2.9-7.3 6.8-11.3Z" fill="#C79A4A"/><path d="M18 16.6c1.8 1.9 2.9 3.3 2.9 5a2.9 2.9 0 1 1-5.8 0c0-1.7 1.1-3.1 2.9-5Z" fill="#F5E7CC"/>`

// Rounded mark, exactly as in the design (rx = 11/36 of size).
const mark = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36" fill="none"><rect width="36" height="36" rx="11" fill="#1A1714"/>${EMBER}</svg>`

// Full-bleed square with the ember shrunk into the 80% maskable safe zone.
const fullBleed = (scale) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36" fill="none"><rect width="36" height="36" fill="#1A1714"/><g transform="translate(18 17.55) scale(${scale}) translate(-18 -17.55)">${EMBER}</g></svg>`

const render = (svg, size, file) =>
  sharp(Buffer.from(svg), { density: 72 * (size / 36) * 2 }).resize(size, size).png().toFile(`public/${file}`)

await writeFile('public/favicon.svg', mark)
await render(mark, 192, 'icons/icon-192.png')
await render(mark, 512, 'icons/icon-512.png')
await render(fullBleed(1.15), 512, 'icons/icon-maskable-512.png')
await render(fullBleed(1), 180, 'icons/apple-touch-icon-180.png')
console.log('icons written')
