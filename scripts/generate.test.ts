import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { test } from 'node:test'
import { frameTimes, generate, romeWeekday } from './generate.ts'

const tmp = (): string => mkdtempSync(join(tmpdir(), 'hero-'))

test('romeWeekday uses the day in Rome, not in UTC', () => {
  assert.equal(romeWeekday(new Date('2026-11-14T12:00:00Z')), 6) // Saturday
  assert.equal(romeWeekday(new Date('2026-11-14T23:30:00Z')), 0) // already Sunday in Rome
})

test('frameTimes spans half a light period, from one extreme of the light to the other', () => {
  const times = frameTimes(40000, 0, 5)
  assert.equal(times.length, 5)
  assert.equal(times[0], 10000)
  assert.equal(times[4], 30000)
  for (let i = 1; i < times.length; i++) assert.ok(times[i] > times[i - 1])
})

test('frameTimes follows the phase of the light', () => {
  assert.equal(frameTimes(40000, Math.PI / 2, 3)[0], 0)
})

test('a missing portfolio directory is reported by its path', async () => {
  await assert.rejects(generate('/no/such/dir', tmp()), /portfolio not found: \/no\/such\/dir/)
})

test('generate writes the seven bodies and today as hero.svg', async (t) => {
  const portfolio = process.env.PORTFOLIO_DIR
  if (!portfolio) return t.skip('PORTFOLIO_DIR is not set')
  const out = tmp()
  const written = await generate(portfolio, out, new Date('2026-11-14T12:00:00Z'))
  assert.equal(written.length, 8)
  for (const path of written) {
    assert.ok(readFileSync(path, 'utf8').startsWith('<svg'), path)
    assert.ok(statSync(path).size < 400_000, `${basename(path)} is ${statSync(path).size} bytes`)
  }
  assert.deepEqual(
    written.map((p) => basename(p)).sort(),
    ['hero-jupiter.svg', 'hero-mars.svg', 'hero-mercury.svg', 'hero-moon.svg', 'hero-saturn.svg', 'hero-sun.svg', 'hero-venus.svg', 'hero.svg'],
  )
  const today = readFileSync(join(out, 'hero.svg'), 'utf8')
  assert.equal(today, readFileSync(join(out, 'hero-saturn.svg'), 'utf8'))
  assert.ok(today.includes('SATURDAY · SATURN'))
})
