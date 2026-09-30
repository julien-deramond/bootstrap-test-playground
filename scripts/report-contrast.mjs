#!/usr/bin/env node
// Measures the contrast of every documented color pairing and of the
// components that embed one, per config and color mode, with
// pages/contrast.html, and writes the results.
// Usage: npm run report:contrast [-- --config <name>[,<name>…]]
//
// Every config but the partial builds by default. Each config's page measures
// light, dark and the config's custom color modes. Writes
// reports/contrast/<config>.json (every measurement) and <config>.md (a table
// per mode), and reports/contrast/README.md, the failures per config and mode.
// A failure is under WCAG AA's 4.5:1, disabled controls aside. The Known
// column names the tracking issue, or the reason, of its entry in
// tests/a11y/known-issues.js, where the accessibility scan
// (tests/a11y/contrast.spec.js) looks them up too.
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'
import { root } from './lib/configs.mjs'
import { ALL_CONFIGS, CONTRAST_RULE, knownOn, matches } from '../tests/a11y/shared.js'

const URL = '/pages/contrast.html'
const GROUPS = { theme: 'Theme colors', surface: 'Body and surfaces', component: 'Components' }

const option = process.argv.indexOf('--config')
const configs = option === -1 ? ALL_CONFIGS : process.argv[option + 1].split(',').map(name => name.trim())
const unknown = configs.filter(name => !ALL_CONFIGS.includes(name))
if (unknown.length) {
  console.error(`Unknown or partial configs: ${unknown.join(', ')}`)
  process.exit(1)
}

const reportsDir = path.join(root, 'reports/contrast')
fs.mkdirSync(reportsDir, { recursive: true })

// The known-issues.js entry of a failure, with the config's own entries first.
const knownFor = (config, { name, mode, fg, bg }) => knownOn(URL, mode, config, 'contrast')
  .find(entry => matches(entry, { rule: CONTRAST_RULE, selector: name, colors: `${fg} on ${bg}` }))

const failed = result => !result.aa && !result.exempt

function markdown(config, { themes, modes, results }) {
  const lines = [`# Contrast: ${config}`, '', `Theme colors: ${themes.map(theme => `\`${theme}\``).join(', ')}. AA is 4.5:1 and AAA 7:1 for normal text; disabled controls are exempt.`, '']
  for (const mode of modes) {
    lines.push(`## ${mode}`, '')
    for (const [group, title] of Object.entries(GROUPS)) {
      const rows = results.filter(result => result.mode === mode && result.group === group)
      if (!rows.length) {
        continue
      }

      lines.push(`### ${title}`, '', '| Pairing | Colors | Ratio | AA | AAA | APCA Lc | Known |', '| --- | --- | --- | --- | --- | --- | --- |')
      for (const result of rows) {
        const entry = failed(result) ? knownFor(config, result) : null
        const known = entry ? (entry.issue ? `#${entry.issue}` : entry.reason) : ''
        const pass = value => (result.exempt ? 'exempt' : value ? '✓' : '**✗**')
        lines.push(`| \`${result.name}\` | \`${result.fg}\` on \`${result.bg}\` | ${result.ratio.toFixed(2)} | ${pass(result.aa)} | ${pass(result.aaa)} | ${result.apca.toFixed(1)} | ${known} |`)
      }

      lines.push('')
    }
  }

  return lines.join('\n')
}

// Silent: Vite would forward the page's console output.
const server = await createServer({ root, logLevel: 'silent', server: { port: 5191 } })
await server.listen()
const base = server.resolvedUrls.local[0].replace(/\/$/, '')
const browser = await chromium.launch()
const page = await browser.newPage()
const summary = []

try {
  for (const [index, config] of configs.entries()) {
    if (process.stdout.isTTY) {
      process.stdout.write(`\r[${index + 1}/${configs.length}] ${config}`.padEnd(60))
    }

    await page.goto(`${base}${URL}?config=${config}&chrome=0`)
    await page.waitForFunction(() => !document.getElementById('playground-config-pending') && !('playgroundBusy' in document.documentElement.dataset), null, { timeout: 60_000 })
    const data = await page.evaluate(() => window.playgroundContrast)
    fs.writeFileSync(path.join(reportsDir, `${config}.json`), JSON.stringify(data, null, 2))
    fs.writeFileSync(path.join(reportsDir, `${config}.md`), markdown(config, data))
    for (const mode of data.modes) {
      const failures = data.results.filter(result => result.mode === mode && failed(result))
      summary.push({ config, mode, failures: failures.length, unknown: failures.filter(result => !knownFor(config, result)).length })
    }
  }
} finally {
  if (process.stdout.isTTY) {
    process.stdout.write('\r'.padEnd(61) + '\r')
  }

  await browser.close()
  await server.close()
}

const table = [
  '| Config | Mode | Under 4.5:1 | Not in known-issues.js |',
  '| --- | --- | --- | --- |',
  ...summary.map(({ config, mode, failures, unknown }) => `| [${config}](${config}.md) | ${mode} | ${failures} | ${unknown} |`)
].join('\n')
fs.writeFileSync(path.join(reportsDir, 'README.md'), `# Contrast\n\nFrom \`npm run report:contrast\`. See each config's report for the pairings.\n\n${table}\n`)
console.log(table)
console.log(`\nReports in ${path.relative(root, reportsDir)}/`)
