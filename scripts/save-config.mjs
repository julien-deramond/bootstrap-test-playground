#!/usr/bin/env node
// Snapshots the working copy (src/styles/) into configs/<name>/, starts its
// README.md from scripts/templates/config/, and updates the configs table.
// Usage: npm run save-config <name> [-- "Description"] [--force]

import fs from 'node:fs'
import path from 'node:path'
import { NAME_PATTERN, configDir, copyStyles, fail, root, updateConfigsReadme, workingDir } from './lib/configs.mjs'

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

// A new config gets the template. An existing one keeps its README, and a
// description given on the command line replaces only its first paragraph.
const description = descriptionWords.join(' ').trim()
const readme = path.join(target, 'README.md')
if (!fs.existsSync(readme)) {
  const template = fs.readFileSync(path.join(root, 'scripts/templates/config/README.md'), 'utf8')
  fs.writeFileSync(readme, template
    .replaceAll('__NAME__', name)
    .replaceAll('__DESCRIPTION__', description || 'Describe what this config tests, in one paragraph. The toolbar, the home page and the configs table show it.'))
} else if (description) {
  // Blocks and the blank lines between them, so the rest stays byte for byte.
  const parts = fs.readFileSync(readme, 'utf8').split(/(\n\s*\n)/)
  const index = parts.findIndex((part, i) => i % 2 === 0 && part.trim() && !/^(#|<!--)/.test(part.trim()))
  if (index === -1) {
    parts.splice(1, 0, '\n\n', description)
  } else {
    parts[index] = description
  }

  fs.writeFileSync(readme, parts.join(''))
}

updateConfigsReadme()

console.log(`Saved src/styles/ to configs/${name}/`)
console.log(`Describe it in configs/${name}/README.md: the configs table in configs/README.md is generated from it`)
console.log(`Preview it with the toolbar's "Styles" menu or ?config=${name}`)
