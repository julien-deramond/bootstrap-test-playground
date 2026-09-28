#!/usr/bin/env node
// Prints what the console crawl has to open for the changes since <base>
// (default: origin/main), committed or not, and the CONSOLE_SCOPE value that
// makes `npm run test:console` open only that. In GitHub Actions, it also sets
// CONSOLE_SCOPE for the next steps and writes the scope to the job summary.
// Usage: npm run console-scope [-- <base>]
//
// The working copy and dist always open on every page. Then every changed
// config opens on every page, and every changed page with every config. A
// shared change, like Bootstrap, postcss.config.js or src/js/, opens
// everything. See scripts/lib/console-scope.mjs.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { consoleScope } from './lib/console-scope.mjs'
import { root } from './lib/configs.mjs'

const base = process.argv[2] ?? 'origin/main'
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean)

const mergeBase = git('merge-base', base, 'HEAD')[0]
const files = [...new Set([
  ...git('diff', '--name-only', '--no-renames', mergeBase),
  ...git('ls-files', '--others', '--exclude-standard')
])].sort()

const scope = consoleScope(files)
const value = JSON.stringify(scope)

const summary = scope.full ?
  [`Everything: ${scope.reason} changed.`] :
  [
    'The working copy and dist on every page.',
    scope.configs.length ? `Every page with: ${scope.configs.join(', ')}.` : 'No changed config.',
    scope.urls.length ? `Every config on: ${scope.urls.join(', ')}.` : 'No changed page.'
  ]

console.log(`${files.length} files changed since ${base}.`)
for (const line of summary) {
  console.log(`  ${line}`)
}

console.log(`\nCONSOLE_SCOPE='${value}' npm run test:console`)

if (process.env.GITHUB_ENV) {
  fs.appendFileSync(process.env.GITHUB_ENV, `CONSOLE_SCOPE=${value}\n`)
}

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Console crawl scope\n\n${summary.map(line => `- ${line}`).join('\n')}\n`)
}
