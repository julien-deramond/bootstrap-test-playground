#!/usr/bin/env node
// Audits which Sass partials react to the `.theme-*` classes. A themeable
// component reads the generic `--theme-*` tokens (`var(--theme-bg, …)`), set by
// `.theme-danger` and the like. The docs say "not every component does"
// (customize/theme) without listing which, so this keeps the answer honest:
// every partial either reads a theme token, or is listed in
// scripts/known-themes.mjs, with the `reason` it is intended or the tracking
// `issue` for a component that should react and doesn't.
// Usage: npm run audit-themes [-- --all]
//
// Findings:
//   - unthemed: a partial reads no `var(--theme-` token
// The report only shows the findings that aren't known, or all of them with
// --all. Exits non-zero on a new finding or on a known entry that no longer
// matches anything (the partial reads a theme token now, or is gone).

import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from 'vite'
import { bootstrapScssFiles, bootstrapSource } from './lib/bootstrap.mjs'
import { root } from './lib/configs.mjs'
import known from './known-themes.mjs'

// Bugs are tracked, intended findings explained: see "Upstream issue tracking" in CLAUDE.md.
for (const entry of known) {
  if (Boolean(entry.issue) === Boolean(entry.reason)) {
    throw new Error(`scripts/known-themes.mjs: each entry needs either an \`issue\` or a \`reason\`: ${entry.partial}`)
  }
}

const showAll = process.argv.includes('--all')
const bootstrap = bootstrapSource(loadEnv('production', root, ''))
const bootstrapDir = bootstrap.dir ?? path.join(root, 'node_modules/bootstrap')
const scssDir = path.join(bootstrapDir, 'scss')

// Files that define things rather than style a component, or only forward
// others: the entry points (bootstrap.scss…), folder indexes, the config,
// color and theme definitions, `root`, the functions, the mixins, the layout
// partials and the utilities API.
const SKIP = /^(bootstrap(-[\w-]+)?\.scss|(.+\/)?index\.scss|_(config|colors|theme|root|functions)\.scss|mixins\/.*|layout\/.*|utilities\/_api\.scss)$/

// `_alert.scss` → alert, `forms/_check.scss` → forms/check.
const partials = bootstrapScssFiles(bootstrapDir)
  .map(file => path.relative(scssDir, file).split(path.sep).join('/'))
  .filter(file => !SKIP.test(file))
  .sort()
  .map(file => ({ file, name: file.replace(/(^|\/)_/, '$1').replace(/\.scss$/, '') }))

const findings = partials
  .filter(({ file }) => !fs.readFileSync(path.join(scssDir, file), 'utf8').includes('var(--theme-'))
  .map(({ file, name }) => ({ kind: 'unthemed', partial: name, detail: `scss/${file} reads no \`var(--theme-\` token` }))

const matches = (entry, finding) => entry.partial === finding.partial
const knownOf = finding => known.find(entry => matches(entry, finding))

console.log(`Bootstrap: ${bootstrap.label}\n`)
console.log(`${partials.length} partials: ${partials.length - findings.length} read a theme token, ${findings.length} don't\n`)

for (const finding of findings.filter(finding => showAll || !knownOf(finding))) {
  const entry = knownOf(finding)
  const label = entry ? (entry.issue ? `known, #${entry.issue}` : `known: ${entry.reason}`) : 'new'
  console.log(`  ${entry ? '·' : '✗'} ${finding.partial}: ${finding.detail}  [${label}]`)
}

const fresh = findings.filter(finding => !knownOf(finding))
const stale = known.filter(entry => findings.every(finding => !matches(entry, finding)))
for (const entry of stale) {
  console.log(`  ✗ known entry no longer happens: ${entry.partial}${entry.issue ? `, #${entry.issue}` : ''} (it reads a theme token now, or the partial is gone)`)
}

if (fresh.length === 0 && stale.length === 0) {
  console.log(`✓ ${findings.length} known, 0 new`)
} else {
  console.log(`\n${fresh.length} new, ${stale.length} stale. For a component that should react to \`.theme-*\`, open a tracking issue labeled \`upstream\` (see "Upstream issue tracking" in CLAUDE.md) and list it in scripts/known-themes.mjs with \`issue: <n>\`; for an intended one, with a \`reason\`. When an entry no longer happens, remove it.`)
  process.exitCode = 1
}
