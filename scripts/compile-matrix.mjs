#!/usr/bin/env node
// Compiles Bootstrap under combinations of its options, the `$enable-*` flags
// of scss/_config.scss plus `$color-mode-type`: the defaults, all flags on, all
// flags off, each option toggled alone and each pair toggled together.
// Usage: npm run compile-matrix
//
// Reports, in one table (reports/matrix/summary.md, and the main rows here):
//   - combinations that fail to compile, with the Sass error
//   - an option whose toggle leaves the CSS byte-identical: it does nothing
//   - a pair where toggling the second option changes nothing once the first
//     is toggled, although it does on its own: the first masks it
// Each combination's CSS goes to reports/matrix/<name>.css. Options known to
// have no effect are listed in scripts/known-options.mjs. Exits non-zero when
// a combination fails to compile, on a new option with no effect or a masked
// one, and on a known entry that no longer applies. Honors BOOTSTRAP_PATH.

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import * as sass from 'sass-embedded'
import { loadEnv } from 'vite'
import { bootstrapSource } from './lib/bootstrap.mjs'
import { compileSource } from './lib/compile.mjs'
import { root } from './lib/configs.mjs'
import known from './known-options.mjs'

// Bugs are tracked, intended findings explained: see "Upstream issue tracking" in CLAUDE.md.
for (const entry of known) {
  if (Boolean(entry.issue) === Boolean(entry.reason)) {
    throw new Error(`scripts/known-options.mjs: ${entry.option} needs either an \`issue\` or a \`reason\``)
  }
}

const bootstrap = bootstrapSource(loadEnv('production', root, ''))
const bootstrapDir = bootstrap.dir ?? path.join(root, 'node_modules/bootstrap')
const reportDir = path.join(root, 'reports/matrix')

// Every `$enable-*: true|false !default;` of _config.scss, so new flags are
// picked up on their own, and `$color-mode-type`.
const config = fs.readFileSync(path.join(bootstrapDir, 'scss/_config.scss'), 'utf8')
const flags = [...config.matchAll(/^\$(enable-[\w-]+):\s*(true|false)\s*!default;/gm)].map(([, name, value]) => ({ name, value: value === 'true' }))
const options = [
  ...flags.map(({ name, value }) => ({ name, label: name.replace(/^enable-/, ''), toggled: String(!value) })),
  { name: 'color-mode-type', label: 'color-mode-type', toggled: '"data"' }
]

const combinations = [
  { name: 'default', set: {} },
  { name: 'all-on', set: Object.fromEntries(flags.map(({ name }) => [name, 'true'])) },
  { name: 'all-off', set: Object.fromEntries(flags.map(({ name }) => [name, 'false'])) },
  ...options.map(option => ({ name: `${option.label}=${option.toggled.replace(/"/g, '')}`, set: { [option.name]: option.toggled }, options: [option] })),
  ...options.flatMap((a, index) => options.slice(index + 1).map(b => ({
    name: `${a.label}=${a.toggled.replace(/"/g, '')}+${b.label}=${b.toggled.replace(/"/g, '')}`,
    set: { [a.name]: a.toggled, [b.name]: b.toggled },
    options: [a, b]
  })))
]

async function compile(combination, compiler) {
  const warnings = new Set()
  const logger = { warn: message => warnings.add(message.split('\n')[0]), debug() {} }
  const entries = Object.entries(combination.set).map(([name, value]) => `$${name}: ${value}`)
  const source = `@use "bootstrap/scss/bootstrap"${entries.length ? ` with (${entries.join(', ')})` : ''};\n`
  try {
    const result = await compileSource(source, { bootstrapDir, logger, compiler })
    let rules = 0
    result.root.walkRules(() => {
      rules++
    })
    fs.writeFileSync(path.join(reportDir, `${combination.name}.css`), result.css)
    return { ...combination, css: result.css, size: Buffer.byteLength(result.css), rules, warnings: [...warnings], hash: crypto.createHash('sha1').update(result.css).digest('hex') }
  } catch (error) {
    return { ...combination, error: (error.sassMessage ?? error.message).split('\n')[0], warnings: [...warnings] }
  }
}

console.log(`Bootstrap: ${bootstrap.label}`)
console.log(`${options.length} options (${options.map(({ label }) => label).join(', ')}), ${combinations.length} combinations\n`)
fs.rmSync(reportDir, { recursive: true, force: true })
fs.mkdirSync(reportDir, { recursive: true })

// One embedded compiler, a few compilations at a time.
const compiler = await sass.initAsyncCompiler()
const results = new Array(combinations.length)
let next = 0
await Promise.all(Array.from({ length: 6 }, async () => {
  while (next < combinations.length) {
    const index = next++
    results[index] = await compile(combinations[index], compiler)
  }
}))
await compiler.dispose()

const byName = new Map(results.map(result => [result.name, result]))
const base = byName.get('default')
const single = option => byName.get(`${option.label}=${option.toggled.replace(/"/g, '')}`)

// Notes per combination: what it's identical to, and masked options.
for (const result of results) {
  result.notes = []
  if (result.error) {
    continue
  }

  if (result !== base && result.hash === base.hash) {
    result.notes.push('identical to default')
  } else {
    const twin = results.find(other => other !== result && !other.error && other.hash === result.hash && results.indexOf(other) < results.indexOf(result))
    if (twin && result !== base) {
      result.notes.push(`identical to ${twin.name}`)
    }
  }

  if (result.options?.length === 2) {
    for (const [first, second] of [result.options, [...result.options].reverse()]) {
      const alone = single(second)
      if (single(first)?.hash === result.hash && alone?.hash !== base.hash) {
        result.notes.push(`${second.label} has no effect once ${first.label} is toggled`)
      }
    }
  }
}

const failed = results.filter(({ error }) => error)
const dead = options.filter(option => single(option)?.hash === base.hash)
const masked = results.filter(({ notes }) => notes.some(note => note.includes('has no effect once')))

const formatSize = bytes => `${(bytes / 1024).toFixed(1)} KB`
const delta = ({ size }) => (size === base.size ? '±0' : `${size > base.size ? '+' : '−'}${formatSize(Math.abs(size - base.size))}`)
const row = result => (result.error ?
  [result.name, 'error', '', '', '', String(result.warnings.length), result.error] :
  [result.name, 'ok', formatSize(result.size), delta(result), String(result.rules), String(result.warnings.length), result.notes.join('; ')])

const header = ['Combination', 'Status', 'Size', 'Δ default', 'Rules', 'Warnings', 'Notes']
fs.writeFileSync(path.join(reportDir, 'summary.md'), [
  '# Compile matrix',
  '',
  `Bootstrap: ${bootstrap.label}. ${combinations.length} combinations of ${options.length} options.`,
  '',
  `| ${header.join(' | ')} |`,
  `| ${header.map(() => '---').join(' | ')} |`,
  ...results.map(result => `| ${row(result).map(cell => cell.replace(/\|/g, '\\|')).join(' | ')} |`),
  ''
].join('\n'))

// The console shows the defaults, all on and off, each option alone, and any
// pair with an error or a masked option.
const shown = results.filter(result => !result.options || result.options.length === 1 || result.error || masked.includes(result))
const widths = header.map((title, column) => Math.max(title.length, ...shown.map(result => row(result)[column].length)))
const line = cells => cells.map((cell, column) => cell.padEnd(widths[column])).join('  ').trimEnd()
console.log(line(header))
for (const result of shown) {
  console.log(line(row(result)))
}

console.log(`\n${combinations.length - failed.length}/${combinations.length} compiled. Full table: ${path.relative(root, path.join(reportDir, 'summary.md'))}`)
for (const result of failed) {
  console.log(`✗ ${result.name}: ${result.error}`)
}

const entryOf = option => known.find(entry => entry.option === option.label)
const fresh = dead.filter(option => !entryOf(option))
const stale = known.filter(entry => !dead.some(option => option.label === entry.option))

for (const option of dead) {
  const entry = entryOf(option)
  console.log(`${entry ? '✓' : '✗'} ${option.label}: toggling it leaves the CSS byte-identical${entry ? ` (known: ${entry.issue ? `#${entry.issue}` : entry.reason})` : ''}`)
}

for (const result of masked) {
  console.log(`✗ ${result.name}: ${result.notes.filter(note => note.includes('has no effect once')).join('; ')}`)
}

for (const entry of stale) {
  const change = options.some(option => option.label === entry.option) ? 'has an effect again' : 'no longer exists in scss/_config.scss'
  console.log(`✗ ${entry.option} ${change}: remove it from scripts/known-options.mjs${entry.issue ? `, and if Bootstrap fixed it, mark #${entry.issue} \`upstream-fixed\` and close it` : ''}`)
}

if (fresh.length || masked.length) {
  console.log('\nAn option that does nothing is probably an upstream bug: open a tracking issue labeled `upstream`')
  console.log('(see "Upstream issue tracking" in CLAUDE.md), then list it in scripts/known-options.mjs with `issue: <n>`.')
}

process.exitCode = failed.length || fresh.length || masked.length || stale.length ? 1 : 0
