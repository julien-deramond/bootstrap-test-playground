#!/usr/bin/env node
// Creates issues/<name>/ from the issue template and a config's style files.
// Usage: npm run new-issue <name> [-- --config <config>] [--from <page>#<id>]
//   <name> is an upstream issue number (42928) or any slug (pg-12, menu-focus).
//   --config defaults to `default` (Bootstrap's defaults); `working` copies src/styles/.
//   --from copies a kitchen sink example into the reproduction:
//   `kitchen-sink/components-tooltip.html#placement`, `components-tooltip#placement`
//   or its URL in the playground.

import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { loadEnv } from 'vite'
import { bootstrapSource } from './lib/bootstrap.mjs'
import { NAME_PATTERN, configDir, copyStyles, fail, listConfigs, root, workingDir } from './lib/configs.mjs'
import { outDir as kitchenSinkDir, readExample } from './lib/kitchen-sink.mjs'

// Tracking issues live in this repository.
const TRACKING_REPO = 'julien-deramond/bootstrap-test-playground'

const USAGE = 'Usage: npm run new-issue <number-or-slug> [-- --config <config>] [--from <kitchen-sink page>#<id>]   (e.g. npm run new-issue 42928)'

let values
let positionals
try {
  ({ values, positionals } = parseArgs({
    options: { config: { type: 'string', default: 'default' }, from: { type: 'string' } },
    allowPositionals: true
  }))
} catch (error) {
  fail(`${error.message}\n${USAGE}`)
}

const configName = values.config
const name = positionals[0]?.replace(/^#/, '')

if (!name || !NAME_PATTERN.test(name)) {
  fail(USAGE)
}

const sourceDir = configName === 'working' ? workingDir : configDir(configName)
if (!configName || !fs.existsSync(path.join(sourceDir, 'main.scss'))) {
  fail(`Unknown config "${configName}". Available: working, ${listConfigs().map(config => config.name).join(', ')}`)
}

const targetDir = path.join(root, 'issues', name)
if (fs.existsSync(targetDir)) {
  fail(`issues/${name}/ already exists.`)
}

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

// `42928`: an upstream issue, so reported. `pg-12`: tracked here, not reported
// yet. Any other slug: neither, until the page's metadata says otherwise.
const isUpstream = /^\d+$/.test(name)
const tracking = name.match(/^pg-(\d+)$/)?.[1]
const { sha } = bootstrapSource(loadEnv('production', root, ''))
let template = fs.readFileSync(path.join(root, 'scripts/templates/issue/index.html'), 'utf8')
  .replaceAll('__TITLE__', isUpstream ? `#${name}` : name)
  .replaceAll('__UPSTREAM__', isUpstream ? `twbs/bootstrap#${name}` : '')
  .replaceAll('__STATUS__', isUpstream ? 'reported' : 'unreported')
  .replaceAll('__TRACKING__', tracking ? `${TRACKING_REPO}#${tracking}` : '')
  .replaceAll('__COMMIT__', sha ?? '')

if (example) {
  template = fromExample(template, example)
}

// Puts the example's markup in the reproduction block with its classes, its
// tags on the page, and a link to it in the steps. Some examples need the
// kitchen sink's own frame styles (`bd-example-drawer` shows drawers in place):
// the page then loads kitchen-sink.css too.
function fromExample(html, { title, tags, heading, className, html: markup, url }) {
  const replace = (source, from, to) => {
    if (!source.includes(from)) {
      throw new Error(`The issue template changed: "${from.trim()}" not found`)
    }

    return source.replace(from, () => to)
  }

  const classes = className.split(/\s+/).filter(Boolean)
  const frame = classes.filter(entry => entry.startsWith('bd-'))
  if (frame.length > 0) {
    html = replace(html, '    <link rel="stylesheet" href="./tokens.css">\n', `    <link rel="stylesheet" href="./tokens.css">
    <!-- The example's frame styles from the kitchen sink (${frame.join(', ')}),
         outside Bootstrap. Remove them if the bug may come from there. -->
    <link rel="stylesheet" href="/kitchen-sink/kitchen-sink.css">\n`)
    console.log(`The example uses the kitchen sink's own styles (${frame.join(', ')}): the page loads kitchen-sink.css.`)
  }

  html = replace(html, '<meta name="playground-tags" content="">', `<meta name="playground-tags" content="${tags}">`)
  html = replace(html, '          <li>…</li>\n', `          <li>Start from the <a href="${url}">${title}: ${heading}</a> docs example, copied below.</li>\n          <li>…</li>\n`)
  html = replace(html,
    '        <div data-playground-repro>\n          <button type="button" class="btn-solid theme-primary">Button</button>\n',
    `        <div data-playground-repro${classes.length > 0 ? ` class="${classes.join(' ')}"` : ''}>\n${markup}\n`)
  return html
}

copyStyles(sourceDir, targetDir)
fs.writeFileSync(path.join(targetDir, 'index.html'), template)

console.log(`Created issues/${name}/ from the "${configName}" config${example ? `, with the example ${example.url.slice(1)}` : ''}`)
console.log(`Open http://localhost:5173/issues/${name}/ with \`npm run dev\``)
