#!/usr/bin/env node
// Creates issues/<name>/ from the issue template and a config's style files.
// Usage: npm run new-issue <name> [-- --config <config>]
//   <name> is an upstream issue number (42928) or any slug (pg-12, menu-focus).
//   --config defaults to `default` (Bootstrap's defaults); `working` copies src/styles/.

import fs from 'node:fs'
import path from 'node:path'
import { NAME_PATTERN, configDir, copyStyles, fail, listConfigs, root, workingDir } from './lib/configs.mjs'

const args = process.argv.slice(2)
const configIndex = args.indexOf('--config')
const configName = configIndex === -1 ? 'default' : args[configIndex + 1]
const name = args.filter((arg, index) => index !== configIndex && index !== configIndex + 1)[0]?.replace(/^#/, '')

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

const isUpstream = /^\d+$/.test(name)
const template = fs.readFileSync(path.join(root, 'scripts/templates/issue/index.html'), 'utf8')
  .replaceAll('__TITLE__', isUpstream ? `#${name}` : name)
  .replaceAll('__LINK__', isUpstream ?
    `<a href="https://github.com/twbs/bootstrap/issues/${name}">twbs/bootstrap#${name}</a>` :
    'Upstream: not reported yet')

copyStyles(sourceDir, targetDir)
fs.writeFileSync(path.join(targetDir, 'index.html'), template)

console.log(`Created issues/${name}/ from the "${configName}" config`)
console.log(`Open http://localhost:5173/issues/${name}/ with \`npm run dev\``)
