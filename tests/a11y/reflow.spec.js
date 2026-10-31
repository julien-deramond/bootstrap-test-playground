// Three WCAG checks axe can't make from the DOM, on every page of the
// playground, with the default config in light: layout doesn't depend on the
// color mode, and other configs can follow once the default is clean.
//
// - `reflow` (1.4.10): at 320×256, the page must not scroll sideways. Each
//   outermost element whose box passes the viewport's edge is a violation,
//   named `#<nearest id> <tag>.<classes>` (`#with-icons svg.bi.flex-shrink-0`).
// - `text-spacing` (1.4.12): at 1280×720, with line height 1.5, paragraph
//   spacing 2em, letter spacing .12em and word spacing .16em injected with
//   `!important`, nothing may start cutting its content (`overflow: hidden`
//   with content past its box) or overlapping another text. Only what the
//   injection adds counts, measured against the same page before it.
// - `resize-text` (1.4.4): at 1280×720 with `html { font-size: 200% }`, the
//   reflow check again, plus the clipping half of the text spacing check.
//
// One test per page, with the three checks in turn, so a page's report is one
// file: reports/a11y/default/light/reflow/<page>.json. Known violations are
// the `reflow`, `text-spacing` and `resize-text` entries of known-issues.js.
// Runs when A11Y_CONFIGS includes the default config, which `all` does.
import { expect, test } from '@playwright/test'
import { collectPages } from '../../scripts/lib/pages.mjs'
import {
  REFLOW_WIDTH, RESIZE_TEXT_CSS, TEXT_SPACING_CSS, TEXT_WIDTH, install
} from './reflow.js'
import {
  REFLOW_RULE, RESIZE_TEXT_RULE, TEXT_SPACING_RULE, describe, describeEntry, expectedWith, goneMessage, knownOn, load, matches, report, unexpectedMessage
} from './shared.js'

const CONFIG = 'default'
const THEME = 'light'
const STATE = 'reflow'
const runs = process.env.A11Y_CONFIGS === 'all' || (process.env.A11Y_CONFIGS || CONFIG).split(',').map(value => value.trim()).includes(CONFIG)

const HELP = {
  [REFLOW_RULE]: `Content must reflow at ${REFLOW_WIDTH}px wide without horizontal scrolling (WCAG 1.4.10)`,
  [TEXT_SPACING_RULE]: 'Text must survive line height 1.5, paragraph spacing 2em, letter spacing .12em and word spacing .16em without being cut or overlapping (WCAG 1.4.12)',
  [RESIZE_TEXT_RULE]: 'Text at 200% must not widen the page or get cut (WCAG 1.4.4)'
}

const SKIPPED_GROUPS = new Set(['issues'])
const urls = collectPages('/').filter(({ dir }) => !SKIPPED_GROUPS.has(dir)).flatMap(({ pages }) => pages.map(({ url }) => url))

const nodesOf = (rule, found) => found.map(node => ({ rule, help: HELP[rule], ...node }))

// Loads the page at a width and puts the helpers of reflow.js in it.
async function loadAt(page, url, width) {
  await page.setViewportSize({ width, height: width === REFLOW_WIDTH ? 256 : 720 })
  const params = await load(page, url, THEME, CONFIG)
  await page.evaluate(install)
  return params
}

// The page's `reflow` violations at 320px wide. A page that scrolls sideways
// with no element found past the edge is reported on `html`, so the failure
// still shows.
async function reflow(page, url) {
  const params = await loadAt(page, url, REFLOW_WIDTH)
  const { overflow, found } = await page.evaluate(() => window.playgroundReflow.culprits())
  const nodes = found.length || overflow <= 0 ? found : [{ selector: 'html', summary: `scrolls ${overflow}px sideways, with no element found past the edge` }]
  return { params, nodes: nodesOf(REFLOW_RULE, nodes) }
}

// The page's `text-spacing` and `resize-text` violations at 1280px wide, from
// one load: a snapshot before, then each injection measured against it.
async function spacingAndSize(page, url) {
  const params = await loadAt(page, url, TEXT_WIDTH)
  const result = await page.evaluate(({ spacing, size }) => {
    const { culprits, snapshot, diff, inject, eject, spacingMisses, fontSize } = window.playgroundReflow
    const before = snapshot()
    const baseSize = fontSize()

    inject(spacing)
    const misses = spacingMisses()
    const spaced = diff(before, snapshot())
    eject()

    inject(size)
    const doubled = fontSize() >= baseSize * 2 - 0.5
    const { overflow, found } = culprits()
    const resized = diff(before, snapshot())
    eject()

    return {
      misses, spaced, doubled, overflow, found, resized
    }
  }, { spacing: TEXT_SPACING_CSS, size: RESIZE_TEXT_CSS })

  const widened = result.found.length || result.overflow <= 0 ? result.found : [{ selector: 'html', summary: `scrolls ${result.overflow}px sideways, with no element found past the edge` }]
  return {
    params,
    misses: result.misses,
    doubled: result.doubled,
    nodes: [
      ...nodesOf(TEXT_SPACING_RULE, [...result.spaced.clipped, ...result.spaced.overlaps]),
      ...nodesOf(RESIZE_TEXT_RULE, [...widened, ...result.resized.clipped])
    ]
  }
}

test.describe(STATE, () => {
  test.skip(!runs, `A11Y_CONFIGS leaves out the ${CONFIG} config`)

  test.describe(`${THEME}-${CONFIG}`, () => {
    test.use({ colorScheme: THEME, reducedMotion: 'reduce' })

    for (const url of urls) {
      test(url, async ({ page }, testInfo) => {
        test.setTimeout(90_000)
        const narrow = await reflow(page, url)
        const wide = await spacingAndSize(page, url)
        const nodes = [...narrow.nodes, ...wide.nodes]
        const known = knownOn(url, THEME, CONFIG, STATE)
        const entryOf = new Map(nodes.map(node => [node, known.find(entry => matches(entry, node))]))
        await report(testInfo, {
          config: CONFIG, theme: THEME, url, state: STATE
        }, nodes.map(node => {
          const entry = entryOf.get(node)
          return { ...node, known: entry ? entry.issue ?? entry.reason : null }
        }))

        const unexpected = nodes.filter(node => !entryOf.get(node))
        const gone = known.filter(entry => expectedWith(entry, CONFIG) && nodes.every(node => !matches(entry, node)))

        expect(wide.misses, 'Elements whose spacing the injected text spacing styles didn\'t reach (a layered `!important` beats them)').toEqual([])
        expect(wide.doubled, 'The injected `html { font-size: 200% }` didn\'t take').toBe(true)
        expect(unexpected.map(node => `${describe(node)}: ${node.summary}`), unexpectedMessage(`${url}?${wide.params} at ${REFLOW_WIDTH}px wide, with text spacing or at 200% text`)).toEqual([])
        expect(gone.map(describeEntry), goneMessage).toEqual([])
      })
    }
  })
})
