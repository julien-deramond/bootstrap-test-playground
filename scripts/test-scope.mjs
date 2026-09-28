#!/usr/bin/env node
// Prints what the console crawl and the smoke tests have to run for the
// changes since <base> (default: origin/main), committed or not, and the
// CONSOLE_SCOPE and SMOKE_SCOPE values that limit `npm run test:console` and
// `npm run test:smoke` to it. In GitHub Actions, it also sets them for the
// next steps and writes the scopes to the job summary.
// Usage: npm run test-scope [-- <base>]
//
// The working copy and dist always run, on every page or scenario. Then every
// changed config on every page or scenario, and every changed page (for the
// smoke tests, the scenarios on it) with every config. A shared change, like
// Bootstrap, postcss.config.js, src/js/ or the suite's own tests/<suite>/,
// runs everything. See scripts/lib/test-scope.mjs.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { root } from './lib/configs.mjs'
import { testScope } from './lib/test-scope.mjs'

const base = process.argv[2] ?? 'origin/main'
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean)

const mergeBase = git('merge-base', base, 'HEAD')[0]
const files = [...new Set([
  ...git('diff', '--name-only', '--no-renames', mergeBase),
  ...git('ls-files', '--others', '--exclude-standard')
])].sort()

const SUITES = { console: 'CONSOLE_SCOPE', smoke: 'SMOKE_SCOPE' }

console.log(`${files.length} files changed since ${base}.`)
const summaries = []
for (const [suite, variable] of Object.entries(SUITES)) {
  const scope = testScope(files, suite)
  const value = JSON.stringify(scope)
  const summary = scope.full ?
    [`Everything: ${scope.reason} changed.`] :
    [
      'The working copy and dist, everywhere.',
      scope.configs.length ? `Everywhere with: ${scope.configs.join(', ')}.` : 'No changed config.',
      scope.urls.length ? `Every config on: ${scope.urls.join(', ')}.` : 'No changed page.'
    ]

  console.log(`\n${suite}:`)
  for (const line of summary) {
    console.log(`  ${line}`)
  }

  console.log(`  ${variable}='${value}' npm run test:${suite}`)
  summaries.push(`#### ${suite}\n\n${summary.map(line => `- ${line}`).join('\n')}`)

  if (process.env.GITHUB_ENV) {
    fs.appendFileSync(process.env.GITHUB_ENV, `${variable}=${value}\n`)
  }
}

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Test scope\n\n${summaries.join('\n\n')}\n`)
}
