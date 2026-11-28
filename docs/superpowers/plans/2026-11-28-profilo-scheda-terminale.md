# Profile Terminal Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the profile README with one card (today's celestial body on the left, who you are on the right) and produce a pixel-art Pluto avatar.

**Architecture:** `scripts/hero.ts` keeps building a self-contained animated SVG, now laid out side by side; `scripts/generate.ts` feeds it from the portfolio's scene code. A new `scripts/avatar.ts` renders Pluto with the same code and writes a PNG using only Node built-ins.

**Tech Stack:** Node 24 (TypeScript run directly), `node:test`, `node:zlib`, GitHub Actions. No npm dependencies.

**Spec:** `docs/superpowers/specs/2026-11-28-profilo-scheda-terminale-design.md`

## Global Constraints

- Work on branch `profile-card`. No push or merge without the user's confirmation (a push to `main` publishes).
- The SVG has no script, web font, `href` or external resource; animation is CSS only and stops under `prefers-reduced-motion`.
- Card 880 x 398, background `#0b0c0e`, dark in both themes.
- Title `Samuele Ruaro`; rows exactly `role` / `fullstack, backend at heart`, `from` / `Verona, Italy`, `today` / body name.
- The scene comes from `1brecane/portfolio`; seven-day rotation; Pluto is only the avatar.
- Test command: `PORTFOLIO_DIR=<portfolio checkout> node --test "scripts/*.test.ts"`. Without `PORTFOLIO_DIR` the integration tests skip, so always set it (clone into a temporary directory).

## Review Focus

- A body larger than its half (Saturn's rings, Sun's corona): nothing leaves the card or runs under the text. Task 1.
- Any of the seven daily SVGs growing past 400,000 bytes. Task 1 (existing assertion, kept).
- Text with `<` or `&` in title or rows: escaped, SVG stays valid. Task 1.
- GitHub's circular crop cutting Pluto. Task 2.
- A failed generation publishing an empty branch: the `test -s dist/hero.svg` guard stays. Task 3.

---

### Task 1: Side-by-side card

**Files:** Modify `scripts/hero.ts`, `scripts/generate.ts`, `scripts/hero.test.ts`, `scripts/generate.test.ts`

**Interfaces:**
- Produces: `interface HeroOptions { cols: number; rows: number; name: string; fields: [label: string, value: string][]; accent: string; frameMs: number }`; `buildHeroSvg(frames: FrameRows[], o: HeroOptions): string` (signature unchanged). `label` and `links` are removed.
- Layout: art at x 20, y 18, width 390 (cell width `390 / cols`, row height twice that). Text at x 450: name baseline 130, size 24, `accent`; rule baseline 152, thirteen `─`, size 16, `#5a5750`; field i baseline `190 + 30 * i`, size 15, label in `accent`, value at x 560 in `#f2efe8`.
- `aria-label`: name followed by the field values, comma separated.
- In `generate.ts`: `COLS = 56`, `ROWS = 26`, render with `{ ...body, place: undefined }` and bottom fraction `0.96` (moons stay), `accent = body.palette[3]`, frames 14 at 450 ms as now. `FRAME_BOTTOM` and the `config.ts` import are no longer needed.

- [ ] **Step 1: Update the tests.** In `hero.test.ts`, `opts` becomes:

```ts
const opts: HeroOptions = {
  cols: 10, rows: 3, name: 'Samuele Ruaro', accent: '#e8d096', frameMs: 450,
  fields: [['role', 'fullstack, backend at heart'], ['from', 'Verona, Italy'], ['today', 'Saturn']],
}
```

The card test asserts `width="880"`, `height="398"`, `#0b0c0e`, the name and every label and value. Add:

```ts
test('title and fields are escaped', () => {
  const svg = buildHeroSvg([frame('#aabbcc')], { ...opts, name: 'a<b', fields: [['r&d', 'x>y']] })
  for (const s of ['a&lt;b', 'r&amp;d', 'x&gt;y']) assert.ok(svg.includes(s), s)
  assert.ok(!svg.includes('a<b'))
})
```

In `generate.test.ts`, replace the `SATURDAY · SATURN` assertion with `today.includes('>Saturn<')`, and inside the loop over `written` add:

```ts
const svg = readFileSync(path, 'utf8')
const rows = [...svg.matchAll(/<text xml:space="preserve"[^>]* x="([\d.]+)" y="([\d.]+)" textLength="([\d.]+)"/g)]
assert.ok(rows.length > 0, path)
for (const [, x, y, len] of rows) {
  assert.ok(Number(x) + Number(len) <= 410.1, `${path}: art reaches the text`)
  assert.ok(Number(y) <= 398, `${path}: art leaves the card`)
}
```

- [ ] **Step 2: Run the tests.** Expected: FAIL on the card, escaping and generate tests.
- [ ] **Step 3: Implement** the interfaces above.
- [ ] **Step 4: Run the tests.** Expected: all PASS, none skipped.
- [ ] **Step 5: Look at all seven SVGs** in a browser: whole body, no overlap, readable text.
- [ ] **Step 6: Commit** `Lay the hero out as a card` (include the spec and this plan).

### Task 2: Pluto avatar

**Files:** Create `scripts/avatar.ts`, `scripts/avatar.test.ts`, `assets/avatar.png`

**Interfaces:**
- Produces: `avatarPixels(portfolioDir: string): Promise<Uint8Array>` (40 x 40 RGB, 4800 bytes); `encodePng(width: number, height: number, rgb: Uint8Array): Buffer`; CLI `node scripts/avatar.ts <portfolio-dir> <out.png>` writing 800 x 800 (each pixel a 20 x 20 block, no gaps).
- Render (approved variant B): `PLUTO` from `bodies.ts` with `moons: []`, `companion: undefined`, `place: (w, h) => ({ cx: w / 2, cy: h / 2, radius: 0.4 * w })`; grid 160 x 80, bottom fraction 1; time `p / 4 - (lightPhase * p) / (2 * Math.PI) + 0.2 * p` where `p = lightPeriodMs`.
- Each output pixel is the mean of 4 columns x 2 rows of cells, a cell being `cellRgb(...)` or the background `[11, 12, 14]` when its level is 0.

- [ ] **Step 1: Write the failing tests**

```ts
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
```

- [ ] **Step 2: Run the tests.** Expected: FAIL, module not found.
- [ ] **Step 3: Implement** (`deflateSync` and `crc32` from `node:zlib`; colour type 2, bit depth 8, filter 0 per row).
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Generate** `assets/avatar.png` and check it at 800 px and 32 px, cropped to a circle: heart visible.
- [ ] **Step 6: Commit** `Add the pixel-art Pluto avatar`.

### Task 3: README and workflow

**Files:** Modify `README.md`, `.github/workflows/profile.yml`; delete `assets/footer-dark.svg`, `assets/footer-light.svg`

- [ ] **Step 1: README** contains only two centred blocks: the existing linked hero image (alt `Samuele Ruaro, fullstack developer: today's celestial body, ray-cast as ASCII`, `width="100%"`) and the existing line of three links (samueleruaro.com, linkedin, email). Remove both paragraphs, the snake, the footer, the `---` and the location.
- [ ] **Step 2: Workflow** drops the `Generate snake SVGs` step (the only user of `PAT_TOKEN`). Schedules and the `test -s dist/hero.svg` guard stay.
- [ ] **Step 3: Delete** the footer SVGs.
- [ ] **Step 4: Verify.** `rg -n "snake|footer|PAT_TOKEN" README.md .github scripts` prints nothing; tests PASS.
- [ ] **Step 5: Commit** `Trim the profile to the card and links`.

After Task 3: show the user the result, ask before publishing, and have them upload `assets/avatar.png` in GitHub settings.
