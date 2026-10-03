#!/usr/bin/env node
// Creates issues/<name>/ from the issue template and a config's style files.
// Usage: npm run new-issue <name> [-- --config <config>] [--from <page>#<id>] [--spec]
//   <name> is an upstream issue number (42928) or any slug (pg-12, menu-focus).
//   --config defaults to `default` (Bootstrap's defaults); `working` copies src/styles/.
//   --from copies a kitchen sink example into the reproduction:
//   `kitchen-sink/components-tooltip.html#placement`, `components-tooltip#placement`
//   or its URL in the playground.
//   --spec adds a repro.spec.js from the template, a Playwright spec for a bug
//   that needs the keyboard or the viewport (see tests/issues/fixtures.js).
// To start from an upstream issue's own code, see import-issue.mjs.

import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { fail, root } from './lib/configs.mjs'
import { outDir as kitchenSinkDir, readExample } from './lib/kitchen-sink.mjs'
import { fromExample, isValidName, renderTemplate, resolveTarget, writeReproduction } from './lib/reproduction.mjs'

const USAGE = 'Usage: npm run new-issue <number-or-slug> [-- --config <config>] [--from <kitchen-sink page>#<id>] [--spec]   (e.g. npm run new-issue 42928)'

let values
let positionals
try {
  ({ values, positionals } = parseArgs({
    options: { config: { type: 'string', default: 'default' }, from: { type: 'string' }, spec: { type: 'boolean', default: false } },
    allowPositionals: true
  }))
} catch (error) {
  fail(`${error.message}\n${USAGE}`)
}

const configName = values.config
const name = positionals[0]?.replace(/^#/, '')

if (!isValidName(name)) {
  fail(USAGE)
}

const { sourceDir, targetDir } = resolveTarget(name, configName)

// `--from`: the kitchen sink example, read before anything is written.
let example
if (values.from) {
  const [location, id] = values.from.split('#')
  const page = path.basename(location.replace(/[?].*$/, ''), '.html')
  const file = path.join(kitchenSinkDir, `${page}.html`)
  if (!id || !page || !fs.existsSync(file)) {
    fail(`--from takes a kitchen sink page and an example id, like kitchen-sink/components-tooltip.html#placement. "${values.from}" isn't one.`)
  }

  example = readExample(fs.readFileSync(file, 'utf8'), id)
  if (example.ids) {
    fail(`kitchen-sink/${page}.html has no example "${id}". Its examples: ${example.ids.join(', ')}`)
  }

  example.url = `/kitchen-sink/${page}.html#${id}`
}

let html = renderTemplate(name)
if (example) {
  html = fromExample(html, example)
}

writeReproduction({ sourceDir, targetDir, html })
if (values.spec) {
  const spec = fs.readFileSync(path.join(root, 'scripts/templates/issue/repro.spec.js'), 'utf8').replaceAll('__NAME__', name)
  fs.writeFileSync(path.join(targetDir, 'repro.spec.js'), spec)
}

console.log(`Created issues/${name}/ from the "${configName}" config${example ? `, with the example ${example.url.slice(1)}` : ''}${values.spec ? ', with a repro.spec.js to fill in' : ''}`)
console.log(`Open http://localhost:5173/issues/${name}/ with \`npm run dev\``)
