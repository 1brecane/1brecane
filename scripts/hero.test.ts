import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildHeroSvg, escapeXml } from './hero.ts'
import type { FrameRows, HeroOptions } from './hero.ts'

const opts: HeroOptions = {
  cols: 10,
  rows: 3,
  label: 'SATURDAY · SATURN',
  name: 'Samuele Ruaro',
  links: ['samueleruaro.com', 'linkedin', 'email'],
  frameMs: 450,
}

const frame = (color: string, text = '.:-=+'): FrameRows => [[{ text, color }], [], [{ text: '  @', color }]]

const count = (s: string, needle: string): number => s.split(needle).length - 1

test('escapeXml escapes the XML special characters', () => {
  assert.equal(escapeXml('a<&>"'), 'a&lt;&amp;&gt;&quot;')
})

test('the card is an 880 wide svg on the site background with label, name and links', () => {
  const svg = buildHeroSvg([frame('#aabbcc')], opts)
  assert.ok(svg.startsWith('<svg'))
  assert.ok(svg.includes('width="880"'))
  assert.ok(svg.includes('#0b0c0e'))
  for (const s of [opts.label, opts.name, ...opts.links]) assert.ok(svg.includes(s), s)
})

test('the svg is self-contained: no scripts, links or external resources', () => {
  const svg = buildHeroSvg([frame('#aabbcc'), frame('#ddeeff')], opts)
  assert.ok(!svg.includes('<script'))
  assert.ok(!svg.includes('href='))
  assert.ok(!svg.includes('url(http'))
})

test('three frames give three frame groups and a reduced-motion rule', () => {
  const svg = buildHeroSvg([frame('#aabbcc'), frame('#ddeeff'), frame('#112233')], opts)
  assert.equal(count(svg, 'class="f'), 3)
  assert.ok(svg.includes('prefers-reduced-motion'))
})

test('a single frame is not animated', () => {
  assert.ok(!buildHeroSvg([frame('#aabbcc')], opts).includes('@keyframes'))
})

test('run text is escaped and keeps its leading blanks', () => {
  const svg = buildHeroSvg([[[{ text: '  <&', color: '#ffffff' }]]], opts)
  assert.ok(svg.includes('  &lt;&amp;'))
  assert.match(svg, /<text[^>]*xml:space="preserve"[^>]*>[^\n]*  &lt;&amp;/)
})

test('a colour used in several frames becomes one css class', () => {
  const svg = buildHeroSvg([frame('#a1b2c3'), frame('#a1b2c3')], opts)
  assert.equal(count(svg, '#a1b2c3'), 1)
})
