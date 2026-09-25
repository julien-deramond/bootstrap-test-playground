#!/usr/bin/env node
// Snapshots the working copy (src/styles/) into configs/<name>/.
// Usage: npm run save-config <name> [-- "Description"] [--force]

import fs from 'node:fs'
import path from 'node:path'
import { NAME_PATTERN, configDir, copyStyles, fail, workingDir } from './lib/configs.mjs'

const args = process.argv.slice(2)
const force = args.includes('--force')
const [name, ...descriptionWords] = args.filter(arg => arg !== '--force')

if (!name || !NAME_PATTERN.test(name)) {
  fail('Usage: npm run save-config <name> [-- "Description"] [--force]   (name: lowercase letters, digits, dashes)')
}

if (name === 'default') {
  fail('`default` holds Bootstrap\'s defaults and stays pristine. Pick another name.')
}

const target = configDir(name)
if (fs.existsSync(target) && !force) {
  fail(`configs/${name}/ already exists. Add --force to overwrite it.`)
}

copyStyles(workingDir, target)

const description = descriptionWords.join(' ').trim()
const readme = path.join(target, 'README.md')
if (description || !fs.existsSync(readme)) {
  fs.writeFileSync(readme, `# ${name}\n\n${description || 'Describe what this config tests.'}\n`)
}

console.log(`Saved src/styles/ to configs/${name}/`)
console.log(`Preview it with the toolbar's "Styles" menu or ?config=${name}`)
