#!/usr/bin/env node
// Deletes the visual baselines that no test compares with any more, like
// those of a removed page or kitchen sink example, after a visual run that
// listed the ones it used (VISUAL_BASELINES_USED, see tests/visual/shared.js).
// That run must cover every page in Chromium: the list is complete for
// Chromium's baselines, and stands for Firefox's and WebKit's too, whose
// runs may have been scoped to a few pages. An engine's baseline is kept
// when that engine's run used it, or when Chromium used the same one.
// Usage: VISUAL_BASELINES_USED=reports/baselines-used.txt node scripts/prune-baselines.mjs
//
// Deletes the list afterwards, so the next run starts a new one.
import fs from 'node:fs'
import path from 'node:path'
import { root } from './lib/configs.mjs'

const list = process.env.VISUAL_BASELINES_USED && path.resolve(root, process.env.VISUAL_BASELINES_USED)
if (!list || !fs.existsSync(list)) {
  console.error('No list of the baselines used: set VISUAL_BASELINES_USED to the file the visual run wrote.')
  process.exit(1)
}

const screenshots = path.join(root, 'tests/visual/screenshots', process.platform)
const used = new Set(fs.readFileSync(list, 'utf8').split('\n').filter(Boolean).map(file => path.relative(screenshots, file)))

// Firefox's and WebKit's baselines are in visual-firefox/ and visual-webkit/.
const ENGINE_FOLDER = /^visual-[^/]+\//
const chromium = [...used].filter(file => !ENGINE_FOLDER.test(file))
if (chromium.length === 0) {
  console.error(`${path.relative(root, list)} lists no Chromium baseline: run every page in Chromium first, so nothing is deleted by mistake.`)
  process.exit(1)
}

const files = fs.readdirSync(screenshots, { recursive: true })
  .filter(file => file.endsWith('.png'))
  .map(file => file.split(path.sep).join('/'))
const unused = files.filter(file => !used.has(file) && !used.has(file.replace(ENGINE_FOLDER, '')))

for (const file of unused) {
  fs.rmSync(path.join(screenshots, file))
}

console.log(`${unused.length} of ${files.length} baselines were no longer used, and are deleted.`)
for (const file of unused) {
  console.log(`  ${file}`)
}

fs.rmSync(list)
