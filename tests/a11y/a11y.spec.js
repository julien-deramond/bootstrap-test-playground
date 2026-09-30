// Scans every page of the playground with axe-core, in light and dark, with
// Bootstrap's default config (configs/default/) or the configs A11Y_CONFIGS
// names, and fails on any WCAG 2.2 A or AA violation. Pages load with `?chrome=0`, and whatever is still marked
// `data-playground-chrome` is left out of the scan: only Bootstrap's markup is
// checked, not the playground's own UI. Reproductions (issues/) are left out
// too, since they show bugs on purpose. axe skips what's hidden, so the
// overlays (menus, dialogs, tooltips…) get a scan of their own, open:
// overlays.spec.js. Focus rings get a check of their own too: focus.spec.js,
// and color pairings: contrast.spec.js.
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
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { collectPages } from '../../scripts/lib/pages.mjs'
import { ALL_CONFIGS, TAGS, THEMES, describe, describeEntry, expectedWith, goneMessage, knownOn, load, matches, report, toNodes, unexpectedMessage } from './shared.js'

const list = (name, fallback) => (process.env[name] || fallback).split(',').map(value => value.trim()).filter(Boolean)

const CONFIGS = process.env.A11Y_CONFIGS === 'all' ? ALL_CONFIGS : list('A11Y_CONFIGS', 'default')

const SKIPPED_GROUPS = ['issues']

const urls = collectPages('/').filter(({ dir }) => !SKIPPED_GROUPS.includes(dir)).flatMap(({ pages }) => pages.map(({ url }) => url))

const scope = process.env.A11Y_SCOPE ? JSON.parse(process.env.A11Y_SCOPE) : { full: true }
const inScope = (config, url) => scope.full || config === 'default' || scope.configs.includes(config) || scope.urls.includes(url)

// Loads a page with a config and returns what axe finds, one node per
// violating element.
async function scan(page, url, theme, config) {
  const params = await load(page, url, theme, config)
  const { violations } = await new AxeBuilder({ page })
    .withTags(TAGS)
    .exclude('[data-playground-chrome]')
    // pages/contrast.html's tables, which show failing pairings on purpose:
    // contrast.spec.js checks them.
    .exclude('[data-contrast-check]')
    .analyze()

  return { params, nodes: toNodes(violations) }
}

for (const config of CONFIGS) {
  for (const theme of THEMES) {
    test.describe(`${theme}-${config}`, () => {
      // Reduced motion, so no transition is caught halfway through.
      test.use({ colorScheme: theme, reducedMotion: 'reduce' })

      for (const url of urls.filter(url => inScope(config, url))) {
        test(url, async ({ page }, testInfo) => {
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

          await report(testInfo, { config, theme, url }, nodes.map(node => {
            const entry = entryOf.get(node)
            return { ...node, known: entry ? entry.issue ?? entry.reason : null }
          }))

          const unexpected = nodes.filter(node => !entryOf.get(node))
          const gone = known.filter(entry => expectedWith(entry, config) && !nodes.some(node => matches(entry, node)))

          expect(unexpected.map(node => `${describe(node)}: ${node.help}`), unexpectedMessage(`${url}?${params}`)).toEqual([])
          expect(gone.map(describeEntry), goneMessage).toEqual([])
        })
      }
    })
  }
}
