#!/usr/bin/env node
// Measures what Bootstrap weighs: each config's CSS, Bootstrap's dist files
// and a bundle of its JavaScript source, minified, gzipped and
// brotli-compressed. Compares them with the last entry of sizes/history.json.
// Usage: npm run check-size [-- --record]
//
// - css/<config>: configs/<config>/main.scss compiled like the playground
//   (Sass, then postcss.config.js), minified with Lightning CSS at Bootstrap's
//   browser floors, like `vite build`. The working copy isn't measured: it's
//   for experiments.
// - dist/<file>: the files users download, built from the commit's source like
//   Bootstrap's `npm run dist` (scripts/lib/dist.mjs), not the committed ones,
//   which Bootstrap only rebuilds for releases.
// - src/bootstrap.bundle.js: js/src/index.ts and its dependencies bundled and
//   minified with Rolldown's defaults, without Bootstrap's build settings.
//
// `--record` writes the sizes to sizes/history.json under the Bootstrap
// commit, replacing an entry for the same commit. The nightly canary records
// every update, so the history follows v6-dev; sizes.html charts it. A change
// of more than 2% is flagged; nothing fails.
//
// Changes are measured on the brotli size. Node's gzip output depends on the
// platform (CPU-specific code in its zlib): macOS and the Linux runners
// disagree by up to 0.3% on identical files, while brotli matches byte for
// byte. Gzip is still reported, as a server would send it.

import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from 'vite'
import { bootstrapSource } from './lib/bootstrap.mjs'
import { root } from './lib/configs.mjs'
import { measureSizes } from './lib/sizes.mjs'

const record = process.argv.includes('--record')
const bootstrap = bootstrapSource(loadEnv('production', root, ''))
const bootstrapDir = bootstrap.dir ?? path.join(root, 'node_modules/bootstrap')
const historyFile = path.join(root, 'sizes/history.json')

const FLAG = 0.02

function commit() {
  if (bootstrap.dir) {
    return { sha: 'local', label: bootstrap.label }
  }

  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
  const sha = lock.packages?.['node_modules/bootstrap']?.resolved?.split('#')[1] ?? 'unknown'
  return { sha, label: bootstrap.label }
}

const sizes = await measureSizes(bootstrapDir)

// --- Compare with the last recorded entry -----------------------------------

const history = fs.existsSync(historyFile) ? JSON.parse(fs.readFileSync(historyFile, 'utf8')) : []
const current = commit()
const previous = history.findLast(entry => entry.commit !== current.sha)
const same = history.find(entry => entry.commit === current.sha)
const baseline = same ?? previous

const kb = bytes => `${(bytes / 1024).toFixed(1)} KB`
const delta = (now, before) => {
  if (before === undefined) {
    return 'new'
  }

  const change = now - before
  const ratio = before ? change / before : 0
  const sign = change > 0 ? '+' : '−'
  return change === 0 ? '±0' : `${sign}${kb(Math.abs(change))} (${sign}${Math.abs(ratio * 100).toFixed(1)}%)${Math.abs(ratio) > FLAG ? ' ⚠' : ''}`
}

console.log(`Bootstrap: ${current.label}`)
console.log(baseline ? `Compared with ${baseline.commit.slice(0, 9)} (${baseline.date.slice(0, 10)})\n` : 'No recorded sizes yet: run with -- --record\n')

const rows = Object.entries(sizes).map(([file, size]) => [
  file,
  kb(size.min),
  kb(size.gzip),
  kb(size.brotli),
  delta(size.brotli, baseline?.sizes[file]?.brotli)
])
const header = ['File', 'Minified', 'Gzip', 'Brotli', 'Brotli change']
const widths = header.map((title, index) => Math.max(title.length, ...rows.map(row => row[index].length)))
for (const row of [header, ...rows]) {
  console.log(row.map((cell, index) => cell.padEnd(widths[index])).join('  ').trimEnd())
}

const flagged = rows.filter(row => row[4].includes('⚠'))
console.log(`\n${flagged.length ? `⚠ ${flagged.length} ${flagged.length === 1 ? 'file changed' : 'files changed'} by more than ${FLAG * 100}%` : `✓ no file changed by more than ${FLAG * 100}%`}${baseline ? '' : ' (nothing to compare with)'}`)

if (record) {
  if (current.sha === 'local') {
    console.log('Not recorded: BOOTSTRAP_PATH points to a local checkout, which has no commit to key the entry by.')
  } else {
    const entry = { commit: current.sha, date: new Date().toISOString(), sizes }
    const next = [...history.filter(item => item.commit !== current.sha), entry]
    fs.mkdirSync(path.dirname(historyFile), { recursive: true })
    fs.writeFileSync(historyFile, `${JSON.stringify(next, null, 2)}\n`)
    console.log(`Recorded under ${current.sha.slice(0, 9)} in ${path.relative(root, historyFile)}`)
  }
}
