/**
 * Generates the responsive NFT artwork served by the mock API.
 *
 * Source files live in `assets-src/nfts/*.png` (export them from Figma at 2x and
 * drop them there). Each source becomes `public/images/nfts/<name>[-view]-<width>.<avif|webp>`,
 * where the views are the full artwork plus three detail crops used by the detail gallery.
 *
 * Usage: npm run images
 */
import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SRC_DIR = path.resolve(import.meta.dirname, '../assets-src/nfts')
const OUT_DIR = path.resolve(import.meta.dirname, '../public/images/nfts')
const WIDTHS = [320, 640, 960] as const

/** Crop boxes relative to the source size (left, top, size). */
const VIEWS = [
  { suffix: '', box: { left: 0, top: 0, size: 1 } },
  { suffix: '-face', box: { left: 0.2, top: 0.04, size: 0.6 } },
  { suffix: '-detail', box: { left: 0.25, top: 0.48, size: 0.5 } },
  { suffix: '-outfit', box: { left: 0, top: 0.4, size: 0.6 } },
] as const

await mkdir(OUT_DIR, { recursive: true })

const sources = (await readdir(SRC_DIR)).filter((file) => /\.(png|jpe?g|webp)$/i.test(file))

for (const file of sources) {
  const name = path.parse(file).name
  const input = path.join(SRC_DIR, file)
  const { width: sourceWidth = 0, height: sourceHeight = 0 } = await sharp(input).metadata()
  const side = Math.min(sourceWidth, sourceHeight)

  for (const view of VIEWS) {
    const extract = {
      left: Math.round(view.box.left * side),
      top: Math.round(view.box.top * side),
      width: Math.round(view.box.size * side),
      height: Math.round(view.box.size * side),
    }

    for (const width of WIDTHS) {
      const resized = sharp(input)
        .extract(extract)
        .resize({ width, height: width, fit: 'cover', kernel: 'lanczos3' })
      const base = path.join(OUT_DIR, `${name}${view.suffix}-${width}`)
      await resized.clone().avif({ quality: 55, effort: 4 }).toFile(`${base}.avif`)
      await resized.clone().webp({ quality: 78 }).toFile(`${base}.webp`)
    }
  }

  console.log(`✓ ${name} → ${VIEWS.length} views × ${WIDTHS.map((w) => `${w}w`).join(', ')}`)
}
