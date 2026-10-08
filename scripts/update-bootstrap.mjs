#!/usr/bin/env node
// Moves node_modules/bootstrap to another twbs/bootstrap commit, then does
// what follows every update.
// Usage: npm run update-bootstrap [-- --to <ref> | --pr <number>] [--no-diff]
//   (none)       the latest main commit
//   --to <ref>   a commit (full or short), branch or tag, to pin or go back
//   --pr <n>     the head of twbs/bootstrap#<n>, forks included, to test it
//   --no-diff    skips diff-bootstrap's screenshots, a minute or two
//
// package.json keeps `#main` and the lockfile pins the commit, whichever it
// is. After the install, it:
//   - prints the upstream commits since the previous one (from the local
//     checkout in BOOTSTRAP_PATH when it has both, or the GitHub CLI)
//   - resyncs the kitchen sink from that commit's docs, fetched into
//     .cache/bootstrap/<sha>/ like diff-bootstrap does
//   - runs the static checks through canary-report, against node_modules
//     (BOOTSTRAP_PATH unset), which writes reports/canary/report.md
//   - records the commit's sizes in sizes/history.json (not with --pr)
//   - compares the kitchen sink's rendering with diff-bootstrap
//   - writes updates/last-update.json (record-update) and prints a commit message
// Exits with an error when a check fails.

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from 'vite'
import { root } from './lib/configs.mjs'
import { LAST_UPDATE_FILE, writeLastUpdate } from './lib/last-update.mjs'
import { fetchCommit, lockedSha, resolveRef, upstreamCommits } from './lib/upstream.mjs'

const SPEC = 'github:twbs/bootstrap#main'
// canary-report's checks that need no browser. `npm run canary-report` runs them all.
const CHECKS = ['check-configs', 'check-dist', 'audit-tokens', 'compile-matrix', 'audit-rtl', 'audit-motion', 'audit-layers', 'audit-partials', 'lint:html', 'check-size']

const args = process.argv.slice(2)
const options = {}
for (let index = 0; index < args.length; index++) {
  const name = args[index].match(/^--(to|pr)$/)?.[1]
  if (args[index] === '--no-diff') {
    options.noDiff = true
  } else if (name && args[index + 1]) {
    options[name] = args[++index]
  } else {
    options.invalid = true
  }
}

const { to: toRef, pr: prNumber, noDiff } = options
if (options.invalid || (toRef && prNumber) || (prNumber && !/^\d+$/.test(prNumber))) {
  console.error('Usage: npm run update-bootstrap [-- --to <ref> | --pr <number>] [--no-diff]')
  process.exit(1)
}

const short = sha => sha.slice(0, 7)
const run = (command, commandArgs, extra = {}) => spawnSync(command, commandArgs, { cwd: root, stdio: 'inherit', ...extra })
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
const writeJson = (file, data) => fs.writeFileSync(path.join(root, file), `${JSON.stringify(data, null, 2)}\n`)

// --- Which commit -------------------------------------------------------------

let pr
let to
if (prNumber) {
  const view = spawnSync('gh', ['pr', 'view', prNumber, '--repo', 'twbs/bootstrap', '--json', 'number,title,url,headRefOid,state'], { encoding: 'utf8' })
  if (view.status !== 0) {
    console.error(`Can't read twbs/bootstrap#${prNumber} with the GitHub CLI:\n${view.stderr}`)
    process.exit(1)
  }

  pr = JSON.parse(view.stdout)
  to = pr.headRefOid
  // A branch behind main misses its latest commits: a check can fail for that.
  const behind = spawnSync('gh', ['api', `repos/twbs/bootstrap/compare/main...${to}`, '--jq', '.behind_by'], { encoding: 'utf8' }).stdout.trim()
  pr.behind = Number(behind) || 0
} else {
  to = resolveRef(toRef ?? 'main')
}

const installed = lockedSha()
if (to === installed) {
  console.log(`Already at ${short(to)}. \`npm run canary-report\` runs the checks again.`)
  process.exit(0)
}

// The committed commit, not the installed one: after a --pr, the range and the
// commit message start from what HEAD has.
const committedLock = spawnSync('git', ['show', 'HEAD:package-lock.json'], { cwd: root, encoding: 'utf8' })
const from = (committedLock.status === 0 && JSON.parse(committedLock.stdout).packages?.['node_modules/bootstrap']?.resolved?.split('#')[1]) || installed

console.log(pr ?
  `Installing twbs/bootstrap#${pr.number} (${pr.state.toLowerCase()}): ${pr.title}\n  at ${short(to)}, from ${short(installed)}${pr.behind ? `. Its branch is ${pr.behind} ${pr.behind === 1 ? 'commit' : 'commits'} behind main` : ''}\n` :
  `Updating Bootstrap from ${short(installed)} to ${short(to)}${toRef ? ` (${toRef})` : ' (main)'}\n`)

// --- Install ------------------------------------------------------------------

// A commit on a fork installs through twbs/bootstrap too: GitHub serves the
// commits of pull requests from the base repository.
if (run('npm', ['install', '--no-audit', '--no-fund', `bootstrap@github:twbs/bootstrap#${to}`]).status !== 0) {
  process.exit(1)
}

// npm wrote the commit into package.json and the lockfile's root: put `#main`
// back, so the lockfile has the shape a plain `npm install` of `#main` gives.
const pkg = readJson('package.json')
pkg.dependencies.bootstrap = SPEC
writeJson('package.json', pkg)
const lock = readJson('package-lock.json')
lock.packages[''].dependencies.bootstrap = SPEC
delete lock.packages['node_modules/bootstrap'].integrity
writeJson('package-lock.json', lock)

if (lockedSha() !== to) {
  console.error(`\nThe lockfile pins ${short(lockedSha())}, not ${short(to)}.`)
  process.exit(1)
}

// --- Upstream commits ---------------------------------------------------------

const env = loadEnv('development', root, '')
const localCheckout = env.BOOTSTRAP_PATH ? path.resolve(root, env.BOOTSTRAP_PATH) : undefined
const commits = to === from ? [] : upstreamCommits(from, to, localCheckout)
const compareUrl = `https://github.com/twbs/bootstrap/compare/${short(from)}...${short(to)}`

if (to !== from) {
  console.log(`\n${commits ? `${commits.length} upstream ${commits.length === 1 ? 'commit' : 'commits'}` : 'Upstream commits'}: ${compareUrl}`)
  for (const { sha, subject } of commits ?? []) {
    console.log(`  ${short(sha)} ${subject}`)
  }
}

// --- Kitchen sink ---------------------------------------------------------------

console.log(`\nResyncing the kitchen sink from ${short(to)}'s docs…`)
if (run('node', ['scripts/sync-kitchen-sink.mjs', fetchCommit(to)]).status !== 0) {
  process.exit(1)
}

const changedPages = spawnSync('git', ['status', '--porcelain', '--', 'kitchen-sink'], { cwd: root, encoding: 'utf8' }).stdout
  .split('\n').filter(Boolean).map(line => line.slice(3))
console.log(changedPages.length ? `${changedPages.length} kitchen sink ${changedPages.length === 1 ? 'page' : 'pages'} changed.` : 'No kitchen sink page changed.')

// --- Checks -------------------------------------------------------------------

console.log('\nRunning the checks…')
run('node', ['scripts/canary-report.mjs', '--from', from, '--to', to, '--only', CHECKS.join(',')])
const summary = readJson('reports/canary/summary.json')

// After the report, which compares with the previous entry, like the canary.
// A pull request's head isn't a main commit: its sizes stay out of the
// history. Neither does the commit HEAD has, already in it.
if (!pr && to !== from) {
  // The size table is in the report already: only its last line, "Recorded under …".
  const record = spawnSync('node', ['scripts/check-size.mjs', '--record'], { cwd: root, encoding: 'utf8', env: { ...process.env, BOOTSTRAP_PATH: '' } })
  console.log(record.stdout.trim().split('\n').at(-1))
}

// --- What changed ---------------------------------------------------------------

const lastUpdate = path.relative(root, LAST_UPDATE_FILE)
if (to === from) {
  // Back where HEAD is: so is its record.
  spawnSync('git', ['checkout', 'HEAD', '--', lastUpdate], { cwd: root })
} else {
  if (!noDiff) {
    console.log('\nComparing the rendering of both commits…')
    const diff = spawnSync('node', ['scripts/diff-bootstrap.mjs', from, to], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    // Only its summary: the examples are in the report and the record.
    console.log(diff.status === 0 ?
      diff.stdout.split('\n').filter(line => /^(\d+ upstream|CSS diff|\d+ kitchen sink|Report:)/.test(line)).join('\n') :
      `diff-bootstrap failed, so the record lists markup changes only:\n${diff.stderr.trim().split('\n').slice(-5).join('\n')}`)
  }

  const record = writeLastUpdate({ from, to, commits, pr: pr && { number: pr.number, title: pr.title, url: pr.url, behind: pr.behind } })
  console.log(`\n${lastUpdate}: ${record.examples.length} ${record.examples.length === 1 ? 'example' : 'examples'} changed${record.rendering ? '' : ' (markup only)'}. The home page lists them.`)
}

// --- Summary --------------------------------------------------------------------

console.log('')
if (pr) {
  console.log(`Testing twbs/bootstrap#${pr.number}: don't commit this. \`npm run update-bootstrap\` goes back to main.`)
  if (pr.behind) {
    console.log(`Its branch is ${pr.behind} ${pr.behind === 1 ? 'commit' : 'commits'} behind main: a failure can come from what it misses.`)
  }
} else if (to === from) {
  console.log(`Back at ${short(to)}, the commit HEAD has: nothing to commit.`)
} else {
  const count = commits ? ` (${commits.length} upstream ${commits.length === 1 ? 'commit' : 'commits'})` : ''
  console.log('Commit it with:\n')
  console.log(`  git add package.json package-lock.json sizes updates${changedPages.length ? ' kitchen-sink' : ''}`)
  console.log(`  git commit -m "chore(deps): update bootstrap to main@${short(to)}" -m "From ${short(from)} to ${short(to)}${count}${changedPages.length ? ', and resyncs the kitchen sink' : ''}: ${compareUrl}"`)
}

if (summary.stale) {
  console.log(`\n${summary.stale} allowlist ${summary.stale === 1 ? 'entry no longer matches' : 'entries no longer match'}: an upstream fix may have landed (step 3 of "Upstream issue tracking" in CLAUDE.md).`)
}

if (summary.failed.length) {
  console.log(`\nFailing: ${summary.failed.join(', ')}. The end of ${summary.failed.length === 1 ? 'its' : 'their'} output is in reports/canary/report.md.`)
  process.exit(1)
}
