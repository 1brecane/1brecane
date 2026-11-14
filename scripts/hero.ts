// Builds the profile's hero: a dark card with frames of ASCII art, a day label, the name and the
// links. GitHub shows README images through <img>, so the SVG carries no script, no web font and
// no external resource; the frames are switched with CSS alone.

export interface Run {
  text: string
  color: string // "#rrggbb", already blended on the background
}
export type FrameRows = Run[][] // one array of runs per row, left to right; blanks are inside run text
export interface HeroOptions {
  cols: number
  rows: number
  label: string
  name: string
  links: string[] // shown as text: the clickable links live in the README
  frameMs: number
}

const WIDTH = 880
const MARGIN = 24
const BG = '#0b0c0e'
const TEXT = '#f2efe8'
const MUTED = '#9a968c'
const LINK = '#e8d096'
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
  const cw = (WIDTH - 2 * MARGIN) / o.cols
  const rh = 2 * cw
  const fontSize = cw / GLYPH_EM_ADVANCE
  const labelY = 38
  const artTop = 54
  const nameY = artTop + o.rows * rh + 44
  const linksY = nameY + 30
  const height = Math.round(linksY + 30)

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
      const baseline = artTop + y * rh + rh * 0.78
      return `<text xml:space="preserve" x="${MARGIN}" y="${num(baseline)}" textLength="${num(glyphs * cw)}">${spans}</text>\n`
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

  const links = o.links
    .map((l, i) => `<tspan${i ? ' dx="28"' : ''}>${escapeXml(l)}</tspan>`)
    .join('')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="${escapeXml(`${o.name}, ${o.label}`)}">\n` +
    `<style>${css}</style>\n` +
    `<rect width="${WIDTH}" height="${height}" rx="10" fill="${BG}"/>\n` +
    `<g font-family="${FONT}">\n` +
    `<text x="${MARGIN}" y="${labelY}" font-size="12" letter-spacing="1.7" fill="${MUTED}">${escapeXml(o.label)}</text>\n` +
    `<g font-size="${num(fontSize)}">\n${groups.join('')}</g>\n` +
    `<text x="${MARGIN}" y="${num(nameY)}" font-size="28" fill="${TEXT}">${escapeXml(o.name)}</text>\n` +
    `<text x="${MARGIN}" y="${num(linksY)}" font-size="16" fill="${LINK}">${links}</text>\n` +
    `</g>\n</svg>\n`
  )
}
