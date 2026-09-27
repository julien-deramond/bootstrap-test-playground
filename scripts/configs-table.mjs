#!/usr/bin/env node
// Writes the table of saved configs into configs/README.md, from each
// config's README.md: its description, the tracking issues under "Known gaps",
// and whether it only changes tokens.css. `save-config` runs it too.
// Usage: npm run configs-table [-- --check]
// --check writes nothing and fails when the table is stale, for CI.

import { updateConfigsReadme } from './lib/configs.mjs'

const check = process.argv.includes('--check')
const stale = updateConfigsReadme({ check })

if (check && stale) {
  console.error('✗ The configs table in configs/README.md is stale. Run `npm run configs-table` and commit the result.')
  process.exit(1)
}

console.log(stale ? '✓ Updated the configs table in configs/README.md' : '✓ The configs table in configs/README.md is up to date')
