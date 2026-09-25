#!/usr/bin/env node
// Replaces the working copy (src/styles/) with configs/<name>/.
// Usage: npm run use-config <name> [-- --force]

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { configDir, copyStyles, fail, listConfigs, root, workingDir } from './lib/configs.mjs'

const args = process.argv.slice(2)
const force = args.includes('--force')
const name = args.find(arg => arg !== '--force')

if (!name || !fs.existsSync(path.join(configDir(name), 'main.scss'))) {
  fail(`Usage: npm run use-config <name> [-- --force]\nAvailable configs: ${listConfigs().map(config => config.name).join(', ')}`)
}

let dirty = ''
try {
  dirty = execFileSync('git', ['status', '--porcelain', '--', 'src/styles'], { cwd: root, encoding: 'utf8' }).trim()
} catch {}

if (dirty && !force) {
  fail(`src/styles/ has uncommitted changes:\n${dirty}\nSave them first (npm run save-config <name>) or add -- --force to discard them.`)
}

copyStyles(configDir(name), workingDir)
console.log(`src/styles/ now uses configs/${name}/`)
