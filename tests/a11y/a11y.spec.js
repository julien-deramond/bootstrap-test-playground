// Scans every page of the playground with axe-core, in light and dark, with
// Bootstrap's default config (configs/default/) or the configs A11Y_CONFIGS
// names, and fails on any WCAG 2.2 A or AA violation. Pages load with `?chrome=0`, and whatever is still marked
// `data-playground-chrome` is left out of the scan: only Bootstrap's markup is
// checked, not the playground's own UI. Reproductions (issues/) are left out
// too, since they show bugs on purpose.
//
// Violations caused by an open upstream bug, or intended, are listed in
// known-issues.js. Each page's violations, known ones included, are attached
// to the test and written to reports/a11y/<config>/<theme>/<page>.json, which
// `npm run a11y-summary` sums up per config.
//
//   A11Y_CONFIGS=default,shadcn, or `all` for every config (default: default)
//   A11Y_SCOPE, which `npm run test-scope` prints and a11y.yml sets on pull
//   requests, limits the run to what changed: the default config on every
//   page, the changed configs on every page, and the changed pages with every
//   config. It needs A11Y_CONFIGS=all.
import fs from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { listConfigs, root } from '../../scripts/lib/configs.mjs'
import { collectPages } from '../../scripts/lib/pages.mjs'
import knownIssues from './known-issues.js'

const list = (name, fallback) => (process.env[name] || fallback).split(',').map(value => value.trim()).filter(Boolean)

const THEMES = ['light', 'dark']
const ALL_CONFIGS = listConfigs().map(({ name }) => name)
const CONFIGS = process.env.A11Y_CONFIGS === 'all' ? ALL_CONFIGS : list('A11Y_CONFIGS', 'default')

// Every entry names the axe rule, the pages it happens on, and either the
// tracking issue of an upstream bug or the reason it's intended, never both
// (see "Upstream issue tracking" in CLAUDE.md). `configs` must name existing
// configs.
for (const entry of knownIssues) {
  if (!entry.rule || !entry.pages?.length || Boolean(entry.issue) === Boolean(entry.reason)) {
    throw new Error(`tests/a11y/known-issues.js: each entry needs a \`rule\`, \`pages\` and either an \`issue\` or a \`reason\` (${entry.rule})`)
  }

  const unknown = entry.configs?.filter(config => !ALL_CONFIGS.includes(config)) ?? []
  if (entry.configs && (!entry.configs.length || unknown.length)) {
    throw new Error(`tests/a11y/known-issues.js: \`configs\` must list existing configs (${entry.rule}: ${unknown.join(', ')})`)
  }
}

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const SKIPPED_GROUPS = ['issues']

const urls = collectPages('/').filter(({ dir }) => !SKIPPED_GROUPS.includes(dir)).flatMap(({ pages }) => pages.map(({ url }) => url))

// `color-contrast .btn-link (#0087fe on #ffffff)` for one node of a violation.
const describe = ({ rule, selector, colors }) => `${rule} ${selector}${colors ? ` (${colors})` : ''}`

// An entry without `configs` is expected with the default config and allowed
// with every other one, since most configs keep its palette. An entry with
// `configs` is expected with exactly those.
const appliesTo = (entry, config) => !entry.configs || entry.configs.includes(config)
const expectedWith = (entry, config) => entry.configs ? entry.configs.includes(config) : config === 'default'

const scope = process.env.A11Y_SCOPE ? JSON.parse(process.env.A11Y_SCOPE) : { full: true }
const inScope = (config, url) => scope.full || config === 'default' || scope.configs.includes(config) || scope.urls.includes(url)

const matches = (entry, node) => entry.rule === node.rule &&
  (!entry.target || entry.target.test(node.selector)) &&
  (!entry.colors || entry.colors === node.colors)

const knownOn = (url, theme, config) => knownIssues.filter(entry => entry.pages.includes(url) && appliesTo(entry, config) && (!entry.themes || entry.themes.includes(theme)))

// Loads a page with a config and returns what axe finds, one node per
// violating element. `colors`: the foreground and background axe measured,
// for color-contrast.
async function scan(page, url, theme, config) {
  // `freeze` fixes "today", so the datepicker's labels stay the same.
  const params = new URLSearchParams({ theme, config, chrome: '0', freeze: '' })
  await page.goto(`${url}?${params}`)
  await page.waitForFunction(() => !document.getElementById('playground-config-pending'))
  await page.evaluate(() => document.fonts.ready)
  // Check pages and pages/color-modes.html mark <html> until they're done.
  await page.waitForFunction(() => !('playgroundBusy' in document.documentElement.dataset), null, { timeout: 30_000 })

  const { violations } = await new AxeBuilder({ page })
    .withTags(TAGS)
    .exclude('[data-playground-chrome]')
    .analyze()

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

  return { params, nodes }
}

for (const config of CONFIGS) {
  for (const theme of THEMES) {
    test.describe(`${theme}-${config}`, () => {
      // Reduced motion, so no transition is caught halfway through.
      test.use({ colorScheme: theme, reducedMotion: 'reduce' })

      for (const url of urls.filter(url => inScope(config, url))) {
        test(url, async ({ page }, testInfo) => {
          // Remote resources (avatars, web fonts) aren't the playground's to fix.
          await page.route(target => target.hostname !== 'localhost', route => route.abort())

          const { params, nodes } = await scan(page, url, theme, config)
          const known = knownOn(url, theme, config)
          const entryOf = new Map(nodes.map(node => [node, known.find(entry => matches(entry, node))]))

          // Most configs only shift the colors of the default config's
          // violations, which the entries' `colors` then miss. An element that
          // violates the same rule with the default config, under a known
          // entry, is that entry's here too, whatever its colors.
          if (config !== 'default' && nodes.some(node => !entryOf.get(node))) {
            const defaults = knownOn(url, theme, 'default')
            const inherited = new Map()
            for (const node of (await scan(page, url, theme, 'default')).nodes) {
              const entry = defaults.find(entry => matches(entry, node))
              if (entry) {
                inherited.set(`${node.rule} ${node.selector}`, entry)
              }
            }

            for (const node of nodes) {
              entryOf.set(node, entryOf.get(node) ?? inherited.get(`${node.rule} ${node.selector}`))
            }
          }

          const report = nodes.map(node => {
            const entry = entryOf.get(node)
            return { ...node, known: entry ? entry.issue ?? entry.reason : null }
          })

          const json = JSON.stringify(report, null, 2)
          await testInfo.attach('violations.json', { body: json, contentType: 'application/json' })
          const file = path.join(root, 'reports/a11y', config, theme, `${url.replace(/^\/|\/$|\.html$/g, '') || 'index'}.json`)
          fs.mkdirSync(path.dirname(file), { recursive: true })
          fs.writeFileSync(file, json)

          const unexpected = nodes.filter(node => !entryOf.get(node))
          const gone = known.filter(entry => expectedWith(entry, config) && !nodes.some(node => matches(entry, node)))

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
}
