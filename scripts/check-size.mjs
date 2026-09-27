#!/usr/bin/env node
// Measures what Bootstrap weighs: each config's CSS, Bootstrap's prebuilt
// dist files and a bundle of its JavaScript source, minified, gzipped and
// brotli-compressed. Compares them with the last entry of sizes/history.json.
// Usage: npm run check-size [-- --record]
//
// - css/<config>: configs/<config>/main.scss compiled like the playground
//   (Sass, then postcss.config.js), minified with Lightning CSS at Bootstrap's
//   browser floors, like `vite build`. The working copy isn't measured: it's
//   for experiments.
// - dist/<file>: the prebuilt files the package ships, as users download them.
// - src/bootstrap.bundle.js: js/src/index.ts and its dependencies bundled and
//   minified with Rolldown. Unlike dist/, it follows the source even when
//   dist/ wasn't rebuilt.
//
// `--record` writes the sizes to sizes/history.json under the Bootstrap
// commit, replacing an entry for the same commit. The nightly canary records
// every update, so the history follows v6-dev; sizes.html charts it. A change
// of more than 2% is flagged; nothing fails.

import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { transform } from 'lightningcss'
import { rolldown } from 'rolldown'
import { loadEnv } from 'vite'
import { bootstrapSource } from './lib/bootstrap.mjs'
import { compileConfig } from './lib/compile.mjs'
import { listConfigs, root } from './lib/configs.mjs'

const record = process.argv.includes('--record')
const bootstrap = bootstrapSource(loadEnv('production', root, ''))
const bootstrapDir = bootstrap.dir ?? path.join(root, 'node_modules/bootstrap')
const historyFile = path.join(root, 'sizes/history.json')
const quiet = { warn() {}, debug() {} }

// Bootstrap's `.browserslistrc` floors, as in vite.config.js.
const TARGETS = { chrome: 130 << 16, edge: 130 << 16, firefox: 132 << 16, safari: 18 << 16 }
const FLAG = 0.02

const measure = buffer => ({
  min: buffer.length,
  gzip: zlib.gzipSync(buffer, { level: 9 }).length,
  brotli: zlib.brotliCompressSync(buffer, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length
})

function commit() {
  if (bootstrap.dir) {
    return { sha: 'local', label: bootstrap.label }
  }

  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
  const sha = lock.packages?.['node_modules/bootstrap']?.resolved?.split('#')[1] ?? 'unknown'
  return { sha, label: bootstrap.label }
}

const sizes = {}

for (const { name } of listConfigs()) {
  const { css } = await compileConfig(path.join(root, 'configs', name, 'main.scss'), { bootstrapDir, logger: quiet })
  const { code } = transform({ filename: `${name}.css`, code: Buffer.from(css), minify: true, targets: TARGETS })
  sizes[`css/${name}`] = measure(Buffer.from(code))
}

for (const file of ['dist/css/bootstrap.min.css', 'dist/js/bootstrap.min.js', 'dist/js/bootstrap.bundle.min.js']) {
  sizes[`dist/${path.basename(file)}`] = measure(fs.readFileSync(path.join(bootstrapDir, file)))
}

const bundle = await rolldown({ input: path.join(bootstrapDir, 'js/src/index.ts'), logLevel: 'silent' })
const { output } = await bundle.generate({ format: 'esm', minify: true })
await bundle.close()
sizes['src/bootstrap.bundle.js'] = measure(Buffer.from(output[0].code))

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
  delta(size.gzip, baseline?.sizes[file]?.gzip)
])
const header = ['File', 'Minified', 'Gzip', 'Brotli', 'Gzip change']
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
