/**
 * Generates the responsive NFT artwork served by the mock API.
 *
 * Source files live in `assets-src/nfts/*.png` (export them from Figma at 2x and
 * drop them there). Each source becomes `public/images/nfts/<name>-<width>.<avif|webp>`.
 *
 * Usage: npm run images
 */
import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SRC_DIR = path.resolve(import.meta.dirname, '../assets-src/nfts')
const OUT_DIR = path.resolve(import.meta.dirname, '../public/images/nfts')
const WIDTHS = [320, 640, 960] as const

await mkdir(OUT_DIR, { recursive: true })

const sources = (await readdir(SRC_DIR)).filter((file) => /\.(png|jpe?g|webp)$/i.test(file))

for (const file of sources) {
  const name = path.parse(file).name
  const input = path.join(SRC_DIR, file)

  for (const width of WIDTHS) {
    const resized = sharp(input).resize({ width, height: width, fit: 'cover', kernel: 'lanczos3' })
    await resized
      .clone()
      .avif({ quality: 55, effort: 4 })
      .toFile(path.join(OUT_DIR, `${name}-${width}.avif`))
    await resized
      .clone()
      .webp({ quality: 78 })
      .toFile(path.join(OUT_DIR, `${name}-${width}.webp`))
  }

  console.log(`✓ ${name} → ${WIDTHS.map((w) => `${w}w`).join(', ')}`)
}
