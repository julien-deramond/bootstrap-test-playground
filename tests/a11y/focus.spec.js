// Focuses every component of pages/focus.html, one at a time, on every
// surface, and measures its focus indicator the way WCAG 2.4.13 does: the
// pixels whose focused and unfocused colors contrast at least 3:1 must cover
// at least a 2px thick perimeter of the component. A ring that fails is a
// `focus-appearance` violation, named `<surface> <component>` (`bg-1
// btn-solid-primary`), with the most common change as its colors (`#9ec5fe on
// #ffffff`: the ring on the surface). A component that doesn't match
// :focus-visible once focused fails the test.
//
// Runs with the same configs and scope as a11y.spec.js (A11Y_CONFIGS,
// A11Y_SCOPE). Known violations are the `focus-appearance` entries of
// known-issues.js, and the report goes to
// reports/a11y/<config>/<theme>/focus/pages/focus.json.
import { expect, test } from '@playwright/test'
import { FOCUS_URL, SURFACES, captureSurface, measureRings, toBase64 } from './focus.js'
import { ALL_CONFIGS, FOCUS_RULE, THEMES, describe, describeEntry, expectedWith, goneMessage, knownOn, load, matches, report, unexpectedMessage } from './shared.js'

const list = (name, fallback) => (process.env[name] || fallback).split(',').map(value => value.trim()).filter(Boolean)

const CONFIGS = process.env.A11Y_CONFIGS === 'all' ? ALL_CONFIGS : list('A11Y_CONFIGS', 'default')

const scope = process.env.A11Y_SCOPE ? JSON.parse(process.env.A11Y_SCOPE) : { full: true }
const inScope = config => scope.full || config === 'default' || scope.configs.includes(config) || scope.urls.includes(FOCUS_URL)

const HELP = 'Focus indicator must change at least a 2px perimeter of the component with 3:1 contrast (WCAG 2.4.13)'

// Loads the page with a config and measures every ring. Returns the rings that
// fail, as violations, and the components that didn't get :focus-visible.
async function check(page, theme, config) {
  const params = await load(page, FOCUS_URL, theme, config)
  const nodes = []
  const unfocusable = []
  for (const surface of SURFACES) {
    const capture = await captureSurface(page, surface)
    const rings = await page.evaluate(measureRings, toBase64(capture))
    for (const [index, { name, focusVisible }] of capture.items.entries()) {
      const { covered, required, colors, contrast } = rings[index]
      if (!focusVisible) {
        unfocusable.push(`${surface} ${name}`)
      } else if (covered < required) {
        nodes.push({
          rule: FOCUS_RULE,
          selector: `${surface} ${name}`,
          ...(colors ? { colors } : {}),
          help: HELP,
          summary: `${covered} of ${required} pixels at 3:1, most common change ${colors ?? 'none'} (${contrast}:1)`
        })
      }
    }
  }

  return { params, nodes, unfocusable }
}

test.describe('focus', () => {
  for (const config of CONFIGS.filter(inScope)) {
    for (const theme of THEMES) {
      test.describe(`${theme}-${config}`, () => {
        test.use({ colorScheme: theme, reducedMotion: 'reduce' })

        test(FOCUS_URL, async ({ page }, testInfo) => {
          test.setTimeout(180_000)
          const { params, nodes, unfocusable } = await check(page, theme, config)
          const known = knownOn(FOCUS_URL, theme, config, 'focus')
          const entryOf = new Map(nodes.map(node => [node, known.find(entry => matches(entry, node))]))

          // Like a11y.spec.js: a component whose ring fails with the default
          // config too, under a known entry, is that entry's here too,
          // whatever its colors.
          if (config !== 'default' && nodes.some(node => !entryOf.get(node))) {
            const defaults = knownOn(FOCUS_URL, theme, 'default', 'focus')
            const inherited = new Map()
            for (const node of (await check(page, theme, 'default')).nodes) {
              const entry = defaults.find(entry => matches(entry, node))
              if (entry) {
                inherited.set(node.selector, entry)
              }
            }

            for (const node of nodes) {
              entryOf.set(node, entryOf.get(node) ?? inherited.get(node.selector))
            }
          }

          await report(testInfo, { config, theme, url: FOCUS_URL, state: 'focus' }, nodes.map(node => {
            const entry = entryOf.get(node)
            return { ...node, known: entry ? entry.issue ?? entry.reason : null }
          }))

          const unexpected = nodes.filter(node => !entryOf.get(node))
          const gone = known.filter(entry => expectedWith(entry, config) && !nodes.some(node => matches(entry, node)))

          expect(unfocusable, 'Components that don\'t match :focus-visible once focused').toEqual([])
          expect(unexpected.map(node => `${describe(node)}: ${node.summary}`), unexpectedMessage(`${FOCUS_URL}?${params} with each component focused`)).toEqual([])
          expect(gone.map(describeEntry), goneMessage).toEqual([])
        })
      })
    }
  }
})
