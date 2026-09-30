#!/usr/bin/env node
// Sums up the accessibility scan per config, from the reports it writes to
// reports/a11y/<config>/<theme>/<page>.json: how many pages were scanned, and
// for each axe rule how many elements violate it, light and dark together.
// Violations inside open overlays (tests/a11y/overlays.spec.js) and focus rings
// that fail (tests/a11y/focus.spec.js) count with their page's. Known
// violations (tests/a11y/known-issues.js) are counted too, and the "Not
// allowlisted" column says how many aren't, so configs compare at a glance. In
// GitHub Actions, the table also goes to the job summary.
// Usage: npm run a11y-summary

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Not from lib/configs.mjs, which loads PostCSS: a11y.yml's summary job runs
// this without `npm ci`.
const reportsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../reports/a11y')

function jsonFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name)
    return entry.isDirectory() ? jsonFiles(file) : entry.name.endsWith('.json') ? [file] : []
  })
}

if (!fs.existsSync(reportsDir)) {
  console.error('No reports/a11y/: run `npm run test:a11y` first.')
  process.exit(1)
}

const configs = fs.readdirSync(reportsDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(({ name }) => {
    const reports = jsonFiles(path.join(reportsDir, name))
    const rules = {}
    let unknown = 0
    for (const file of reports) {
      for (const node of JSON.parse(fs.readFileSync(file, 'utf8'))) {
        rules[node.rule] = (rules[node.rule] ?? 0) + 1
        unknown += node.known === null ? 1 : 0
      }
    }

    // Pages, not page × theme, and a page's open overlays (<theme>/open/) and
    // focus rings (<theme>/focus/) count with it.
    return { name, pages: new Set(reports.map(file => path.relative(path.join(reportsDir, name), file).split(path.sep).slice(1).filter((part, index) => index > 0 || !['open', 'focus'].includes(part)).join('/'))).size, rules, unknown }
  })
  .sort((a, b) => (a.name === 'default' ? -1 : b.name === 'default' ? 1 : a.name.localeCompare(b.name)))

const ruleNames = [...new Set(configs.flatMap(({ rules }) => Object.keys(rules)))].sort()
const rows = [
  ['Config', 'Pages', ...ruleNames.map(rule => `\`${rule}\``), 'Not allowlisted'],
  ['---', '---:', ...ruleNames.map(() => '---:'), '---:'],
  ...configs.map(({ name, pages, rules, unknown }) => [
    name,
    pages,
    ...ruleNames.map(rule => rules[rule] ?? ''),
    unknown ? `**${unknown}**` : ''
  ])
]
const table = rows.map(row => `| ${row.join(' | ')} |`).join('\n')

console.log(`Violating elements per config and rule, light and dark together:\n\n${table}`)

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Accessibility scan per config\n\nViolating elements per axe rule, light and dark together, known ones included.\n\n${table}\n`)
}
