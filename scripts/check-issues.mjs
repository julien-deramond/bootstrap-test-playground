#!/usr/bin/env node
// Runs every reproduction's assertion in headless Chromium and reports which
// bugs look fixed. A reproduction says what "fixed" looks like in
// issues/<name>/assert.js, a module the page can load:
//
//   export async function assert() { …; return { pass, details } }
//   export const environment = { forcedColors: 'active', viewport: { width, height }, colorScheme: 'dark' }  // optional
//
// `assert()` runs in the page once Bootstrap is on `window.bootstrap`, with
// the page's own markup, and returns `pass: true` when the bug is gone, `false`
// while it's there, `null` when this environment can't tell. A bug that needs
// the keyboard or the viewport has a Playwright spec instead,
// issues/<name>/repro.spec.js on tests/issues/fixtures.js, which records the
// same verdict; it's run here with `playwright test` against this script's dev
// server, and takes precedence over assert.js. See "Assertions" in
// docs/pages.md.
//
// Usage: npm run check-issues [-- <name>...] [--no-gh]
//
//   PASS  the fix landed: step 3 of "Upstream issue tracking" in CLAUDE.md,
//         which deletes the reproduction
//   FAIL  still broken, the expected state
//   SKIP  the assertion can't tell here (overlay scrollbars, say)
//   NONE  no assert.js and no repro.spec.js
//
// With the GitHub CLI, each tracking issue's state and label are checked
// against the result, and the step's commands are printed. Each page's
// `data-status` is updated to follow its tracking issue's label, and an empty
// upstream reference takes its "Reported upstream" item (see
// scripts/lib/repro-status.mjs). Exits with 1 when a
// reproduction passes, errors, or fails while its tracking issue is closed.
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'
import { fail, root } from './lib/configs.mjs'
import { UPSTREAM_LABELS, needsRefs, readReproductionMeta, reportedRefs, syncReproduction } from './lib/repro-status.mjs'

const USAGE = 'Usage: npm run check-issues [-- <name>...] [--no-gh]   (e.g. npm run check-issues -- pg-4 42754)'
let values
let positionals
try {
  ({ values, positionals } = parseArgs({ options: { 'no-gh': { type: 'boolean', default: false } }, allowPositionals: true }))
} catch (error) {
  fail(`${error.message}\n${USAGE}`)
}

const PORT = 5195
const VIEWPORT = { width: 1280, height: 720 }
const issuesDir = path.join(root, 'issues')

// The allowlists whose entries reference a tracking issue (step 3 of CLAUDE.md).
const ALLOWLISTS = [
  'tests/console/known-issues.js',
  'tests/smoke/known-issues.js',
  'tests/a11y/known-issues.js',
  ...fs.readdirSync(path.join(root, 'scripts')).filter(file => /^known-.+\.mjs$/.test(file)).map(file => `scripts/${file}`)
]

// --- The reproductions --------------------------------------------------------

function readReproduction(name) {
  const meta = readReproductionMeta(name) ?? {}
  return {
    name,
    upstream: meta.upstream ?? '',
    status: meta.status ?? '',
    tracking: meta.tracking ?? '',
    hasAssert: fs.existsSync(path.join(issuesDir, name, 'assert.js')),
    hasSpec: fs.existsSync(path.join(issuesDir, name, 'repro.spec.js'))
  }
}

const names = fs.readdirSync(issuesDir).filter(name => fs.existsSync(path.join(issuesDir, name, 'index.html'))).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
const unknown = positionals.filter(name => !names.includes(name))
if (unknown.length > 0) {
  fail(`No reproduction named ${unknown.join(', ')}. Available: ${names.join(', ')}\n${USAGE}`)
}

const reproductions = (positionals.length > 0 ? positionals : names).map(readReproduction)

// --- Running the assertions ---------------------------------------------------

async function runAssertions() {
  const server = await createServer({ root, logLevel: 'silent', server: { port: PORT } })
  await server.listen()
  const base = server.resolvedUrls.local[0].replace(/\/$/, '')
  // Headless Chromium hides scrollbars by default, which some assertions measure.
  const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] })
  try {
    await runSpecs(reproductions.filter(reproduction => reproduction.hasSpec), base)
    for (const reproduction of reproductions) {
      if (reproduction.hasSpec) {
        continue
      }

      if (!reproduction.hasAssert) {
        reproduction.result = 'NONE'
        reproduction.details = 'no assert.js or repro.spec.js next to the page'
        continue
      }

      const context = await browser.newContext({ viewport: VIEWPORT })
      const page = await context.newPage()
      const pageErrors = []
      page.on('pageerror', error => pageErrors.push(error.message))
      try {
        await page.goto(`${base}/issues/${reproduction.name}/`)
        // Bootstrap's bundle is imported by src/js/main.js, which may finish
        // after `load`; a non-default config swaps its styles in after load too.
        await page.waitForFunction(() => window.bootstrap && document.readyState === 'complete' && !document.getElementById('playground-config-pending'), null, { timeout: 15_000 })
        const url = `/issues/${reproduction.name}/assert.js`
        const environment = await page.evaluate(async url => (await import(url)).environment ?? null, url)
        if (environment?.viewport) {
          await page.setViewportSize(environment.viewport)
        }

        if (environment?.forcedColors || environment?.colorScheme) {
          await page.emulateMedia({ forcedColors: environment.forcedColors, colorScheme: environment.colorScheme })
        }

        const outcome = await page.evaluate(async url => {
          const module = await import(url)
          if (typeof module.assert !== 'function') {
            throw new TypeError('assert.js exports no assert() function')
          }

          const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('assert() took more than 10 seconds')), 10_000))
          return Promise.race([module.assert(), timeout])
        }, url)
        if (!outcome || typeof outcome !== 'object' || ![true, false, null].includes(outcome.pass)) {
          throw new TypeError(`assert() returned ${JSON.stringify(outcome)} instead of { pass: true | false | null, details }`)
        }

        reproduction.result = outcome.pass === null ? 'SKIP' : outcome.pass ? 'PASS' : 'FAIL'
        reproduction.details = String(outcome.details ?? '')
      } catch (error) {
        reproduction.result = 'ERROR'
        reproduction.details = error.message.split('\n')[0]
      }

      if (pageErrors.length > 0) {
        reproduction.details += ` (page errors: ${pageErrors.join('; ')})`
      }

      await context.close()
    }
  } finally {
    await browser.close()
    await server.close()
  }
}

// Runs a command and resolves with its output. Asynchronous on purpose: the
// dev server lives in this process, and spawnSync would stop it from answering
// the browser while the command runs.
const run = (command, args, env) => new Promise(resolve => {
  const child = spawn(command, args, { cwd: root, env: { ...process.env, ...env } })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', chunk => (stdout += chunk))
  child.stderr.on('data', chunk => (stderr += chunk))
  child.on('error', error => resolve({ status: null, stdout, stderr, error }))
  child.on('close', status => resolve({ status, stdout, stderr }))
})

// The specs, in one `playwright test` run against the dev server, each test's
// verdict from the annotation the fixture adds. A test that threw is an error.
async function runSpecs(specs, base) {
  if (specs.length === 0) {
    return
  }

  const output = path.join(root, 'tests/results/check-issues.json')
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.rmSync(output, { force: true })
  // The files first: `--project` takes every value after it.
  const result = await run('npx', ['playwright', 'test', ...specs.map(({ name }) => `issues/${name}/repro.spec.js`), '--project', 'issues', '--reporter=json'],
    { PLAYWRIGHT_BASE_URL: base, PLAYWRIGHT_JSON_OUTPUT_FILE: output, FORCE_COLOR: '0' })
  let report
  try {
    report = JSON.parse(fs.readFileSync(output, 'utf8'))
  } catch {
    for (const spec of specs) {
      spec.result = 'ERROR'
      spec.details = `playwright test didn't report: ${(result.stderr || result.stdout || result.error?.message || '').trim().split('\n').find(Boolean) ?? `exit code ${result.status}`}`
    }

    return
  }

  const tests = []
  const walk = suite => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        const verdict = test.annotations.find(({ type }) => type === 'verdict')
        const last = test.results.at(-1)
        tests.push({
          name: path.basename(path.dirname(path.resolve(root, 'tests', spec.file))),
          title: spec.title,
          verdict: verdict ? JSON.parse(verdict.description) : null,
          // eslint-disable-next-line no-control-regex
          error: last?.status === 'passed' ? null : (last?.error?.message ?? `${last?.status ?? 'no result'}`).replace(/\u001B\[[\d;]*[A-Za-z]/g, '').split('\n').find(line => line.trim())
        })
      }
    }

    for (const child of suite.suites ?? []) {
      walk(child)
    }
  }

  walk(report)
  for (const spec of specs) {
    const own = tests.filter(test => test.name === spec.name)
    if (own.length === 0) {
      spec.result = 'ERROR'
      spec.details = 'repro.spec.js ran no test'
      continue
    }

    // A fixed bug fails its test on purpose, with the verdict recorded first.
    const broken = own.filter(test => !test.verdict)
    if (broken.length > 0) {
      spec.result = 'ERROR'
      spec.details = broken.map(test => `${test.title}: ${test.error}`).join('; ')
      continue
    }

    const passes = own.map(test => test.verdict.pass)
    spec.result = passes.every(pass => pass === true) ? 'PASS' : passes.some(pass => pass === false) ? 'FAIL' : 'SKIP'
    spec.details = `${own.map(test => test.verdict.details).join('; ')} (repro.spec.js)`
  }
}

await runAssertions()

// --- The tracking issues ------------------------------------------------------

// `owner/repo#n` → { state, labels } through the GitHub CLI, or null without it.
let ghAvailable = !values['no-gh']
const issueCache = new Map()
function trackingIssue(reference) {
  const match = reference.match(/^([\w.-]+\/[\w.-]+)#(\d+)$/)
  if (!match || !ghAvailable) {
    return null
  }

  if (!issueCache.has(reference)) {
    const result = spawnSync('gh', ['api', `repos/${match[1]}/issues/${match[2]}`, '--jq', '{state: .state, labels: [.labels[].name]}'], { encoding: 'utf8' })
    if (result.status !== 0) {
      ghAvailable = false
      console.warn(`Can't read ${reference} with the GitHub CLI (${result.error?.message ?? result.stderr.trim()}): labels not checked.\n`)
      return null
    }

    issueCache.set(reference, JSON.parse(result.stdout))
  }

  return issueCache.get(reference)
}

for (const reproduction of reproductions) {
  const issue = reproduction.tracking ? trackingIssue(reproduction.tracking) : null
  reproduction.issue = issue
  reproduction.label = issue ? issue.labels.find(label => UPSTREAM_LABELS.includes(label)) ?? '' : ''
}

// The "Reported upstream" comments of a tracking issue, for a page whose
// upstream reference is empty.
function reportedRefsOf(reference) {
  const [, repo, n] = reference.match(/^([\w.-]+\/[\w.-]+)#(\d+)$/)
  const result = spawnSync('gh', ['api', `repos/${repo}/issues/${n}/comments?per_page=100`, '--paginate', '--slurp'], { encoding: 'utf8' })
  return result.status === 0 ? reportedRefs(JSON.parse(result.stdout).flat()) : []
}

// Each page's data-status follows its tracking issue's label (see
// scripts/lib/repro-status.mjs). The nightly canary commits what changed.
const synced = []
for (const reproduction of reproductions.filter(({ label }) => label)) {
  const { name, label, tracking } = reproduction
  const refs = needsRefs(reproduction, label) ? reportedRefsOf(tracking) : []
  const changes = syncReproduction(name, { label, refs })
  if (changes.length > 0) {
    synced.push(`  issues/${name}/index.html: ${changes.join(', ')} (${tracking.replace(/^.*#/, '#')} is ${label})`)
  }
}

// --- Report -------------------------------------------------------------------

const number = reference => reference.match(/#(\d+)$/)?.[1]
const referencedBy = reference => {
  const n = number(reference)
  return n ? ALLOWLISTS.filter(file => new RegExp(String.raw`\bissue: ${n}\b`).test(fs.readFileSync(path.join(root, file), 'utf8'))) : []
}

const baselinesOf = name => {
  const dir = path.join(root, 'tests/visual/screenshots')
  return fs.existsSync(dir) ?
    fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter(entry => entry.isDirectory() && entry.name === name && path.basename(entry.parentPath) === 'issues')
      .map(entry => path.relative(root, path.join(entry.parentPath, entry.name))) :
    []
}

const columns = ['Reproduction', 'Result', 'Tracking', 'Label', 'Details']
const rows = reproductions.map(reproduction => [
  `issues/${reproduction.name}/`,
  reproduction.result,
  reproduction.tracking ? `#${number(reproduction.tracking)}${reproduction.issue?.state === 'closed' ? ' (closed)' : ''}` : '',
  reproduction.label || (reproduction.issue ? '(none)' : ''),
  reproduction.details
])
const widths = columns.map((column, index) => Math.max(column.length, ...rows.map(row => index === columns.length - 1 ? 0 : row[index].length)))
const line = row => row.map((cell, index) => index === columns.length - 1 ? cell : cell.padEnd(widths[index])).join('  ').trimEnd()
console.log(line(columns))
console.log(line(widths.map(width => '-'.repeat(width))))
for (const row of rows) {
  console.log(line(row))
}

const counts = Object.fromEntries(['PASS', 'FAIL', 'SKIP', 'NONE', 'ERROR'].map(result => [result, reproductions.filter(reproduction => reproduction.result === result).length]))
console.log(`\n${reproductions.length} reproduction(s): ${Object.entries(counts).filter(([, count]) => count > 0).map(([result, count]) => `${count} ${result}`).join(', ')}`)

if (synced.length > 0) {
  console.log(`\nUpstream status updated to follow the tracking issues' labels:\n${synced.join('\n')}`)
}

let problems = 0
for (const reproduction of reproductions) {
  const { name, result, tracking, issue, label } = reproduction
  const n = number(tracking)
  const prefix = `issues/${name}/`
  if (result === 'PASS') {
    problems++
    console.log(`\n✗ ${prefix} passes now: the bug may be fixed. Check the page by hand, then step 3 of "Upstream issue tracking" in CLAUDE.md:`)
    if (issue?.state === 'closed') {
      console.log(`    ${tracking} is already closed${label ? ` (${label})` : ''}.`)
    } else if (n) {
      const from = label || '<label>'
      console.log(`    gh issue edit ${n} --remove-label ${from} --add-label upstream-fixed`)
      console.log(`    gh issue close ${n} --reason completed --comment "Fixed upstream in twbs/bootstrap#<pr> (<commit>)"`)
      if (label === 'upstream') {
        console.log('    (never reported upstream: name the commit that fixed it)')
      }
    } else {
      console.log('    The page names no tracking issue: find it, then relabel and close it.')
    }

    const baselines = baselinesOf(name)
    console.log(`    git rm -r issues/${name}${baselines.length > 0 ? ` 'tests/visual/screenshots/*/issues/${name}'   # ${baselines.length} visual baseline folder(s)` : ''}`)
    const left = n ? referencedBy(tracking) : []
    if (left.length > 0) {
      console.log(`    and remove its entries (issue: ${n}) from ${left.join(', ')}`)
    }
  } else if (result === 'FAIL' && issue?.state === 'closed') {
    problems++
    console.log(`\n✗ ${prefix} still fails, but ${tracking} is closed${label ? ` (${label})` : ''}: the bug is back or was never fixed. Reopen it, or fix the assertion.`)
  } else if (result === 'ERROR') {
    problems++
    console.log(`\n✗ ${prefix} ${reproduction.details}`)
  }
}

if (counts.NONE > 0) {
  console.log(`\n${counts.NONE} reproduction(s) without an assertion: add an assert.js or a repro.spec.js next to the page to know when the fix lands (see "Assertions" in docs/pages.md).`)
}

if (problems === 0) {
  console.log('\n✓ No reproduction passes: every tracked bug is still there.')
}

process.exitCode = problems > 0 ? 1 : 0
