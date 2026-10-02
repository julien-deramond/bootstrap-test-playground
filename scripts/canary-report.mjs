#!/usr/bin/env node
// Runs every check against the installed Bootstrap and writes the report the
// nightly canary puts in its pull request (.github/workflows/canary.yml).
// Usage: npm run canary-report [-- --from <sha> --to <sha>] [-- --only audit-rtl,lint:html]
//
// Each check runs with BOOTSTRAP_PATH unset, so against node_modules/bootstrap,
// and the console crawl and the smoke tests on the working copy and dist only.
// The report has the upstream commit range, one row per check, the allowlist
// entries that no longer match (usually an upstream fix: step 3 of "Upstream
// issue tracking" in CLAUDE.md), the kitchen sink pages the sync changed, and
// the end of each failing check's output. It goes to reports/canary/report.md,
// with reports/canary/summary.json for the workflow's labels. Always exits 0:
// the report is the result.

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { root } from './lib/configs.mjs'
import { lockedSha, upstreamCommits } from './lib/upstream.mjs'

const arg = name => {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

const to = arg('to') ?? lockedSha()
const from = arg('from') ?? to
const only = arg('only')?.split(',')

// The console crawl and the smoke tests run what every pull request runs, the
// working copy and dist: with every config, they outgrow the canary's one job
// (#285). A Bootstrap update is a shared change, so the canary's pull request
// runs both in full in its own checks.
const BASELINE = JSON.stringify({ full: false, configs: [], urls: [] })

// `informational`: a difference is expected whenever Bootstrap changes, so it's
// reported, not counted as a failure.
const CHECKS = [
  { name: 'check-configs', command: 'npm run -s check-configs' },
  { name: 'check-dist', command: 'npm run -s check-dist' },
  { name: 'audit-tokens', command: 'npm run -s audit-tokens' },
  { name: 'compile-matrix', command: 'npm run -s compile-matrix' },
  { name: 'audit-rtl', command: 'npm run -s audit-rtl' },
  { name: 'audit-motion', command: 'npm run -s audit-motion' },
  { name: 'audit-layers', command: 'npm run -s audit-layers' },
  { name: 'audit-partials', command: 'npm run -s audit-partials' },
  { name: 'lint:html', command: 'npm run -s lint:html' },
  // Compares with the last recorded entry; the workflow records the new one after the report.
  { name: 'check-size', command: 'npm run -s check-size', table: true },
  { name: 'audit-motion --render', command: 'npm run -s audit-motion -- --render' },
  { name: 'audit-layers --render', command: 'npm run -s audit-layers -- --render' },
  { name: 'test:console', command: 'npm run -s test:console -- --reporter=line', env: { CONSOLE_SCOPE: BASELINE } },
  { name: 'test:smoke', command: 'npm run -s test:smoke:engines -- --reporter=line', env: { SMOKE_SCOPE: BASELINE } },
  { name: 'test:a11y', command: 'npm run -s test:a11y -- --reporter=line' },
  { name: 'test:visual', command: 'npm run -s test:visual -- --reporter=line', informational: true }
].filter(({ name }) => !only || only.includes(name))

// Lines the checks print when a known entry stopped matching.
const STALE = /no longer (found|exists|happen|match|applies)|has an effect again|passes now|Expected to fail, but passed/i

// eslint-disable-next-line no-control-regex
const stripAnsi = text => text.replace(/\u001B\[[\d;]*[A-Za-z]/g, '')

const results = []
for (const check of CHECKS) {
  process.stdout.write(`${check.name}… `)
  const started = Date.now()
  const run = spawnSync(check.command, { cwd: root, shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, ...check.env, BOOTSTRAP_PATH: '', FORCE_COLOR: '0' } })
  const output = stripAnsi(`${run.stdout ?? ''}${run.stderr ?? ''}`)
  const lines = output.split('\n').map(line => line.trimEnd())
  const passed = run.status === 0
  // Audits print ✓/✗ summary lines; Playwright a "N passed" line.
  const summary = [...lines.filter(line => /^\s*[✓✗]\s/.test(line) && !/^\s+✓\s+\d+ /.test(line)).slice(0, 4), ...lines.filter(line => /^\s+\d+ (passed|failed|flaky|skipped)/.test(line))]
    .map(line => line.trim()).join('; ')
  const cell = summary.length > 160 ? `${summary.slice(0, 157)}…` : summary
  results.push({
    ...check,
    passed,
    seconds: Math.round((Date.now() - started) / 1000),
    summary: cell || (passed ? 'passed' : `exit code ${run.status}`),
    stale: lines.filter(line => STALE.test(line)).map(line => line.trim()),
    // Without Playwright's `[12/132] …` progress lines, so failures show.
    tail: lines.filter(line => line && !/^\[\d+\/\d+\]/.test(line)).slice(-60).join('\n'),
    // check-size's table goes into the report whole.
    table: check.table ? lines.filter(line => /^(File|css\/|dist\/|src\/|Compared|No recorded)/.test(line)).join('\n') : undefined
  })
  console.log(passed ? '✓' : check.informational ? '≠' : '✗')
}

// Upstream commits, through the GitHub CLI when it's there.
const commits = from === to ? [] : upstreamCommits(from, to) ?? []

const changedPages = spawnSync('git', ['status', '--porcelain', '--', 'kitchen-sink'], { cwd: root, encoding: 'utf8' }).stdout
  .split('\n').filter(Boolean).map(line => line.slice(3))

const failed = results.filter(result => !result.passed && !result.informational)
const stale = results.flatMap(result => result.stale.map(line => ({ check: result.name, line })))
const short = sha => sha.slice(0, 7)
const range = from === to ?
  `[\`${short(to)}\`](https://github.com/twbs/bootstrap/commit/${to})` :
  `[\`${short(from)}...${short(to)}\`](https://github.com/twbs/bootstrap/compare/${from}...${to})`

const escapeCell = text => text.replace(/\|/g, '\\|')
const report = [
  `Updates Bootstrap to \`v6-dev\` at ${range}.`,
  '',
  failed.length ? `**${failed.length} ${failed.length === 1 ? 'check fails' : 'checks fail'}:** ${failed.map(({ name }) => `\`${name}\``).join(', ')}.` : '**Every check passes.**',
  stale.length ? `**${stale.length} allowlist ${stale.length === 1 ? 'entry no longer matches' : 'entries no longer match'}**: an upstream fix may have landed.` : '',
  '',
  ...(from === to ? [] : [
    `### Upstream commits (${commits.length})`,
    '',
    // `#123` in code, not linked: a link would add a cross-reference to the
    // upstream PR's timeline every night.
    ...(commits.length ? commits.map(({ sha, subject }) => `- [\`${short(sha)}\`](https://github.com/twbs/bootstrap/commit/${sha}) ${subject.replace(/\(#(\d+)\)/g, '(`#$1`)')}`) : [`See ${range}.`]),
    ''
  ]),
  '### Checks',
  '',
  '| Check | Result | Summary | Time |',
  '| --- | --- | --- | --- |',
  ...results.map(({ name, passed, informational, summary, seconds }) =>
    `| \`${name}\` | ${passed ? '✅' : informational ? '🔶 changed' : '❌'} | ${escapeCell(summary)} | ${seconds}s |`),
  '',
  ...(results.some(({ env }) => env) ? ['The console crawl and the smoke tests ran the working copy and dist. This pull request\'s own checks run them with every config.', ''] : []),
  ...(stale.length ? [
    '### Allowlist entries that no longer match',
    '',
    'Check the tracking issue: if Bootstrap fixed it, remove the entry, label the issue `upstream-fixed` and close it (step 3 of "Upstream issue tracking" in CLAUDE.md).',
    '',
    ...stale.map(({ check, line }) => `- \`${check}\`: ${line}`),
    ''
  ] : []),
  ...results.filter(({ table }) => table).flatMap(({ table }) => [
    '### Sizes',
    '',
    '```',
    table,
    '```',
    ''
  ]),
  ...(changedPages.length ? [
    `### Kitchen sink pages changed by the sync (${changedPages.length})`,
    '',
    ...changedPages.map(page => `- \`${page}\``),
    ''
  ] : []),
  ...results.filter(({ passed }) => !passed).flatMap(({ name, tail }) => [
    `<details><summary><code>${name}</code> output (end)</summary>`,
    '',
    '```',
    tail,
    '```',
    '',
    '</details>',
    ''
  ])
].join('\n')

const reportDir = path.join(root, 'reports/canary')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(path.join(reportDir, 'report.md'), report)
fs.writeFileSync(path.join(reportDir, 'summary.json'), JSON.stringify({
  from,
  to,
  failed: failed.map(({ name }) => name),
  changed: results.filter(({ passed, informational }) => !passed && informational).map(({ name }) => name),
  stale: stale.length
}, null, 2))

console.log(`\n${failed.length} failing, ${stale.length} stale entries. Report: ${path.relative(root, path.join(reportDir, 'report.md'))}`)
