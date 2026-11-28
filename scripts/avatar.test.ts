import assert from 'node:assert/strict'
import { test } from 'node:test'
import { avatarPixels, encodePng } from './avatar.ts'

test('encodePng writes a PNG with the given size', () => {
  const png = encodePng(2, 3, new Uint8Array(18))
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  assert.equal(png.readUInt32BE(16), 2)
  assert.equal(png.readUInt32BE(20), 3)
})

test('Pluto is centred and inside the circular crop', async (t) => {
  const dir = process.env.PORTFOLIO_DIR
  if (!dir) return t.skip('PORTFOLIO_DIR is not set')
  const px = await avatarPixels(dir)
  assert.equal(px.length, 4800)
  const lum = (x: number, y: number) => px[(y * 40 + x) * 3]
  assert.ok(lum(20, 20) > 100)
  for (let y = 0; y < 40; y++)
    for (let x = 0; x < 40; x++)
      if (Math.hypot(x - 19.5, y - 19.5) > 19) assert.ok(lum(x, y) < 100, `${x},${y}`)
})
