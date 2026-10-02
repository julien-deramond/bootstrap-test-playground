#!/usr/bin/env node
// Creates issues/<name>/ from the issue template and a config's style files.
// Usage: npm run new-issue <name> [-- --config <config>]
//   <name> is an upstream issue number (42928) or any slug (pg-12, menu-focus).
//   --config defaults to `default` (Bootstrap's defaults); `working` copies src/styles/.

import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from 'vite'
import { bootstrapSource } from './lib/bootstrap.mjs'
import { NAME_PATTERN, configDir, copyStyles, fail, listConfigs, root, workingDir } from './lib/configs.mjs'

// Tracking issues live in this repository.
const TRACKING_REPO = 'julien-deramond/bootstrap-test-playground'

const args = process.argv.slice(2)
const configIndex = args.indexOf('--config')
const configName = configIndex === -1 ? 'default' : args[configIndex + 1]
const positional = configIndex === -1 ? args : args.filter((arg, index) => index !== configIndex && index !== configIndex + 1)
const name = positional[0]?.replace(/^#/, '')

if (!name || !NAME_PATTERN.test(name)) {
  fail('Usage: npm run new-issue <number-or-slug> [-- --config <config>]   (e.g. npm run new-issue 42928)')
}

const sourceDir = configName === 'working' ? workingDir : configDir(configName)
if (!configName || !fs.existsSync(path.join(sourceDir, 'main.scss'))) {
  fail(`Unknown config "${configName}". Available: working, ${listConfigs().map(config => config.name).join(', ')}`)
}

const targetDir = path.join(root, 'issues', name)
if (fs.existsSync(targetDir)) {
  fail(`issues/${name}/ already exists.`)
}

// `42928`: an upstream issue, so reported. `pg-12`: tracked here, not reported
// yet. Any other slug: neither, until the page's metadata says otherwise.
const isUpstream = /^\d+$/.test(name)
const tracking = name.match(/^pg-(\d+)$/)?.[1]
const { sha } = bootstrapSource(loadEnv('production', root, ''))
const template = fs.readFileSync(path.join(root, 'scripts/templates/issue/index.html'), 'utf8')
  .replaceAll('__TITLE__', isUpstream ? `#${name}` : name)
  .replaceAll('__UPSTREAM__', isUpstream ? `twbs/bootstrap#${name}` : '')
  .replaceAll('__STATUS__', isUpstream ? 'reported' : 'unreported')
  .replaceAll('__TRACKING__', tracking ? `${TRACKING_REPO}#${tracking}` : '')
  .replaceAll('__COMMIT__', sha ?? '')

copyStyles(sourceDir, targetDir)
fs.writeFileSync(path.join(targetDir, 'index.html'), template)

console.log(`Created issues/${name}/ from the "${configName}" config`)
console.log(`Open http://localhost:5173/issues/${name}/ with \`npm run dev\``)
