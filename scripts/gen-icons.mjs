// Generates PWA icons and iOS launch screens from the Aurelio app mark (dark skin).
// Run with `npm run icons`; output goes to public/.
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'

const FIELD = '#0E1013'
const SQUARE = '#1C2026'
const EMBER = `<path d="M18 8.5c3.9 4 6.8 7.3 6.8 11.3A6.8 6.8 0 0 1 18 26.6a6.8 6.8 0 0 1-6.8-6.8c0-4 2.9-7.3 6.8-11.3Z" fill="#C79A4A"/><path d="M18 16.6c1.8 1.9 2.9 3.3 2.9 5a2.9 2.9 0 1 1-5.8 0c0-1.7 1.1-3.1 2.9-5Z" fill="#F5E7CC"/>`

// The rounded mark, exactly as in the design (rx = 11/36 of size).
const mark = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36" fill="none"><rect width="36" height="36" rx="11" fill="${SQUARE}"/>${EMBER}</svg>`

// The mark centred on the dark field, scaled to `share` of the side (maskable safe zone is 80%).
const onField = (share) => {
  const k = share
  const o = (36 - 36 * k) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36" fill="none"><rect width="36" height="36" fill="${FIELD}"/><g transform="translate(${o} ${o}) scale(${k})"><rect width="36" height="36" rx="11" fill="${SQUARE}"/>${EMBER}</g></svg>`
}

const render = (svg, size, file) =>
  sharp(Buffer.from(svg), { density: 72 * (size / 36) * 2 }).resize(size, size).png().toFile(`public/${file}`)

// Launch screen: the dark field with the mark centred, so launch never flashes white.
const splash = async (w, h, file) => {
  const side = Math.round(w * 0.22)
  const icon = await sharp(Buffer.from(mark), { density: 72 * (side / 36) * 2 }).resize(side, side).png().toBuffer()
  await sharp({ create: { width: w, height: h, channels: 4, background: FIELD } })
    .composite([{ input: icon, left: Math.round((w - side) / 2), top: Math.round((h - side) / 2) }])
    .png().toFile(`public/${file}`)
}

await mkdir('public/splash', { recursive: true })
await writeFile('public/favicon.svg', mark)
await render(onField(0.86), 192, 'icons/icon-192.png')
await render(onField(0.86), 512, 'icons/icon-512.png')
await render(onField(0.62), 512, 'icons/icon-maskable-512.png')
await render(onField(0.8), 180, 'icons/apple-touch-icon-180.png')
await splash(1170, 2532, 'splash/splash-1170x2532.png')
await splash(1290, 2796, 'splash/splash-1290x2796.png')
console.log('icons written')
