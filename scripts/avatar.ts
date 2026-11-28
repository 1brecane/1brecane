// Renders the profile picture: Mars as pixel art, drawn by the portfolio's scene code.
//
//   node scripts/avatar.ts <portfolio-dir> <out.png>

import { writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { crc32, deflateSync } from 'node:zlib'

const SIZE = 40 // pixels per side
const SCALE = 20 // the PNG shows each pixel as a SCALE x SCALE block
const CELLS_X = 4 // scene cells averaged into one pixel: a cell is twice as high as wide
const CELLS_Y = 2
const BACKGROUND = [11, 12, 14]
const LIGHT_AT = 0.2 // how far into the light's period the picture is taken

export async function avatarPixels(portfolioDir: string): Promise<Uint8Array> {
  const load = (file: string) => import(pathToFileURL(resolve(join(portfolioDir, file))).href)
  const [{ MARS }, { createFrameRenderer, cellRgb }] = await Promise.all([
    load('src/ascii/bodies.ts'),
    load('src/ascii/frame.ts'),
  ])
  const body = {
    ...MARS,
    moons: [],
    place: (w: number, h: number) => ({ cx: w / 2, cy: h / 2, radius: 0.4 * w }),
  }
  const cols = SIZE * CELLS_X
  const period = body.lightPeriodMs
  const time = period / 4 - (body.lightPhase * period) / (2 * Math.PI) + LIGHT_AT * period
  const frame = createFrameRenderer(cols, SIZE * CELLS_Y, body, 1)(time)

  const sums = new Float64Array(SIZE * SIZE * 3)
  for (let i = 0; i < frame.level.length; i++) {
    const level = frame.level[i]
    const rgb = level === 0 ? BACKGROUND : cellRgb(frame.palette[frame.tint[i]], level)
    const x = Math.floor((i % cols) / CELLS_X)
    const y = Math.floor(Math.floor(i / cols) / CELLS_Y)
    for (let k = 0; k < 3; k++) sums[(y * SIZE + x) * 3 + k] += rgb[k]
  }
  return Uint8Array.from(sums, (sum) => Math.round(sum / (CELLS_X * CELLS_Y)))
}

function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const out = Buffer.alloc(body.length + 8)
  out.writeUInt32BE(data.length, 0)
  body.copy(out, 4)
  out.writeUInt32BE(crc32(body), body.length + 4)
  return out
}

// An 8-bit RGB PNG, rows unfiltered.
export function encodePng(width: number, height: number, rgb: Uint8Array): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 2, 0, 0, 0], 8) // bit depth, colour type RGB, compression, filter, interlace
  const rows = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y++) rows.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1)
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function enlarge(pixels: Uint8Array): Uint8Array {
  const side = SIZE * SCALE
  const out = new Uint8Array(side * side * 3)
  for (let y = 0; y < side; y++)
    for (let x = 0; x < side; x++) {
      const from = (Math.floor(y / SCALE) * SIZE + Math.floor(x / SCALE)) * 3
      out.set(pixels.subarray(from, from + 3), (y * side + x) * 3)
    }
  return out
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [portfolioDir, out] = process.argv.slice(2)
  if (!portfolioDir || !out) {
    console.error('usage: node scripts/avatar.ts <portfolio-dir> <out.png>')
    process.exit(1)
  }
  writeFileSync(out, encodePng(SIZE * SCALE, SIZE * SCALE, enlarge(await avatarPixels(portfolioDir))))
}
