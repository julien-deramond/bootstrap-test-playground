#!/usr/bin/env node
// Writes updates/last-update.json, the record of a Bootstrap update that the
// home page lists and kitchen sink pages mark (see scripts/lib/last-update.mjs).
// Usage: npm run record-update -- --from <sha> --to <sha> [--base <git-ref>]
//
// Run it after the kitchen sink sync, before committing: the sections whose
// markup changed are the ones that differ from <base> (default HEAD). The
// examples that render differently come from `npm run diff-bootstrap -- <from>
// <to>`, when its report exists. `npm run update-bootstrap` and the nightly
// canary run it.
import { writeLastUpdate } from './lib/last-update.mjs'
import { resolveRef, upstreamCommits } from './lib/upstream.mjs'

const arg = name => {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

if (!arg('from') || !arg('to')) {
  console.error('Usage: npm run record-update -- --from <sha> --to <sha> [--base <git-ref>]')
  process.exit(1)
}

const from = resolveRef(arg('from'))
const to = resolveRef(arg('to'))
const record = writeLastUpdate({ from, to, commits: upstreamCommits(from, to), base: arg('base') })
const markup = record.examples.filter(example => example.markup).length
const rendering = record.examples.filter(example => example.pixels).length
console.log(`updates/last-update.json: ${record.commits ? `${record.commits.length} upstream commits, ` : ''}${markup} examples with new markup, ${record.rendering ? `${rendering} rendering differently` : 'rendering not compared (no diff-bootstrap report)'}.`)
