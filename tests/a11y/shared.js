// What the accessibility scans share: the axe rules, loading a page with a
// config, turning axe's results into one node per violating element, matching
// them with known-issues.js and writing the reports.
import fs from 'node:fs'
import path from 'node:path'
import { listConfigs, root } from '../../scripts/lib/configs.mjs'
import { collectPages } from '../../scripts/lib/pages.mjs'
import knownIssues from './known-issues.js'

export const THEMES = ['light', 'dark']
export const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
// axe's best practices (headings, landmarks, tabindex…): not WCAG failures, so
// they get a scan and a report of their own.
export const BEST_PRACTICE_TAGS = ['best-practice']
export const BEST_PRACTICE = 'best-practice'
// `page-has-heading-one` looks for a visible <h1>. The kitchen sink's and the
// pages' only <h1> is in the playground's own header, which `?chrome=0` hides
// and the scan leaves out, so the rule can't tell anything there. The screens
// have no such header and keep it.
export const bestPracticeRulesOff = url => /^\/(kitchen-sink|pages)\//.test(url) ? ['page-has-heading-one'] : []

// The pages the scans cover: every page but the reproductions (issues/), which
// show bugs on purpose.
const SKIPPED_GROUPS = ['issues']
export const PAGES = collectPages('/').filter(({ dir }) => !SKIPPED_GROUPS.includes(dir)).flatMap(({ pages }) => pages.map(({ url }) => url))

// Builds of part of Bootstrap leave most pages unstyled on purpose, where
// unstyled links and controls fail target-size and contrast for no reason.
// Their own pages (pages/grid-only.html…) load their config whatever
// `?config` says, so the default config's run scans those.
const PARTIAL_BUILDS = ['grid-only', 'partial', 'reboot-only', 'utilities-only']
export const ALL_CONFIGS = listConfigs().map(({ name }) => name).filter(name => !PARTIAL_BUILDS.includes(name))

// The focus ring check's own rule (focus.spec.js), the pairing contrast
// check's (contrast.spec.js) and the Tab walk's (tab-walk.spec.js), which axe
// doesn't have.
export const FOCUS_RULE = 'focus-appearance'
export const CONTRAST_RULE = 'pairing-contrast'
// The focus obscured check's (focus-obscured.spec.js, WCAG 2.4.11).
export const OBSCURED_RULE = 'focus-obscured'
export const TAB_RULES = ['keyboard-trap', 'hidden-stop', 'skipped-stop', 'focus-not-visible', 'reverse-order']
// The reflow check's three (reflow.spec.js: reflow at 320px, text spacing and
// 200% text).
export const REFLOW_RULE = 'reflow'
export const TEXT_SPACING_RULE = 'text-spacing'
export const RESIZE_TEXT_RULE = 'resize-text'
export const DIRS = ['ltr', 'rtl']

// A comma-separated environment variable as a list.
export const list = (name, fallback) => (process.env[name] || fallback).split(',').map(value => value.trim()).filter(Boolean)

// The directions the page scan, the open overlays' scan and the focus ring
// check run in: A11Y_DIRS (default: ltr). The Tab walk runs in both, always.
export const A11Y_DIRS = list('A11Y_DIRS', 'ltr')
const unknownDirs = A11Y_DIRS.filter(dir => !DIRS.includes(dir))
if (!A11Y_DIRS.length || unknownDirs.length) {
  throw new Error(`A11Y_DIRS takes 'ltr', 'rtl' or both, separated by a comma (${process.env.A11Y_DIRS})`)
}

// The theme's folder and test name suffix: unchanged in LTR, so existing
// report paths and `-g` patterns keep working.
export const dirSuffix = dir => dir === 'rtl' ? '-rtl' : ''

// Every entry names the axe rule, the pages it happens on, and either the
// tracking issue of an upstream bug or the reason it's intended, never both
// (see "Upstream issue tracking" in CLAUDE.md). `configs` must name existing
// configs, `state` can only be `open` or `best-practice`, and `dirs`, for any
// rule, `ltr` or `rtl` (default: both).
for (const entry of knownIssues) {
  if (!entry.rule || !entry.pages?.length || Boolean(entry.issue) === Boolean(entry.reason)) {
    throw new Error(`tests/a11y/known-issues.js: each entry needs a \`rule\`, \`pages\` and either an \`issue\` or a \`reason\` (${entry.rule})`)
  }

  const unknown = entry.configs?.filter(config => !ALL_CONFIGS.includes(config)) ?? []
  if (entry.configs && (!entry.configs.length || unknown.length)) {
    throw new Error(`tests/a11y/known-issues.js: \`configs\` must list existing configs (${entry.rule}: ${unknown.join(', ')})`)
  }

  if (entry.state !== undefined && !['open', BEST_PRACTICE].includes(entry.state)) {
    throw new Error(`tests/a11y/known-issues.js: \`state\` can only be 'open' or '${BEST_PRACTICE}' (${entry.rule}: ${entry.state})`)
  }

  if (entry.dirs !== undefined && (!entry.dirs.length || entry.dirs.some(dir => !DIRS.includes(dir)))) {
    throw new Error(`tests/a11y/known-issues.js: \`dirs\` lists 'ltr' or 'rtl' (${entry.rule}: ${entry.dirs})`)
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
// belongs to the open overlays' scan, one with `state: 'best-practice'` to the
// best practices scan, a FOCUS_RULE entry to the focus ring
// check (`focus`), a CONTRAST_RULE entry to the pairing contrast check
// (`contrast`), an OBSCURED_RULE entry to the focus obscured check
// (`obscured`), a TAB_RULES entry to the Tab walk (`tab`), a REFLOW_RULE,
// TEXT_SPACING_RULE or RESIZE_TEXT_RULE entry to the reflow check (`reflow`),
// the others to the page's. `dir` picks the entries whose `dirs` include the
// scan's direction; an entry without `dirs` applies to both.
const appliesTo = (entry, config) => !entry.configs || entry.configs.includes(config)
export const expectedWith = (entry, config) => entry.configs ? entry.configs.includes(config) : config === 'default'
const scanOf = entry => ({ [FOCUS_RULE]: 'focus', [CONTRAST_RULE]: 'contrast', [OBSCURED_RULE]: 'obscured', [REFLOW_RULE]: 'reflow', [TEXT_SPACING_RULE]: 'reflow', [RESIZE_TEXT_RULE]: 'reflow' })[entry.rule] ?? (TAB_RULES.includes(entry.rule) ? 'tab' : entry.state ?? 'closed')

export const knownOn = (url, theme, config, state = 'closed', dir = undefined) => knownIssues.filter(entry => entry.pages.includes(url) &&
  scanOf(entry) === state && appliesTo(entry, config) && (!entry.themes || entry.themes.includes(theme)) && (!entry.dirs || !dir || entry.dirs.includes(dir)))

// Loads a page with a config and theme, ready to scan. `extra` adds URL
// parameters, like `dir: 'rtl'`.
export async function load(page, url, theme, config, extra = {}) {
  // Remote resources (avatars, web fonts) aren't the playground's to fix.
  await page.route(target => target.hostname !== 'localhost', route => route.abort())
  // `freeze` fixes "today", so the datepicker's labels stay the same.
  const params = new URLSearchParams({ theme, config, chrome: '0', freeze: '', ...extra })
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
// reports/a11y/<config>/<theme>[-rtl]/[open/|focus/|contrast/|obscured/|reflow/|best-practice/|tab/|tab-rtl/]<page>.json.
export async function report(testInfo, { config, theme, url, state = 'closed', dir = 'ltr' }, nodes) {
  const json = JSON.stringify(nodes, null, 2)
  await testInfo.attach('violations.json', { body: json, contentType: 'application/json' })
  const name = `${url.replace(/^\/|\/$|\.html$/g, '') || 'index'}.json`
  const file = path.join(root, 'reports/a11y', config, `${theme}${dirSuffix(dir)}`, ...(state === 'closed' ? [] : [state]), name)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, json)
}

export const unexpectedMessage = where => `${where} has accessibility violations. If Bootstrap causes one, open a tracking issue labeled \`upstream\` ` +
  '(see "Upstream issue tracking" in CLAUDE.md) and add it to tests/a11y/known-issues.js'
export const goneMessage = 'Known violations that no longer happen here: remove them from tests/a11y/known-issues.js, ' +
  'and if Bootstrap fixed them, mark the tracking issue `upstream-fixed` and close it'
export const describeEntry = ({ issue, reason, rule, target, colors }) => [issue ? `#${issue}` : reason, rule, target, colors].filter(Boolean).join(' ')
