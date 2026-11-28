// Builds the profile's hero: a dark card with frames of ASCII art on the left and the name with a
// few labelled fields on the right. GitHub shows README images through <img>, so the SVG carries no script, no web font and
// no external resource; the frames are switched with CSS alone.

export interface Run {
  text: string
  color: string // "#rrggbb", already blended on the background
}
export type FrameRows = Run[][] // one array of runs per row, left to right; blanks are inside run text
export interface HeroOptions {
  cols: number
  rows: number
  name: string
  fields: [label: string, value: string][]
  accent: string // "#rrggbb", for the name and the labels
  frameMs: number
}

const WIDTH = 880
const HEIGHT = 398
const ART_X = 20
const ART_Y = 18
const ART_WIDTH = 390
const TEXT_X = 450
const VALUE_X = 560
const BG = '#0b0c0e'
const TEXT = '#f2efe8'
const RULE = '#5a5750'
const FONT =
  "ui-monospace,'SF Mono','Cascadia Mono','JetBrains Mono',Menlo,Consolas,'DejaVu Sans Mono','Liberation Mono',monospace"
const GLYPH_EM_ADVANCE = 0.6 // a monospace glyph is about 0.6 em wide

export function escapeXml(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

const num = (n: number): string => String(Math.round(n * 100) / 100)

// Playback runs forward and then backward (0..N-1..1), so the loop has no jump. Frame i is on
// screen for one slot on the way up and, unless it is an end, one on the way down.
function frameKeyframes(i: number, n: number): string {
  const slots = 2 * n - 2
  const pct = (slot: number): string => `${Math.round((slot / slots) * 1e6) / 1e4}%`
  const shown = i === 0 || i === n - 1 ? [i] : [i, slots - i]
  let css = i === 0 ? '' : '0%{opacity:0}'
  for (const s of shown) css += `${pct(s)}{opacity:1}${pct(s + 1)}{opacity:${s + 1 === slots ? 1 : 0}}`
  return `@keyframes k${i}{${css}}`
}

export function buildHeroSvg(frames: FrameRows[], o: HeroOptions): string {
  const cw = ART_WIDTH / o.cols
  const rh = 2 * cw
  const fontSize = cw / GLYPH_EM_ADVANCE

  const classes = new Map<string, string>()
  const classFor = (color: string): string => {
    let c = classes.get(color)
    if (!c) classes.set(color, (c = `c${classes.size.toString(36)}`))
    return c
  }

  const groups = frames.map((rows, i) => {
    const texts = rows.map((runs, y) => {
      const glyphs = runs.reduce((sum, r) => sum + [...r.text].length, 0)
      if (glyphs === 0) return ''
      const spans = runs.map((r) => `<tspan class="${classFor(r.color)}">${escapeXml(r.text)}</tspan>`).join('')
      const baseline = ART_Y + y * rh + rh * 0.78
      return `<text xml:space="preserve" style="white-space:pre" x="${ART_X}" y="${num(baseline)}" textLength="${num(glyphs * cw)}">${spans}</text>\n`
    })
    return `<g class="f f${i}">\n${texts.join('')}</g>\n`
  })

  const animated = frames.length > 1
  const cycleMs = (2 * frames.length - 2) * o.frameMs
  let css = [...classes].map(([color, c]) => `.${c}{fill:${color}}`).join('')
  css += '.f{opacity:0}.f0{opacity:1}'
  if (animated) {
    css += frames.map((_, i) => `.f${i}{animation:k${i} ${cycleMs}ms steps(1,end) infinite}`).join('')
    css += frames.map((_, i) => frameKeyframes(i, frames.length)).join('')
    css += '@media (prefers-reduced-motion:reduce){.f{animation:none}}'
  }

  const text = (x: number, y: number, size: number, fill: string, s: string): string =>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}">${escapeXml(s)}</text>\n`
  const fields = o.fields.map(([label, value], i) => {
    const y = 190 + 30 * i
    return text(TEXT_X, y, 15, o.accent, label) + text(VALUE_X, y, 15, TEXT, value)
  })
  const description = [o.name, ...o.fields.map(([, value]) => value)].join(', ')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(description)}">\n` +
    `<style>${css}</style>\n` +
    `<rect width="${WIDTH}" height="${HEIGHT}" rx="10" fill="${BG}"/>\n` +
    `<g font-family="${FONT}">\n` +
    `<g font-size="${num(fontSize)}">\n${groups.join('')}</g>\n` +
    text(TEXT_X, 130, 24, o.accent, o.name) +
    text(TEXT_X, 152, 16, RULE, '─'.repeat(13)) +
    fields.join('') +
    `</g>\n</svg>\n`
  )
}
