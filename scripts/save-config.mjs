#!/usr/bin/env node
// Snapshots the working copy (src/styles/) into configs/<name>/, starts its
// README.md from scripts/templates/config/, and updates the configs table.
// Usage: npm run save-config <name> [-- "Description"] [--category <id>] [--force]
// Without --category, a new config asks for one in a terminal, and lands in
// `other` elsewhere.

import fs from 'node:fs'
import path from 'node:path'
import { createInterface } from 'node:readline/promises'
import { CATEGORIES, NAME_PATTERN, configDir, copyStyles, fail, isMetaBlock, root, updateConfigsReadme, workingDir, writeCategory } from './lib/configs.mjs'

const USAGE = 'Usage: npm run save-config <name> [-- "Description"] [--category <id>] [--force]   (name: lowercase letters, digits, dashes)'

const args = process.argv.slice(2)
const force = args.includes('--force')
const categoryIndex = args.indexOf('--category')
let category = categoryIndex === -1 ? '' : args[categoryIndex + 1] ?? ''
const [name, ...descriptionWords] = args.filter((arg, index) => arg !== '--force' && (categoryIndex === -1 || (index !== categoryIndex && index !== categoryIndex + 1)))

if (!name || !NAME_PATTERN.test(name)) {
  fail(USAGE)
}

const categoryIds = CATEGORIES.map(({ id }) => id)
if (categoryIndex !== -1 && !categoryIds.includes(category)) {
  fail(`Unknown category \`${category}\`. Pick one of: ${categoryIds.join(', ')}`)
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
const isNew = !fs.existsSync(readme)

if (isNew && !category && process.stdin.isTTY) {
  console.log('What does this config customize?')
  for (const [index, { id, description }] of CATEGORIES.entries()) {
    console.log(`  ${index + 1}. ${id.padEnd(12)} ${description}`)
  }

  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  const answer = (await prompt.question(`Category (1-${CATEGORIES.length} or id, Enter for other): `)).trim()
  prompt.close()
  category = CATEGORIES[Number(answer) - 1]?.id ?? (categoryIds.includes(answer) ? answer : 'other')
}

if (isNew) {
  const template = fs.readFileSync(path.join(root, 'scripts/templates/config/README.md'), 'utf8')
  fs.writeFileSync(readme, template
    .replaceAll('__NAME__', name)
    .replaceAll('__CATEGORY__', category || 'other')
    .replaceAll('__DESCRIPTION__', description || 'Describe what this config tests, in one paragraph. The toolbar, the home page and the configs table show it.'))
} else if (description) {
  // Blocks and the blank lines between them, so the rest stays byte for byte.
  const parts = fs.readFileSync(readme, 'utf8').split(/(\n\s*\n)/)
  const index = parts.findIndex((part, i) => i % 2 === 0 && part.trim() && !isMetaBlock(part))
  if (index === -1) {
    parts.splice(1, 0, '\n\n', description)
  } else {
    parts[index] = description
  }

  fs.writeFileSync(readme, parts.join(''))
}

// An existing config keeps its category unless --category changes it.
if (!isNew && category) {
  writeCategory(readme, category)
}

updateConfigsReadme()

console.log(`Saved src/styles/ to configs/${name}/`)
console.log(`Describe it in configs/${name}/README.md: the configs table in configs/README.md is generated from it`)
console.log(`Preview it with the toolbar's "Config" list or ?config=${name}`)
