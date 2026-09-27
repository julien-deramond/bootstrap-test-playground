#!/usr/bin/env node
// Checks that the playground's default CSS matches Bootstrap's committed
// `dist/css/bootstrap.css`, which the README promises and which makes findings
// here transferable upstream.
// Usage: npm run check-dist
//
// Compiles `configs/default/main.scss` the way Vite does and compares it with
// the dist, rule by rule, once both are normalized (comments, banner, source
// map and formatting removed). When BOOTSTRAP_PATH points to a checkout with
// its dependencies installed, it also compiles `scss/bootstrap.scss` with that
// checkout's own Sass and `build/postcss.config.mjs`, to tell which side moved:
//   - pipeline drift: the playground compiles differently from Bootstrap's build
//   - dist drift: the source moved and the committed dist wasn't rebuilt
// Normalized files and full diffs go to reports/dist/. Exits non-zero on drift.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import postcss from 'postcss'
import { loadEnv } from 'vite'
import { bootstrapSource } from './lib/bootstrap.mjs'
import { compileConfig } from './lib/compile.mjs'
import { configDir, root } from './lib/configs.mjs'

const bootstrap = bootstrapSource(loadEnv('production', root, ''))
const bootstrapDir = bootstrap.dir ?? path.join(root, 'node_modules/bootstrap')
const distFile = path.join(bootstrapDir, 'dist/css/bootstrap.css')
const reportDir = path.join(root, 'reports/dist')
const quiet = { warn() {}, debug() {} }

// One declaration or rule per line, indented by nesting, so a line diff reads
// like a CSS diff.
function normalize(css) {
  const lines = []
  const write = (node, depth) => {
    const indent = '  '.repeat(depth)
    if (node.type === 'decl') {
      lines.push(`${indent}${node.prop}: ${node.value.replace(/\s+/g, ' ').trim()}${node.important ? ' !important' : ''};`)
    } else if (node.type === 'rule' || (node.type === 'atrule' && node.name !== 'charset')) {
      const head = node.type === 'rule' ?
        node.selectors.map(selector => selector.replace(/\s+/g, ' ').trim()).join(', ') :
        `@${node.name} ${node.params.replace(/\s+/g, ' ').trim()}`.trim()
      if (node.nodes?.length === 0) {
        // Like the `@layer custom {}` an empty _custom.scss produces. The
        // `@layer …;` statement at the top already fixes the layer order.
        return
      }

      if (node.nodes) {
        lines.push(`${indent}${head} {`)
        node.each(child => write(child, depth + 1))
        lines.push(`${indent}}`)
      } else {
        lines.push(`${indent}${head};`)
      }
    }
  }

  postcss.parse(css).each(node => write(node, 0))
  return `${lines.join('\n')}\n`
}

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

// Bootstrap's own build (`npm run css-compile css-prefix`), with the
// checkout's Sass and PostCSS config. Needs its node_modules.
async function referenceBuild() {
  const config = path.join(bootstrapDir, 'build/postcss.config.mjs')
  if (!bootstrap.dir) {
    return { skipped: 'set BOOTSTRAP_PATH to a Bootstrap checkout to find out' }
  }

  if (!fs.existsSync(config)) {
    return { skipped: `${bootstrapDir} has no build/postcss.config.mjs` }
  }

  let sass
  try {
    sass = createRequire(path.join(bootstrapDir, 'package.json'))('sass')
  } catch {
    return { skipped: `${bootstrapDir} has no node_modules: run \`npm install\` there` }
  }

  const { css } = sass.compile(path.join(bootstrapDir, 'scss/bootstrap.scss'), { style: 'expanded', logger: quiet })
  const { default: makeConfig } = await import(pathToFileURL(config))
  const { plugins } = makeConfig({ file: { dirname: path.dirname(distFile) } })
  return { css: (await postcss(plugins).process(css, { from: distFile })).css }
}

console.log(`Bootstrap: ${bootstrap.label}\n`)
fs.mkdirSync(reportDir, { recursive: true })

const playground = save('playground', 'playground (configs/default)',
  (await compileConfig(path.join(configDir('default'), 'main.scss'), { bootstrapDir, logger: quiet })).css)
const dist = save('dist', 'dist/css/bootstrap.css', fs.readFileSync(distFile, 'utf8'))
const reference = await referenceBuild()

let drift
if (reference.skipped) {
  const result = compare('playground-vs-dist', playground, dist)
  print('playground vs dist', result)
  drift = !result.identical
  if (drift) {
    console.log(`\nCan't tell whether the playground's pipeline or the dist moved: ${reference.skipped}.`)
  }
} else {
  const build = save('build', 'Bootstrap build (scss/bootstrap.scss)', reference.css)
  const pipeline = compare('pipeline', build, playground)
  const stale = compare('dist', dist, build)
  print('pipeline (playground vs Bootstrap’s build)', pipeline)
  print('dist (committed dist vs Bootstrap’s build)', stale)
  drift = !pipeline.identical || !stale.identical
  if (!stale.identical) {
    console.log('\nThe committed dist is out of date upstream: open a tracking issue in this repository labeled `upstream`,')
    console.log('unless one exists (see "Upstream issue tracking" in CLAUDE.md).')
  }
}

process.exitCode = drift ? 1 : 0
