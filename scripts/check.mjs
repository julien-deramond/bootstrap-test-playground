#!/usr/bin/env node
// Runs the checks that need no browser, one after the other, and sums them up.
// Usage: npm run check [-- --full]
//   --full (npm run check:full) adds the browser suites: smoke, console, a11y.
// A failing step doesn't stop the next ones; the exit code is non-zero if any failed.

import { spawnSync } from 'node:child_process'

const STEPS = ['check-configs', 'check-dist', 'audit-tokens', 'lint:html', 'test']
const BROWSER_STEPS = ['test:smoke', 'test:console', 'test:a11y']

const steps = process.argv.includes('--full') ? [...STEPS, ...BROWSER_STEPS] : STEPS
const results = []

for (const step of steps) {
  console.log(`\n> npm run ${step}\n`)
  const started = Date.now()
  const { status } = spawnSync('npm', ['run', step], { stdio: 'inherit', shell: process.platform === 'win32' })
  results.push({ step, ok: status === 0, seconds: Math.round((Date.now() - started) / 1000) })
}

console.log('\nSummary')
for (const { step, ok, seconds } of results) {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${step} (${seconds}s)`)
}

const failed = results.filter(({ ok }) => !ok)
if (failed.length > 0) {
  console.error(`\n${failed.length} of ${results.length} failed: ${failed.map(({ step }) => step).join(', ')}`)
  process.exit(1)
}
