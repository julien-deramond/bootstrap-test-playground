#!/usr/bin/env node
// Checks that the playground compiles Bootstrap the way Bootstrap's own build
// does, which docs/bootstrap.md promises and which makes findings here
// transferable upstream.
// Usage: npm run check-dist
//
// Compiles `configs/default/main.scss` the way Vite does and compares it with
// `dist/css/bootstrap.css` as Bootstrap's build makes it from the same commit
// (scripts/lib/dist.mjs: its own npm scripts and `build/postcss.config.mjs`),
// rule by rule, once both are normalized (comments, banner, source map and
// formatting removed). Not with the committed dist: Bootstrap only rebuilds it
// for releases, so between two it lags behind the source. A difference means
// the playground's pipeline (postcss.config.js, compile.mjs) moved away from
// Bootstrap's build. Normalized files and the full diff go to reports/dist/.
// Exits non-zero on drift.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'
import { loadEnv } from 'vite'
import { bootstrapSource } from './lib/bootstrap.mjs'
import { compileConfig } from './lib/compile.mjs'
import { buildDist } from './lib/dist.mjs'
import { normalizeCss as normalize } from './lib/normalize-css.mjs'
import { configDir, root } from './lib/configs.mjs'

const bootstrap = bootstrapSource(loadEnv('production', root, ''))
const bootstrapDir = bootstrap.dir ?? path.join(root, 'node_modules/bootstrap')
const reportDir = path.join(root, 'reports/dist')
const quiet = { warn() {}, debug() {} }

// Every block that holds declarations, keyed by where it sits
// (`@layer components > @media (…) > .btn`) and its occurrence there.
function blocks(normalized) {
  const map = new Map()
  const seen = new Map()
  const walk = (container, context) => container.each(node => {
    if (node.type !== 'rule' && node.type !== 'atrule') {
      return
    }

    const head = node.type === 'rule' ? node.selector : `@${node.name} ${node.params}`.trim()
    const decls = node.nodes?.filter(child => child.type === 'decl').map(child => child.toString()) ?? []
    const where = [...context, head].join(' > ')
    if (decls.length || !node.nodes) {
      const count = (seen.get(where) ?? 0) + 1
      seen.set(where, count)
      map.set(count > 1 ? `${where} (#${count})` : where, decls.join('; '))
    }

    if (node.nodes) {
      walk(node, [...context, head])
    }
  })

  walk(postcss.parse(normalized), [])
  return map
}

function compare(name, a, b) {
  const [before, after] = [blocks(a.css), blocks(b.css)]
  const changed = [...after.keys()].filter(key => before.has(key) && before.get(key) !== after.get(key))
  const groups = [
    ['changed', changed],
    [`only in ${a.name}`, [...before.keys()].filter(key => !after.has(key))],
    [`only in ${b.name}`, [...after.keys()].filter(key => !before.has(key))]
  ]

  const diffFile = path.join(reportDir, `${name}.diff`)
  let diff = ''
  try {
    execFileSync('diff', ['-u', '--label', a.label, '--label', b.label, a.file, b.file], { encoding: 'utf8' })
  } catch (error) {
    diff = error.stdout
  }

  fs.writeFileSync(diffFile, diff)
  return { identical: a.css === b.css, groups, diffFile }
}

function print(title, { identical, groups, diffFile }) {
  if (identical) {
    console.log(`✓ ${title}: no drift`)
    return
  }

  const counts = groups.filter(([, keys]) => keys.length).map(([label, keys]) => `${keys.length} ${label}`).join(', ')
  console.log(`✗ ${title}: ${counts || 'same rules, in a different order'}`)
  for (const [label, keys] of groups) {
    for (const key of keys.slice(0, 10)) {
      console.log(`    ${label}: ${key}`)
    }

    if (keys.length > 10) {
      console.log(`    … ${keys.length - 10} more ${label}`)
    }
  }

  console.log(`    full diff: ${path.relative(root, diffFile)}`)
}

function save(name, label, css) {
  const file = path.join(reportDir, `${name}.css`)
  fs.writeFileSync(file, normalize(css))
  return { name, file, label, css: fs.readFileSync(file, 'utf8') }
}

console.log(`Bootstrap: ${bootstrap.label}\n`)
fs.rmSync(reportDir, { recursive: true, force: true })
fs.mkdirSync(reportDir, { recursive: true })

const distFile = path.join(await buildDist(bootstrapDir), 'dist/css/bootstrap.css')
const build = save('build', 'Bootstrap build (dist/css/bootstrap.css)', fs.readFileSync(distFile, 'utf8'))
const playground = save('playground', 'playground (configs/default)',
  (await compileConfig(path.join(configDir('default'), 'main.scss'), { bootstrapDir, logger: quiet })).css)
const result = compare('pipeline', build, playground)
print('playground vs Bootstrap’s build', result)
if (!result.identical) {
  console.log('\nThe playground no longer compiles Bootstrap like its build: bring postcss.config.js in line with')
  console.log('Bootstrap\'s build/postcss.config.mjs (see "Checking the dist" in docs/audits.md).')
}

process.exitCode = result.identical ? 0 : 1
