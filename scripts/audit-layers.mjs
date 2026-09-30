#!/usr/bin/env node
// Audits the cascade layers of configs/default's compiled CSS. The
// customization rules of docs/customizing.md (global tokens unlayered,
// component overrides in `@layer custom`, utilities last) only hold if every
// rule sits in the layer it should.
// Usage: npm run audit-layers [-- --all | --render]
//
// Findings:
//   - undeclared: an `@layer` block missing from the `@layer …;` statement,
//     so it's ordered after every declared layer
//   - unlayered: a rule outside any layer, other than the global tokens
//     docs/customizing.md documents as unlayered (`:root`, `:host`,
//     `[data-bs-theme]`).
//     Unlayered rules beat every layer, utilities included.
//   - split: a Bootstrap source file whose rules land in more than one layer
//   - important: an `!important` declaration. Across layers `!important`
//     reverses the order: one in `reboot` beats one in `utilities`.
//   - docs: the layer list in Bootstrap's AGENTS.md differs from the
//     statement (only with a BOOTSTRAP_PATH checkout: npm doesn't ship it)
// Known findings are listed in scripts/known-layers.mjs. The report only shows
// the others, or all of them with --all. Exits non-zero on a new finding or on
// a known entry that no longer matches anything.
//
// --render opens issues/pg-27/, which checks each documented override rule in
// the browser, and reads its pass/fail markers.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { createServer, loadEnv } from 'vite'
import { bootstrapSource } from './lib/bootstrap.mjs'
import { compileConfig } from './lib/compile.mjs'
import { root } from './lib/configs.mjs'
import known from './known-layers.mjs'

// Bugs are tracked, intended findings explained: see "Upstream issue tracking" in CLAUDE.md.
for (const entry of known) {
  if (Boolean(entry.issue) === Boolean(entry.reason)) {
    throw new Error(`scripts/known-layers.mjs: each entry needs either an \`issue\` or a \`reason\`: ${entry.kind} ${entry.selector}`)
  }
}

const showAll = process.argv.includes('--all')
const bootstrap = bootstrapSource(loadEnv('production', root, ''))
const bootstrapDir = bootstrap.dir ?? path.join(root, 'node_modules/bootstrap')
const quiet = { warn() {}, debug() {} }

console.log(`Bootstrap: ${bootstrap.label}\n`)

// --- --render: the layers page ---------------------------------------------

async function render() {
  const server = await createServer({ root, logLevel: 'silent', server: { port: 5194 } })
  await server.listen()
  const base = server.resolvedUrls.local[0].replace(/\/$/, '')
  const browser = await chromium.launch()
  let cases
  try {
    const page = await browser.newPage()
    await page.goto(`${base}/issues/pg-27/?chrome=0`)
    await page.waitForFunction(() => document.documentElement.dataset.layerCases === 'done')
    cases = await page.$$eval('[data-layer-case]', items => items.map(item => ({ name: item.dataset.layerCase, expect: item.dataset.expect, result: item.dataset.result, issue: item.dataset.issue })))
  } finally {
    await browser.close()
    await server.close()
  }

  let problems = 0
  console.log('issues/pg-27/: the documented override rules, checked in the browser')
  for (const { name, expect, result, issue } of cases) {
    const pass = result === 'pass'
    // A failing check with an issue is a known upstream bug. A passing one
    // with an issue means the bug may be fixed.
    const ok = pass !== Boolean(issue)
    problems += ok ? 0 : 1
    const note = issue ? (pass ? `passes now: if Bootstrap fixed #${issue}, remove its data-issue and mark it \`upstream-fixed\`` : `#${issue}`) : (pass ? '' : 'new failure')
    console.log(`  ${ok ? '✓' : '✗'} ${pass ? 'pass' : 'fail'}  ${expect}${note ? `  (${note})` : ''}  [${name}]`)
  }

  return problems ? 1 : 0
}

if (process.argv.includes('--render')) {
  process.exitCode = await render()
  process.exit()
}

// --- Static audit -----------------------------------------------------------

const KINDS = {
  undeclared: 'Layer block missing from the @layer statement',
  unlayered: 'Rule outside any layer',
  split: 'Source file split across layers',
  important: '!important declaration',
  docs: 'AGENTS.md layer list differs from the @layer statement'
}

function origin(node) {
  const { start, input } = node.source ?? {}
  const found = start && (input.map ? input.origin(start.line, start.column) : { file: input.file, line: start.line })
  if (!found?.file) {
    return null
  }

  const file = found.file.startsWith('file:') ? fileURLToPath(found.file) : found.file
  return { file: file.startsWith(bootstrapDir + path.sep) ? `bootstrap/${path.relative(bootstrapDir, file)}` : path.relative(root, file), line: found.line }
}

const where = node => {
  const found = origin(node)
  return found ? `${found.file}:${found.line}` : ''
}

const layerOf = node => {
  const names = []
  for (let parent = node.parent; parent && parent.type !== 'root'; parent = parent.parent) {
    if (parent.type === 'atrule' && parent.name === 'layer') {
      names.unshift(parent.params)
    }
  }

  return names.join('.')
}

const inKeyframes = node => node.parent?.type === 'atrule' && /keyframes$/.test(node.parent.name)
const clean = selector => selector.replace(/\s+/g, ' ').trim()

const { root: css } = await compileConfig(path.join(root, 'configs/default/main.scss'), { bootstrapDir, logger: quiet, sourceMap: true })
const findings = []

// The statement, and the blocks.
const statement = css.nodes.find(node => node.type === 'atrule' && node.name === 'layer' && !node.nodes)
const declared = statement ? statement.params.split(',').map(name => name.trim()) : []
const used = new Map()
css.walkAtRules('layer', rule => {
  if (!rule.nodes) {
    return
  }

  const name = layerOf(rule) ? `${layerOf(rule)}.${rule.params}` : rule.params
  used.set(name, (used.get(name) ?? 0) + rule.nodes.length)
  if (!layerOf(rule) && !declared.includes(rule.params)) {
    findings.push({ kind: 'undeclared', selector: `@layer ${rule.params}`, detail: 'ordered after every declared layer', where: where(rule) })
  }
})

// Rules outside layers.
const GLOBAL = /^(:root|:host|\[data-bs-theme=[\w"'-]+\])$/
const tokensOnly = rule => rule.nodes.every(node => node.type !== 'decl' || node.prop.startsWith('--') || node.prop === 'color-scheme')
let globalRules = 0
css.walkRules(rule => {
  if (layerOf(rule) || inKeyframes(rule)) {
    return
  }

  if (rule.selectors.every(selector => GLOBAL.test(clean(selector))) && tokensOnly(rule)) {
    globalRules++
    return
  }

  const first = rule.nodes.find(node => node.type === 'decl') ?? rule
  findings.push({ kind: 'unlayered', selector: clean(rule.selector), detail: rule.nodes.filter(node => node.type === 'decl').map(node => node.prop).slice(0, 4).join(', '), where: where(first) })
})

// Files split across layers. Mixins emit into their caller's layer, so only
// the files that include them count.
const layersByFile = new Map()
css.walkDecls(decl => {
  const rule = decl.parent
  if (rule.type !== 'rule' || inKeyframes(rule)) {
    return
  }

  const found = origin(decl)
  if (!found || !found.file.startsWith('bootstrap/scss/') || found.file.includes('/mixins/')) {
    return
  }

  const layers = layersByFile.get(found.file) ?? new Map()
  const layer = layerOf(rule) || '(unlayered)'
  if (!layers.has(layer)) {
    layers.set(layer, `${found.file}:${found.line}`)
  }

  layersByFile.set(found.file, layers)
})
for (const [file, layers] of layersByFile) {
  if (layers.size > 1) {
    findings.push({ kind: 'split', selector: file, detail: [...layers.keys()].join(', '), where: [...layers.values()].join(', ') })
  }
}

// !important, one finding per selector and source file. Responsive copies
// (`.sm\:navbar-expand`, `.\32 xl\:navbar-expand`) count as one.
const withoutBreakpoint = selector => selector.replace(/\.(?:\\3\d\s?)?[a-z0-9]*\\:/g, '.')
const important = new Map()
let importantCount = 0
css.walkDecls(decl => {
  if (!decl.important || decl.parent.type !== 'rule') {
    return
  }

  importantCount++
  const selector = withoutBreakpoint(clean(decl.parent.selector))
  const key = `${selector}|${origin(decl)?.file}`
  const entry = important.get(key) ?? { kind: 'important', selector, props: new Set(), variants: new Set(), where: where(decl), layer: layerOf(decl) || '(unlayered)' }
  entry.props.add(decl.prop)
  entry.variants.add(decl.parent.selector)
  important.set(key, entry)
})
for (const { props, variants, ...entry } of important.values()) {
  findings.push({ ...entry, detail: `${[...props].join(', ')} in ${entry.layer}${variants.size > 1 ? ` (${variants.size} responsive variants)` : ''}` })
}

// AGENTS.md, in a checkout only.
const agentsFile = path.join(bootstrapDir, 'AGENTS.md')
const agents = fs.existsSync(agentsFile) ? fs.readFileSync(agentsFile, 'utf8').match(/CSS layers:\s*`([^`]+)`/)?.[1].split(',').map(name => name.trim()) : null
if (agents && agents.join() !== declared.join()) {
  const extra = agents.filter(name => !declared.includes(name))
  const missing = declared.filter(name => !agents.includes(name))
  findings.push({ kind: 'docs', selector: 'AGENTS.md', detail: [extra.length && `lists ${extra.join(', ')}`, missing.length && `misses ${missing.join(', ')}`, !extra.length && !missing.length && 'different order'].filter(Boolean).join('; '), where: 'AGENTS.md' })
}

// --- Report -----------------------------------------------------------------

const matches = (entry, finding) => entry.kind === finding.kind &&
  (entry.selector instanceof RegExp ? entry.selector.test(finding.selector) : finding.selector.includes(entry.selector))
const entryOf = finding => known.find(entry => matches(entry, finding))
const usedEntries = new Set(findings.map(entryOf).filter(Boolean))
const fresh = findings.filter(finding => !entryOf(finding))

const empty = declared.filter(name => !used.has(name))
console.log(`configs/default: @layer ${declared.join(', ')}`)
console.log(`  ${[...used.keys()].length} layers used${empty.length ? `, declared but empty: ${empty.join(', ')}` : ''}`)
console.log(`  ${globalRules} unlayered global token rules (expected), ${findings.filter(finding => finding.kind === 'unlayered').length} other unlayered rules`)
console.log(`  ${importantCount} !important declarations in ${important.size} rules`)
console.log(`  AGENTS.md: ${agents ? (agents.join() === declared.join() ? 'matches' : 'differs') : 'not checked (only in a Bootstrap checkout, with BOOTSTRAP_PATH)'}`)
console.log(`${fresh.length ? '✗' : '✓'} ${findings.length - fresh.length} known, ${fresh.length} new\n`)

const listed = showAll ? findings : fresh
for (const [kind, label] of Object.entries(KINDS)) {
  const group = listed.filter(finding => finding.kind === kind)
  if (!group.length) {
    continue
  }

  console.log(`  ${label} (${kind}): ${group.length}`)
  for (const finding of group) {
    const entry = entryOf(finding)
    console.log(`    ${finding.selector.length > 100 ? `${finding.selector.slice(0, 97)}…` : finding.selector}${entry ? `  (${entry.issue ? `#${entry.issue}` : entry.reason})` : ''}`)
    console.log(`      ${finding.detail}`)
    console.log(`      ${finding.where}`)
  }
}

// The docs entry can only match when AGENTS.md is there.
const stale = known.filter(entry => !usedEntries.has(entry) && (entry.kind !== 'docs' || agents))
for (const entry of stale) {
  console.log(`\n✗ Known entry no longer found, remove it from scripts/known-layers.mjs: ${entry.kind} ${entry.selector}${entry.issue ? ` (#${entry.issue})` : ''}`)
  if (entry.issue) {
    console.log(`  If Bootstrap fixed it, mark #${entry.issue} \`upstream-fixed\` and close it (step 3 of "Upstream issue tracking" in CLAUDE.md).`)
  }
}

if (fresh.length) {
  console.log('\nFor each new finding: if it’s a Bootstrap bug, open a tracking issue in this repository labeled `upstream`')
  console.log('(see "Upstream issue tracking" in CLAUDE.md), then add it to scripts/known-layers.mjs with `issue: <n>`.')
  console.log('If it’s intended, add it with a `reason`.')
}

process.exitCode = fresh.length || stale.length ? 1 : 0
