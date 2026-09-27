#!/usr/bin/env node
// Audits the motion in Bootstrap's compiled CSS against the reader's
// `prefers-reduced-motion` setting and against the two options that promise to
// remove it.
// Usage: npm run audit-motion [-- --all | --render]
//
// Every transition, animation and smooth scroll of configs/default is either:
//   - guarded: only declared under `@media (prefers-reduced-motion: no-preference)`
//   - stopped: a `prefers-reduced-motion: reduce` rule sets it to `none` for
//     the same selector
//   - slowed: a `reduce` rule only changes a custom property it reads, like
//     a spinner's speed, so it still moves
//   - uncovered: it moves whatever the reader's setting
// Then two configs are compiled:
//   - configs/no-transitions (`$enable-transitions: false`): any transition
//     left is a leak
//   - configs/no-reduced-motion (`$enable-reduced-motion: false`): any
//     `prefers-reduced-motion` query left ignores the option
// Known findings are listed in scripts/known-motion.mjs. The report only shows
// the others, or all of them with --all. Exits non-zero on a new finding or on
// a known entry that no longer matches anything.
//
// --render opens every kitchen sink page with reduced motion emulated, clicks
// every toggle and focuses every field, and lists what still moves. See
// scripts/lib/render-motion.mjs.

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { bootstrapSource } from './lib/bootstrap.mjs'
import { compileConfig } from './lib/compile.mjs'
import { root } from './lib/configs.mjs'
import known from './known-motion.mjs'
import { renderMotion } from './lib/render-motion.mjs'

// Bugs are tracked, intended findings explained: see "Upstream issue tracking" in CLAUDE.md.
for (const entry of known) {
  if (Boolean(entry.issue) === Boolean(entry.reason)) {
    throw new Error(`scripts/known-motion.mjs: each entry needs either an \`issue\` or a \`reason\`: ${entry.kind} ${entry.selector}`)
  }
}

const showAll = process.argv.includes('--all')
const bootstrap = bootstrapSource(loadEnv('production', root, ''))
const bootstrapDir = bootstrap.dir ?? path.join(root, 'node_modules/bootstrap')
const quiet = { warn() {}, debug() {} }

console.log(`Bootstrap: ${bootstrap.label}\n`)

if (process.argv.includes('--render')) {
  process.exitCode = await renderMotion(known)
  process.exit()
}

const KINDS = {
  uncovered: 'Moves whatever the reader’s setting',
  slowed: 'Slowed, not stopped, under prefers-reduced-motion: reduce',
  transition: 'Left by $enable-transitions: false (configs/no-transitions)',
  query: 'Left by $enable-reduced-motion: false (configs/no-reduced-motion)'
}

// `node_modules/bootstrap/scss/_chip.scss:42` → `bootstrap/scss/_chip.scss:42`
function where(node) {
  const { start, input } = node.source ?? {}
  const origin = start && (input.map ? input.origin(start.line, start.column) : { file: input.file, line: start.line })
  if (!origin?.file) {
    return ''
  }

  const file = origin.file.startsWith('file:') ? fileURLToPath(origin.file) : origin.file
  const shown = file.startsWith(bootstrapDir + path.sep) ? `bootstrap/${path.relative(bootstrapDir, file)}` : path.relative(root, file)
  return `${shown}:${origin.line}`
}

const mediaOf = node => {
  const queries = []
  for (let parent = node.parent; parent && parent.type !== 'root'; parent = parent.parent) {
    if (parent.type === 'atrule' && parent.name === 'media') {
      queries.push(parent.params)
    }
  }

  return queries.join(' and ')
}

const clean = selector => selector.replace(/\s+/g, ' ').trim()

// The family a motion property belongs to, and whether its value moves.
const FAMILY = { transition: 'transition', 'transition-duration': 'transition', 'transition-property': 'transition', animation: 'animation', 'animation-name': 'animation', 'scroll-behavior': 'scroll' }
const STILL = /^(none|0m?s|auto|initial|unset)(\s*!important)?$/

function moves(decl) {
  const family = FAMILY[decl.prop]
  if (!family || STILL.test(decl.value.trim())) {
    return false
  }

  // Longhands count once per rule, on the duration.
  return decl.prop !== 'transition-property' && (family !== 'scroll' || decl.value.includes('smooth'))
}

const compile = async name => (await compileConfig(path.join(root, 'configs', name, 'main.scss'), { bootstrapDir, logger: quiet, sourceMap: true })).root

const findings = []
const counts = { guarded: 0, stopped: 0, slowed: 0, uncovered: 0 }

// --- configs/default: each motion against prefers-reduced-motion ------------

const css = await compile('default')

// What `reduce` rules set, by selector: `.placeholder-wave` → { animation: 'none' }.
const reduced = new Map()
css.walkRules(rule => {
  if (/prefers-reduced-motion:\s*reduce/.test(mediaOf(rule))) {
    for (const selector of rule.selectors) {
      const set = reduced.get(clean(selector)) ?? {}
      rule.each(node => {
        if (node.type === 'decl') {
          set[node.prop] = node.value
        }
      })
      reduced.set(clean(selector), set)
    }
  }
})

css.walkDecls(decl => {
  const rule = decl.parent
  if (rule.type !== 'rule' || !moves(decl)) {
    return
  }

  const media = mediaOf(decl)
  if (/prefers-reduced-motion:\s*no-preference/.test(media)) {
    counts.guarded++
    return
  }

  if (/prefers-reduced-motion:\s*reduce/.test(media)) {
    return
  }

  const family = FAMILY[decl.prop]
  const overrides = rule.selectors.map(selector => reduced.get(clean(selector)) ?? {})
  const stops = set => Object.entries(set).some(([prop, value]) => FAMILY[prop] === family && STILL.test(value.trim()))
  if (overrides.every(stops)) {
    counts.stopped++
    return
  }

  // A `reduce` rule that changes a custom property the value reads.
  const reads = [...decl.value.matchAll(/var\(\s*(--[\w-]+)/g)].map(match => match[1])
  const kind = overrides.every(set => Object.keys(set).some(prop => reads.includes(prop))) ? 'slowed' : 'uncovered'
  counts[kind]++
  findings.push({ kind, selector: clean(rule.selector), prop: decl.prop, value: decl.value.replace(/\s+/g, ' '), where: where(decl), infinite: /\binfinite\b/.test(decl.value) })
})

// --- configs/no-transitions: nothing may transition ------------------------

const noTransitions = await compile('no-transitions')
let transitionsLeft = 0
noTransitions.walkDecls(decl => {
  if (decl.parent.type === 'rule' && FAMILY[decl.prop] === 'transition' && moves(decl)) {
    transitionsLeft++
    findings.push({ kind: 'transition', selector: clean(decl.parent.selector), prop: decl.prop, value: decl.value.replace(/\s+/g, ' '), where: where(decl) })
  }
})

// --- configs/no-reduced-motion: no prefers-reduced-motion query ------------

const noReducedMotion = await compile('no-reduced-motion')
let queriesLeft = 0
noReducedMotion.walkAtRules('media', rule => {
  if (!/prefers-reduced-motion/.test(rule.params)) {
    return
  }

  queriesLeft++
  rule.walkRules(inner => {
    const decls = inner.nodes.filter(node => node.type === 'decl')
    if (decls.length) {
      findings.push({ kind: 'query', selector: clean(inner.selector), prop: `@media ${rule.params}`, value: decls.map(decl => decl.prop).join(', '), where: where(decls[0]) })
    }
  })
})

// --- Report -----------------------------------------------------------------

const matches = (entry, finding) => entry.kind === finding.kind &&
  (entry.selector instanceof RegExp ? entry.selector.test(finding.selector) : finding.selector.includes(entry.selector))
const entryOf = finding => known.find(entry => matches(entry, finding))
const used = new Set(findings.map(entryOf).filter(Boolean))
const fresh = findings.filter(finding => !entryOf(finding))

console.log(`configs/default: ${Object.values(counts).reduce((a, b) => a + b, 0)} transitions, animations and smooth scrolls`)
console.log(`  ${counts.guarded} guarded, ${counts.stopped} stopped, ${counts.slowed} slowed, ${counts.uncovered} uncovered under prefers-reduced-motion: reduce`)
console.log(`configs/no-transitions: ${transitionsLeft} transitions left`)
console.log(`configs/no-reduced-motion: ${queriesLeft} prefers-reduced-motion queries left`)
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
    const note = entry ? `  (${entry.issue ? `#${entry.issue}` : entry.reason})` : ''
    console.log(`    ${finding.prop}: ${finding.value.length > 90 ? `${finding.value.slice(0, 87)}…` : finding.value}${finding.infinite ? '  [infinite]' : ''}${note}`)
    console.log(`      ${finding.selector.length > 100 ? `${finding.selector.slice(0, 97)}…` : finding.selector}`)
    console.log(`      ${finding.where}`)
  }
}

const stale = known.filter(entry => entry.kind in KINDS && !used.has(entry))
for (const entry of stale) {
  console.log(`\n✗ Known entry no longer found, remove it from scripts/known-motion.mjs: ${entry.kind} ${entry.selector}${entry.issue ? ` (#${entry.issue})` : ''}`)
  if (entry.issue) {
    console.log(`  If Bootstrap fixed it, mark #${entry.issue} \`upstream-fixed\` and close it (step 3 of "Upstream issue tracking" in CLAUDE.md).`)
  }
}

if (fresh.length) {
  console.log('\nFor each new finding: if it’s a Bootstrap bug, open a tracking issue in this repository labeled `upstream`')
  console.log('(see "Upstream issue tracking" in CLAUDE.md), then add it to scripts/known-motion.mjs with `issue: <n>`.')
  console.log('If it’s intended, add it with a `reason`.')
}

process.exitCode = fresh.length || stale.length ? 1 : 0
