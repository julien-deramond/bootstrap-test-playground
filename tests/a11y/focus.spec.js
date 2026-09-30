// Focuses every component of pages/focus.html, one at a time, on every
// surface, and measures its focus indicator the way WCAG 2.4.13 does: the
// pixels whose focused and unfocused colors contrast at least 3:1 must cover
// at least a 2px band along the component's edge. A ring that fails is a
// `focus-appearance` violation, named `<surface> <component>` (`bg-1
// btn-solid-primary`), with the most common change as its colors (`#9ec5fe on
// #ffffff`: the ring on the surface). A component that doesn't match
// :focus-visible once focused fails the test.
//
// Runs with the default config, when A11Y_CONFIGS includes it (`all` does):
// 736 screenshots per color mode take a while, and what a config does to the
// rings shows in the visual suite's captures (tests/visual/focus.spec.js).
// Known violations are the `focus-appearance` entries of known-issues.js, and
// the report goes to reports/a11y/default/<theme>/focus/pages/focus.json.
import { expect, test } from '@playwright/test'
import { FOCUS_URL, SURFACES, captureSurface, measureRings, toBase64 } from './focus.js'
import { FOCUS_RULE, THEMES, describe, describeEntry, expectedWith, goneMessage, knownOn, load, matches, report, unexpectedMessage } from './shared.js'

const CONFIG = 'default'
const runs = process.env.A11Y_CONFIGS === 'all' || (process.env.A11Y_CONFIGS || CONFIG).split(',').map(value => value.trim()).includes(CONFIG)

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
  test.skip(!runs, `A11Y_CONFIGS leaves out the ${CONFIG} config`)

  for (const theme of THEMES) {
    test.describe(`${theme}-${CONFIG}`, () => {
      test.use({ colorScheme: theme, reducedMotion: 'reduce' })

      test(FOCUS_URL, async ({ page }, testInfo) => {
        test.setTimeout(180_000)
        const { params, nodes, unfocusable } = await check(page, theme, CONFIG)
        const known = knownOn(FOCUS_URL, theme, CONFIG, 'focus')
        const entryOf = new Map(nodes.map(node => [node, known.find(entry => matches(entry, node))]))
        await report(testInfo, { config: CONFIG, theme, url: FOCUS_URL, state: 'focus' }, nodes.map(node => {
          const entry = entryOf.get(node)
          return { ...node, known: entry ? entry.issue ?? entry.reason : null }
        }))

        const unexpected = nodes.filter(node => !entryOf.get(node))
        const gone = known.filter(entry => expectedWith(entry, CONFIG) && !nodes.some(node => matches(entry, node)))

        expect(unfocusable, 'Components that don\'t match :focus-visible once focused').toEqual([])
        expect(unexpected.map(node => `${describe(node)}: ${node.summary}`), unexpectedMessage(`${FOCUS_URL}?${params} with each component focused`)).toEqual([])
        expect(gone.map(describeEntry), goneMessage).toEqual([])
      })
    })
  }
})
