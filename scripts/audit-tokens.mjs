#!/usr/bin/env node
// Audits the `--bs-*` custom properties of every config's compiled CSS: the
// working copy, configs/<name>/ and issues/<name>/, each with its tokens.css.
// Usage: npm run audit-tokens [-- --all]
//
// Four kinds of findings, each with the Sass file and line that causes it:
//   - undefined: read without a fallback and never defined, so the whole
//     declaration is dropped. Usually a bug, like a renamed token.
//   - hook: read with a fallback and never defined. An intended hook, listed so
//     a new one stands out.
//   - unused: defined and never read.
//   - foreign: defined only on component selectors, and read on a selector
//     that shares no class family with any of them (`.chip` vs `.nav-link`).
//     Often intended composition, like `.combobox-toggle.form-control`.
// Known findings are listed in scripts/known-tokens.mjs. The report only shows
// the others, or all of them with --all. Exits non-zero when there is a new
// finding or when a known one no longer happens anywhere.
// Tokens are named like in the Sass source, without the `bs-` prefix.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { bootstrapSource } from './lib/bootstrap.mjs'
import { compileConfig, processCss } from './lib/compile.mjs'
import { root, styleFolders } from './lib/configs.mjs'
import known from './known-tokens.mjs'

// Bugs are tracked, intended findings explained: see "Upstream issue tracking" in CLAUDE.md.
for (const entry of known) {
  if (Boolean(entry.issue) === Boolean(entry.reason)) {
    throw new Error(`scripts/known-tokens.mjs: each entry needs either an \`issue\` or a \`reason\`: ${entry.tokens?.join(', ') ?? entry.pattern}`)
  }
}

const showAll = process.argv.includes('--all')
const bootstrap = bootstrapSource(loadEnv('production', root, ''))
const bootstrapDir = bootstrap.dir ?? path.join(root, 'node_modules/bootstrap')
const quiet = { warn() {}, debug() {} }

const KINDS = {
  undefined: 'Read without a fallback, never defined',
  hook: 'Read with a fallback, never defined',
  unused: 'Defined, never read',
  foreign: 'Defined on a component, read on an unrelated selector'
}

const unprefix = name => name.replace(/^--bs-/, '--')

// `node_modules/bootstrap/scss/_chip.scss:42` → `bootstrap/scss/_chip.scss:42`
function where(node) {
  const { start, input } = node.source ?? {}
  if (!start) {
    return ''
  }

  const origin = input.map ? input.origin(start.line, start.column) : { file: input.file, line: start.line }
  if (!origin?.file) {
    return ''
  }

  const file = origin.file.startsWith('file:') ? fileURLToPath(origin.file) : origin.file
  const shown = file.startsWith(bootstrapDir + path.sep) ? `bootstrap/${path.relative(bootstrapDir, file)}` : path.relative(root, file)
  return `${shown}:${origin.line}`
}

// Token maps are written out by one mixin, so a definition's source map points
// to `mixins/_tokens.scss`. Point to the map entry (`--chip-bg: …,`) instead.
const declarations = new Map()
for (const dir of [path.join(bootstrapDir, 'scss'), ...styleFolders()]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || !/\.(scss|css)$/.test(entry.name)) {
      continue
    }

    const file = path.join(entry.parentPath, entry.name)
    for (const [index, line] of fs.readFileSync(file, 'utf8').split('\n').entries()) {
      const name = line.match(/^\s*(--[\w-]+)\s*:/)?.[1]
      if (name && !declarations.has(unprefix(name))) {
        declarations.set(unprefix(name), where({ source: { start: { line: index + 1 }, input: { file } } }))
      }
    }
  }
}

const definedAt = (token, node) => {
  const at = where(node)
  return at.includes('/mixins/') ? declarations.get(token) ?? at : at
}

// The selector a declaration applies to, or the at-rule it sits in.
const selectorOf = node => (node.parent?.type === 'rule' ? node.parent.selector.replace(/\s+/g, ' ') : node.parent?.type === 'atrule' ? `@${node.parent.name} ${node.parent.params}` : '')

// Selectors that make a token global: `:root`, `:host`, color modes and theme
// helpers, which exist to set tokens for whatever sits inside them.
const GLOBAL_SELECTOR = /:root|:host|\[data-bs-theme|\.theme-|^html|^body|^\*|@property/

// Class families: `.accordion-sm` and `.accordion-header` are both `accordion`,
// `.md\:table-stacked` and `.\32 xl\:table-stacked` are `table`.
const familiesOf = selector => [...selector.replace(/\\[\da-f]{1,6} ?/gi, '0').replace(/\\:/g, '|').matchAll(/\.([\w|-]+)/g)]
  .map(match => match[1].replace(/^.*\|/, '').split('-')[0])

function analyze(roots) {
  const defined = new Map()
  const reads = new Map()
  const add = (map, name, entry) => map.set(name, [...(map.get(name) ?? []), entry])

  for (const root of roots) {
    root.walkAtRules('property', rule => add(defined, unprefix(rule.params.trim()), { selector: '@property', where: where(rule) }))
    root.walkDecls(decl => {
      if (decl.prop.startsWith('--')) {
        add(defined, unprefix(decl.prop), { selector: selectorOf(decl), where: definedAt(unprefix(decl.prop), decl) })
      }

      // `var(--a, var(--b))`: --a has a fallback, --b doesn't.
      for (const [, name, comma] of decl.value.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) {
        add(reads, unprefix(name), { fallback: Boolean(comma), selector: selectorOf(decl), where: where(decl) })
      }
    })
  }

  const findings = []
  for (const [token, list] of reads) {
    if (!defined.has(token)) {
      const kind = list.some(read => !read.fallback) ? 'undefined' : 'hook'
      findings.push({ kind, token, places: list.filter(read => kind === 'hook' || !read.fallback) })
    }
  }

  for (const [token, list] of defined) {
    if (!reads.has(token)) {
      findings.push({ kind: 'unused', token, places: list })
      continue
    }

    if (list.some(definition => GLOBAL_SELECTOR.test(definition.selector))) {
      continue
    }

    const families = new Set(list.flatMap(definition => familiesOf(definition.selector)))
    const foreign = reads.get(token).filter(read => {
      const readFamilies = familiesOf(read.selector)
      return readFamilies.length && !readFamilies.some(family => families.has(family))
    })
    if (foreign.length) {
      findings.push({ kind: 'foreign', token, places: foreign, definedOn: [...new Set(list.map(definition => definition.selector))] })
    }
  }

  return findings.sort((a, b) => a.token.localeCompare(b.token))
}

const matches = (entry, finding) => entry.kind === finding.kind &&
  (entry.tokens?.includes(finding.token) || entry.pattern?.test(finding.token))

async function audit(folder) {
  const { root: main } = await compileConfig(path.join(folder, 'main.scss'), { bootstrapDir, logger: quiet, sourceMap: true })
  const tokensFile = path.join(folder, 'tokens.css')
  const roots = [main]
  if (fs.existsSync(tokensFile)) {
    roots.push((await processCss(fs.readFileSync(tokensFile, 'utf8'), tokensFile)).root)
  }

  return analyze(roots)
}

function printFinding({ token, places, definedOn }, reason) {
  console.log(`    ${token}${reason ? `  (${reason})` : ''}`)
  if (definedOn) {
    console.log(`      defined on ${definedOn.slice(0, 3).join(' | ')}${definedOn.length > 3 ? ' | …' : ''}`)
  }

  const shown = [...new Map(places.map(place => [`${place.selector} ${place.where}`, place])).values()]
  for (const { selector, where: at } of shown.slice(0, 3)) {
    console.log(`      ${selector}${at ? `  ${at}` : ''}`)
  }

  if (shown.length > 3) {
    console.log(`      … ${shown.length - 3} more`)
  }
}

console.log(`Bootstrap: ${bootstrap.label}\n`)

const used = new Set()
let problems = 0

for (const folder of styleFolders()) {
  const name = path.relative(root, folder)
  const findings = await audit(folder)
  const entryOf = finding => known.find(entry => matches(entry, finding))
  for (const finding of findings) {
    const entry = entryOf(finding)
    if (entry) {
      used.add(entry)
    }
  }

  const fresh = findings.filter(finding => !entryOf(finding))
  problems += fresh.length
  const listed = showAll ? findings : fresh
  console.log(`${fresh.length ? '✗' : '✓'} ${name}: ${fresh.length} new, ${findings.length - fresh.length} known`)

  for (const [kind, label] of Object.entries(KINDS)) {
    const group = listed.filter(finding => finding.kind === kind)
    if (group.length) {
      console.log(`  ${label} (${kind}): ${group.length}`)
      for (const finding of group) {
        const entry = entryOf(finding)
        printFinding(finding, entry && (entry.issue ? `#${entry.issue}` : entry.reason))
      }
    }
  }
}

const stale = known.filter(entry => !used.has(entry))
for (const entry of stale) {
  console.log(`\n✗ Known entry no longer found anywhere, remove it from scripts/known-tokens.mjs: ${entry.kind} ${entry.tokens?.join(', ') ?? entry.pattern}${entry.issue ? ` (#${entry.issue})` : ''}`)
  if (entry.issue) {
    console.log(`  If Bootstrap fixed it, mark #${entry.issue} \`upstream-fixed\` and close it (step 3 of "Upstream issue tracking" in CLAUDE.md).`)
  }
}

if (problems) {
  console.log('\nFor each new finding: if it’s a Bootstrap bug, open a tracking issue in this repository labeled `upstream`')
  console.log('(see "Upstream issue tracking" in CLAUDE.md), then add it to scripts/known-tokens.mjs with `issue: <n>`.')
  console.log('If it’s intended, add it with a `reason`.')
}

process.exitCode = problems || stale.length ? 1 : 0
