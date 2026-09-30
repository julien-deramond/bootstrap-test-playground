// What the accessibility scans share: the axe rules, loading a page with a
// config, turning axe's results into one node per violating element, matching
// them with known-issues.js and writing the reports.
import fs from 'node:fs'
import path from 'node:path'
import { listConfigs, root } from '../../scripts/lib/configs.mjs'
import knownIssues from './known-issues.js'

export const THEMES = ['light', 'dark']
export const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

// Builds of part of Bootstrap leave most pages unstyled on purpose, where
// unstyled links and controls fail target-size and contrast for no reason.
// Their own pages (pages/grid-only.html…) load their config whatever
// `?config` says, so the default config's run scans those.
const PARTIAL_BUILDS = ['grid-only', 'partial', 'reboot-only', 'utilities-only']
export const ALL_CONFIGS = listConfigs().map(({ name }) => name).filter(name => !PARTIAL_BUILDS.includes(name))

// Every entry names the axe rule, the pages it happens on, and either the
// tracking issue of an upstream bug or the reason it's intended, never both
// (see "Upstream issue tracking" in CLAUDE.md). `configs` must name existing
// configs, and `state` can only be `open`.
for (const entry of knownIssues) {
  if (!entry.rule || !entry.pages?.length || Boolean(entry.issue) === Boolean(entry.reason)) {
    throw new Error(`tests/a11y/known-issues.js: each entry needs a \`rule\`, \`pages\` and either an \`issue\` or a \`reason\` (${entry.rule})`)
  }

  const unknown = entry.configs?.filter(config => !ALL_CONFIGS.includes(config)) ?? []
  if (entry.configs && (!entry.configs.length || unknown.length)) {
    throw new Error(`tests/a11y/known-issues.js: \`configs\` must list existing configs (${entry.rule}: ${unknown.join(', ')})`)
  }

  if (entry.state !== undefined && entry.state !== 'open') {
    throw new Error(`tests/a11y/known-issues.js: \`state\` can only be 'open' (${entry.rule}: ${entry.state})`)
  }
}

// `color-contrast .btn-link (#0087fe on #ffffff)` for one node of a violation.
export const describe = ({ rule, selector, colors }) => `${rule} ${selector}${colors ? ` (${colors})` : ''}`

export const matches = (entry, node) => entry.rule === node.rule &&
  (!entry.target || entry.target.test(node.selector)) &&
  (!entry.colors || entry.colors === node.colors)

// An entry without `configs` is expected with the default config and allowed
// with every other one, since most configs keep its palette. An entry with
// `configs` is expected with exactly those. An entry with `state: 'open'`
// belongs to the open overlays' scan, the others to the page's.
const appliesTo = (entry, config) => !entry.configs || entry.configs.includes(config)
export const expectedWith = (entry, config) => entry.configs ? entry.configs.includes(config) : config === 'default'

export const knownOn = (url, theme, config, state = 'closed') => knownIssues.filter(entry => entry.pages.includes(url) &&
  (entry.state ?? 'closed') === state && appliesTo(entry, config) && (!entry.themes || entry.themes.includes(theme)))

// Loads a page with a config and theme, ready to scan.
export async function load(page, url, theme, config) {
  // Remote resources (avatars, web fonts) aren't the playground's to fix.
  await page.route(target => target.hostname !== 'localhost', route => route.abort())
  // `freeze` fixes "today", so the datepicker's labels stay the same.
  const params = new URLSearchParams({ theme, config, chrome: '0', freeze: '' })
  await page.goto(`${url}?${params}`)
  await page.waitForFunction(() => !document.getElementById('playground-config-pending'))
  await page.evaluate(() => document.fonts.ready)
  // Check pages and pages/color-modes.html mark <html> until they're done.
  await page.waitForFunction(() => !('playgroundBusy' in document.documentElement.dataset), null, { timeout: 30_000 })
  return params
}

// One node per violating element of axe's results. `colors`: the foreground
// and background axe measured, for color-contrast.
export const toNodes = violations => violations.flatMap(({ id, impact, help, helpUrl, nodes }) => nodes.map(({ target, html, failureSummary }) => {
  const [, foreground, background] = failureSummary.match(/foreground color: (#\w+), background color: (#\w+)/) ?? []
  return {
    rule: id,
    selector: target.flat(Infinity).join(' '),
    ...(foreground ? { colors: `${foreground} on ${background}` } : {}),
    impact,
    help,
    helpUrl,
    html,
    summary: failureSummary
  }
}))

// Attaches the violations to the test and writes them to
// reports/a11y/<config>/<theme>/[open/]<page>.json.
export async function report(testInfo, { config, theme, url, state = 'closed' }, nodes) {
  const json = JSON.stringify(nodes, null, 2)
  await testInfo.attach('violations.json', { body: json, contentType: 'application/json' })
  const name = `${url.replace(/^\/|\/$|\.html$/g, '') || 'index'}.json`
  const file = path.join(root, 'reports/a11y', config, theme, ...(state === 'open' ? ['open'] : []), name)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, json)
}

export const unexpectedMessage = where => `${where} has accessibility violations. If Bootstrap causes one, open a tracking issue labeled \`upstream\` ` +
  '(see "Upstream issue tracking" in CLAUDE.md) and add it to tests/a11y/known-issues.js'
export const goneMessage = 'Known violations that no longer happen here: remove them from tests/a11y/known-issues.js, ' +
  'and if Bootstrap fixed them, mark the tracking issue `upstream-fixed` and close it'
export const describeEntry = ({ issue, reason, rule, target, colors }) => [issue ? `#${issue}` : reason, rule, target, colors].filter(Boolean).join(' ')
