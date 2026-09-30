#!/usr/bin/env node
// Prints what the console crawl, the smoke tests and the accessibility scan
// have to run for the changes since <base> (default: origin/main), committed
// or not, and the CONSOLE_SCOPE, SMOKE_SCOPE and A11Y_SCOPE values that limit
// `npm run test:console`, `npm run test:smoke` and `npm run test:a11y` to it. In GitHub Actions, it also sets them for the
// next steps and writes the scopes to the job summary.
// Usage: npm run test-scope [-- <base>]
//
// The working copy and dist always run, on every page or scenario (for the
// accessibility scan, the default config on every page). Then every
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

// What each suite runs whatever changed.
const SUITES = {
  console: { variable: 'CONSOLE_SCOPE', always: 'The working copy and dist, everywhere.' },
  smoke: { variable: 'SMOKE_SCOPE', always: 'The working copy and dist, everywhere.' },
  a11y: { variable: 'A11Y_SCOPE', always: 'The default config, everywhere.', env: 'A11Y_CONFIGS=all ' }
}

console.log(`${files.length} files changed since ${base}.`)
const summaries = []
for (const [suite, { variable, always, env = '' }] of Object.entries(SUITES)) {
  const scope = testScope(files, suite)
  const value = JSON.stringify(scope)
  const summary = scope.full ?
    [`Everything: ${scope.reason} changed.`] :
    [
      always,
      scope.configs.length ? `Everywhere with: ${scope.configs.join(', ')}.` : 'No changed config.',
      scope.urls.length ? `Every config on: ${scope.urls.join(', ')}.` : 'No changed page.'
    ]

  console.log(`\n${suite}:`)
  for (const line of summary) {
    console.log(`  ${line}`)
  }

  console.log(`  ${env}${variable}='${value}' npm run test:${suite}`)
  summaries.push(`#### ${suite}\n\n${summary.map(line => `- ${line}`).join('\n')}`)

  if (process.env.GITHUB_ENV) {
    fs.appendFileSync(process.env.GITHUB_ENV, `${variable}=${value}\n`)
  }
}

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Test scope\n\n${summaries.join('\n\n')}\n`)
}
