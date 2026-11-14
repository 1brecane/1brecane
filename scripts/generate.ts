// Renders the profile's hero with the scene code of the portfolio (github.com/1brecane/portfolio):
// one SVG per weekday body, plus hero.svg for today.
//
//   node scripts/generate.ts <portfolio-dir> <out-dir>

import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildHeroSvg } from './hero.ts'
import type { FrameRows, Run } from './hero.ts'

const COLS = 104
const ROWS = 30
const FRAMES = 14
const FRAME_MS = 450
const NAME = 'Samuele Ruaro'
const LINKS = ['samueleruaro.com', 'linkedin', 'email']

// What the generator uses of the portfolio's modules.
interface Body {
  name: string
  day: number
  palette: readonly string[]
  lightPeriodMs: number
  lightPhase: number
}
interface Frame {
  cols: number
  rows: number
  level: Uint8Array
  shape: Uint8Array
  tint: Uint8Array
  palette: readonly string[]
}
interface Portfolio {
  BODIES: readonly Body[]
  DAY_NAMES: readonly string[]
  bodyForDay(day: number): Body
  createFrameRenderer(cols: number, rows: number, body: Body, bottomFrac?: number): (t: number) => Frame
  glyphFor(level: number, shape: number): string
  cellRgb(hex: string, level: number): [number, number, number]
  FRAME_BOTTOM: number
}

export function romeWeekday(now: Date): number {
  const day = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', weekday: 'short' }).format(now)
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(day)
}

// The light swings as sin(2π t / period + phase). These are n times from one extreme of the swing
// to the other, so that playing them forward and then backward is one seamless sweep.
export function frameTimes(lightPeriodMs: number, lightPhase: number, n: number): number[] {
  const start = lightPeriodMs / 4 - (lightPhase * lightPeriodMs) / (2 * Math.PI)
  return Array.from({ length: n }, (_, i) => start + (n > 1 ? (i / (n - 1)) * (lightPeriodMs / 2) : 0))
}

async function loadPortfolio(dir: string): Promise<Portfolio> {
  if (!existsSync(join(dir, 'src/ascii/frame.ts'))) throw new Error(`portfolio not found: ${dir}`)
  const load = (file: string) => import(pathToFileURL(resolve(dir, file)).href)
  const [bodies, frame, config] = await Promise.all([
    load('src/ascii/bodies.ts'),
    load('src/ascii/frame.ts'),
    load('src/config.ts'),
  ])
  return { ...bodies, ...frame, FRAME_BOTTOM: config.FRAME_BOTTOM }
}

const hex = (rgb: readonly number[]): string => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('')

// A frame as rows of same-coloured runs. Blank cells join the run they follow; trailing blanks are dropped.
function frameRows(f: Frame, p: Portfolio): FrameRows {
  const rows: FrameRows = []
  for (let y = 0; y < f.rows; y++) {
    const runs: Run[] = []
    let end = f.cols
    while (end > 0 && f.level[y * f.cols + end - 1] === 0) end--
    let pending = '' // blanks before the first glyph of the row
    for (let x = 0; x < end; x++) {
      const i = y * f.cols + x
      const level = f.level[i]
      const glyph = p.glyphFor(level, f.shape[i])
      const last = runs[runs.length - 1]
      if (level === 0) {
        if (last) last.text += glyph
        else pending += glyph
        continue
      }
      const color = hex(p.cellRgb(f.palette[f.tint[i]], level))
      if (last && last.color === color) last.text += glyph
      else runs.push({ text: pending + glyph, color })
      pending = ''
    }
    rows.push(runs)
  }
  return rows
}

export async function generate(portfolioDir: string, outDir: string, now = new Date()): Promise<string[]> {
  const p = await loadPortfolio(portfolioDir)
  mkdirSync(outDir, { recursive: true })
  const written: string[] = []
  for (const body of p.BODIES) {
    const render = p.createFrameRenderer(COLS, ROWS, body, p.FRAME_BOTTOM)
    const frames = frameTimes(body.lightPeriodMs, body.lightPhase, FRAMES).map((t) => frameRows(render(t), p))
    const svg = buildHeroSvg(frames, {
      cols: COLS,
      rows: ROWS,
      label: `${p.DAY_NAMES[body.day]} · ${body.name}`.toUpperCase(),
      name: NAME,
      links: LINKS,
      frameMs: FRAME_MS,
    })
    const path = join(outDir, `hero-${body.name.toLowerCase()}.svg`)
    writeFileSync(path, svg)
    written.push(path)
  }
  const today = p.bodyForDay(romeWeekday(now))
  const hero = join(outDir, 'hero.svg')
  copyFileSync(join(outDir, `hero-${today.name.toLowerCase()}.svg`), hero)
  written.push(hero)
  return written
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [portfolioDir, outDir] = process.argv.slice(2)
  if (!portfolioDir || !outDir) {
    console.error('usage: node scripts/generate.ts <portfolio-dir> <out-dir>')
    process.exit(1)
  }
  try {
    for (const path of await generate(portfolioDir, outDir)) console.log(`${path}  ${statSync(path).size} bytes`)
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }
}
