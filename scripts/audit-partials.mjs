#!/usr/bin/env node
// Audits the docs' "Option B: Include parts of Bootstrap" (customize/sass):
// root first, then only some partials. Compiles every partial alone after
// `root` and maps what it needs from the others, then checks that `with (...)`
// reaches the entry points Option B uses. configs/partial/ is Option B as the
// docs write it.
// Usage: npm run audit-partials [-- --all]
//
// Findings:
//   - error: a partial doesn't compile after `root` alone
//   - needs: a partial reads, without a fallback, tokens that only another
//     partial defines. Left out, the declaration is dropped. Tokens that no
//     partial defines, even in the full build, are audit-tokens' findings.
//   - with: `@use … with (…)` doesn't reach an entry point
// Known findings are listed in scripts/known-partials.mjs. The report only
// shows the others, or all of them with --all. Exits non-zero on a new
// finding or on a known entry that no longer matches anything.

import fs from 'node:fs'
import path from 'node:path'
import * as sass from 'sass-embedded'
import { loadEnv } from 'vite'
import { bootstrapSource } from './lib/bootstrap.mjs'
import { compileSource } from './lib/compile.mjs'
import { root } from './lib/configs.mjs'
import known from './known-partials.mjs'

// Bugs are tracked, intended findings explained: see "Upstream issue tracking" in CLAUDE.md.
for (const entry of known) {
  if (Boolean(entry.issue) === Boolean(entry.reason)) {
    throw new Error(`scripts/known-partials.mjs: each entry needs either an \`issue\` or a \`reason\`: ${entry.partial} needs ${entry.needs}`)
  }
}

const showAll = process.argv.includes('--all')
const bootstrap = bootstrapSource(loadEnv('production', root, ''))
const bootstrapDir = bootstrap.dir ?? path.join(root, 'node_modules/bootstrap')
const scssDir = path.join(bootstrapDir, 'scss')
const quiet = { warn() {}, debug() {} }

// `_alert.scss` → alert, `forms/_check.scss` → forms/check, `forms/index.scss`
// → forms. Mixins, vendored code, the entry points (bootstrap.scss…) and root
// itself aren't partials to load after root.
const partials = fs.readdirSync(scssDir, { withFileTypes: true, recursive: true })
  .filter(entry => entry.isFile() && entry.name.endsWith('.scss'))
  .map(entry => path.relative(scssDir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
  .filter(file => !/^(mixins|vendor)\//.test(file) && !/^bootstrap(-[\w-]+)?\.scss$/.test(file))
  .map(file => file.replace(/(^|\/)_/, '$1').replace(/\.scss$/, '').replace(/\/index$/, ''))
  .filter(name => name !== 'root')
  .sort()

// Custom properties defined, and read without a fallback, in compiled CSS.
const defined = css => new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]))
const readBare = css => new Set([...css.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)].map(match => match[1]))

const compiler = await sass.initAsyncCompiler()
const compile = source => compileSource(source, { bootstrapDir, logger: quiet, compiler })

const rootCss = (await compile('@use "bootstrap/scss/root";')).css
const rootTokens = defined(rootCss)
const fullTokens = defined((await compile('@use "bootstrap/scss/bootstrap";')).css)

// Each partial alone after root: its compile error, the tokens it defines
// beyond root's, and the ones it reads bare without defining them.
const results = new Map()
for (const name of partials) {
  try {
    const { css } = await compile(`@use "bootstrap/scss/root";\n@use "bootstrap/scss/${name}";`)
    const tokens = defined(css)
    results.set(name, {
      own: new Set([...tokens].filter(token => !rootTokens.has(token))),
      missing: [...readBare(css)].filter(token => !tokens.has(token) && fullTokens.has(token))
    })
  } catch (error) {
    results.set(name, { error: error.message.split('\n')[0] })
  }
}

// Where a token comes from: the partials that define it, files rather than
// the folder index that forwards them (forms/form-control, not forms).
function providers(token) {
  const found = [...results].filter(([, result]) => result.own?.has(token)).map(([name]) => name)
  return found.filter(name => !found.some(other => other.startsWith(`${name}/`)))
}

const findings = []
for (const [name, result] of results) {
  if (result.error) {
    findings.push({ kind: 'error', partial: name, detail: result.error })
    continue
  }

  const byProvider = new Map()
  for (const token of result.missing) {
    for (const provider of providers(token)) {
      byProvider.set(provider, [...(byProvider.get(provider) ?? []), token])
    }
  }

  for (const [provider, tokens] of byProvider) {
    findings.push({ kind: 'needs', partial: name, needs: provider, detail: tokens.sort().join(', ') })
  }
}

// `with (…)` on the entry points Option B uses, in the order Sass allows:
// config and theme before root loads them, a partial's own maps on it.
const utility = '("cursor": (property: cursor, class: cursor, values: (pointer: pointer)))'
const WITH_CASES = [
  ['config, before root', '@use "bootstrap/scss/config" with ($spacer: 2rem);\n@use "bootstrap/scss/root";', /--bs-spacer: 2rem/],
  ['theme, before root', '@use "bootstrap/scss/theme" with ($theme-colors: ("brand": ("base": red, "fg": red, "fg-emphasis": red, "bg": red, "bg-subtle": red, "bg-muted": red, "border": red, "focus-ring": red, "contrast": white)));\n@use "bootstrap/scss/root";\n@use "bootstrap/scss/helpers";', /\.theme-brand\b/],
  ['root, $root-tokens', '@use "bootstrap/scss/root" with ($root-tokens: (--border-width: 3px));', /--bs-border-width: 3px/],
  ['a component, its token map', '@use "bootstrap/scss/root";\n@use "bootstrap/scss/alert" with ($alert-tokens: (--alert-padding-x: 2rem));', /--bs-alert-padding-x: 2rem/],
  ['a folder index, a file\'s token map', '@use "bootstrap/scss/root";\n@use "bootstrap/scss/buttons" with ($button-tokens: (--btn-padding-x: 2rem));', /--bs-btn-padding-x: 2rem/],
  ['utilities, before utilities/api', `@use "bootstrap/scss/utilities" with ($utilities: ${utility});\n@use "bootstrap/scss/root";\n@use "bootstrap/scss/utilities/api";`, /\.cursor-pointer\b/]
]

const withResults = []
for (const [label, source, expected] of WITH_CASES) {
  try {
    const { css } = await compile(source)
    withResults.push({ label, pass: expected.test(css) })
    if (!expected.test(css)) {
      findings.push({ kind: 'with', partial: label, detail: 'compiles, but the value doesn’t reach the CSS' })
    }
  } catch (error) {
    withResults.push({ label, pass: false })
    findings.push({ kind: 'with', partial: label, detail: error.message.split('\n')[0] })
  }
}

await compiler.dispose()

// --- Report -------------------------------------------------------------------

const matches = (entry, finding) => entry.kind === finding.kind && entry.partial === finding.partial && (entry.needs ?? null) === (finding.needs ?? null)
const knownOf = finding => known.find(entry => matches(entry, finding))

console.log(`Bootstrap: ${bootstrap.label}\n`)
console.log(`${partials.length} partials after root: ${[...results.values()].filter(result => result.error).length} don't compile, ${findings.filter(finding => finding.kind === 'needs').length} dependencies`)
console.log(`with (…): ${withResults.filter(result => result.pass).length}/${withResults.length} entry points\n`)

const shown = findings.filter(finding => showAll || !knownOf(finding))
for (const finding of shown) {
  const entry = knownOf(finding)
  const label = entry ? (entry.issue ? `known, #${entry.issue}` : `known: ${entry.reason}`) : 'new'
  const what = finding.kind === 'needs' ? `${finding.partial} needs ${finding.needs}` : `${finding.partial} (${finding.kind})`
  console.log(`  ${entry ? '·' : '✗'} ${what}: ${finding.detail}  [${label}]`)
}

const fresh = findings.filter(finding => !knownOf(finding))
const stale = known.filter(entry => !findings.some(finding => matches(entry, finding)))
for (const entry of stale) {
  console.log(`  ✗ known entry no longer happens: ${entry.partial}${entry.needs ? ` needs ${entry.needs}` : ''} (${entry.kind})${entry.issue ? `, #${entry.issue}` : ''}`)
}

if (fresh.length === 0 && stale.length === 0) {
  console.log(`✓ ${findings.length} known, 0 new`)
} else {
  console.log(`\n${fresh.length} new, ${stale.length} stale. For a Bootstrap bug, open a tracking issue labeled \`upstream\` (see "Upstream issue tracking" in CLAUDE.md) and list it in scripts/known-partials.mjs with \`issue: <n>\`; for an intended dependency, with a \`reason\`. When an entry no longer happens, remove it.`)
  process.exitCode = 1
}
