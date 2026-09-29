// Scans every page of the playground with axe-core, in light and dark, with
// Bootstrap's default config (configs/default/), and fails on any WCAG 2.2 A
// or AA violation. Pages load with `?chrome=0`, and whatever is still marked
// `data-playground-chrome` is left out of the scan: only Bootstrap's markup is
// checked, not the playground's own UI. Reproductions (issues/) are left out
// too, since they show bugs on purpose.
//
// Violations caused by an open upstream bug, or intended, are listed in
// known-issues.js. Each page's violations, known ones included, are attached
// to the test and written to reports/a11y/<theme>/<page>.json.
import fs from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { root } from '../../scripts/lib/configs.mjs'
import { collectPages } from '../../scripts/lib/pages.mjs'
import knownIssues from './known-issues.js'

// Every entry names the axe rule, the pages it happens on, and either the
// tracking issue of an upstream bug or the reason it's intended, never both
// (see "Upstream issue tracking" in CLAUDE.md).
for (const entry of knownIssues) {
  if (!entry.rule || !entry.pages?.length || Boolean(entry.issue) === Boolean(entry.reason)) {
    throw new Error(`tests/a11y/known-issues.js: each entry needs a \`rule\`, \`pages\` and either an \`issue\` or a \`reason\` (${entry.rule})`)
  }
}

const THEMES = ['light', 'dark']
const CONFIG = 'default'
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const SKIPPED_GROUPS = ['issues']

const urls = collectPages('/').filter(({ dir }) => !SKIPPED_GROUPS.includes(dir)).flatMap(({ pages }) => pages.map(({ url }) => url))

// `color-contrast .btn-link (#0087fe on #ffffff)` for one node of a violation.
const describe = ({ rule, selector, colors }) => `${rule} ${selector}${colors ? ` (${colors})` : ''}`

const matches = (entry, node) => entry.rule === node.rule &&
  (!entry.target || entry.target.test(node.selector)) &&
  (!entry.colors || entry.colors === node.colors)

for (const theme of THEMES) {
  test.describe(`${theme}-${CONFIG}`, () => {
    // Reduced motion, so no transition is caught halfway through.
    test.use({ colorScheme: theme, reducedMotion: 'reduce' })

    for (const url of urls) {
      test(url, async ({ page }, testInfo) => {
        // Remote resources (avatars, web fonts) aren't the playground's to fix.
        await page.route(target => target.hostname !== 'localhost', route => route.abort())

        // `freeze` fixes "today", so the datepicker's labels stay the same.
        const params = new URLSearchParams({ theme, config: CONFIG, chrome: '0', freeze: '' })
        await page.goto(`${url}?${params}`)
        await page.waitForFunction(() => !document.getElementById('playground-config-pending'))
        await page.evaluate(() => document.fonts.ready)
        // Check pages and pages/color-modes.html mark <html> until they're done.
        await page.waitForFunction(() => !('playgroundBusy' in document.documentElement.dataset), null, { timeout: 30_000 })

        const { violations } = await new AxeBuilder({ page })
          .withTags(TAGS)
          .exclude('[data-playground-chrome]')
          .analyze()

        // `colors`: the foreground and background axe measured, for color-contrast.
        const nodes = violations.flatMap(({ id, impact, help, helpUrl, nodes }) => nodes.map(({ target, html, failureSummary }) => {
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
        const known = knownIssues.filter(entry => entry.pages.includes(url) && (!entry.themes || entry.themes.includes(theme)))
        const report = nodes.map(node => {
          const entry = known.find(entry => matches(entry, node))
          return { ...node, known: entry ? entry.issue ?? entry.reason : null }
        })

        const json = JSON.stringify(report, null, 2)
        await testInfo.attach('violations.json', { body: json, contentType: 'application/json' })
        const file = path.join(root, 'reports/a11y', theme, `${url.replace(/^\/|\/$|\.html$/g, '') || 'index'}.json`)
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.writeFileSync(file, json)

        const unexpected = nodes.filter(node => !known.some(entry => matches(entry, node)))
        const gone = known.filter(entry => !nodes.some(node => matches(entry, node)))

        expect(unexpected.map(node => `${describe(node)}: ${node.help}`),
          `${url}?${params} has accessibility violations. If Bootstrap causes one, open a tracking issue labeled \`upstream\` ` +
          '(see "Upstream issue tracking" in CLAUDE.md) and add it to tests/a11y/known-issues.js').toEqual([])
        expect(gone.map(({ issue, reason, rule, target, colors }) => [issue ? `#${issue}` : reason, rule, target, colors].filter(Boolean).join(' ')),
          'Known violations that no longer happen here: remove them from tests/a11y/known-issues.js, ' +
          'and if Bootstrap fixed them, mark the tracking issue `upstream-fixed` and close it').toEqual([])
      })
    }
  })
}
