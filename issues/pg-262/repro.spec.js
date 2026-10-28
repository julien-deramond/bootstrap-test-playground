// Fixed when the scrollable stepper can be reached from the keyboard by its
// markup: a `tabindex` other than -1 on `.stepper-overflow`, or a focusable
// element inside it. That is what axe's `scrollable-region-focusable` checks.
//
// Chromium (130+) and Firefox focus a scroll container on their own, so whether
// Tab reaches it here is recorded as information only: it never decides the
// verdict, or the bug would read as fixed while the a11y scan still fails.
import { test } from '../../tests/issues/fixtures.js'

test('a scrollable stepper is focusable from its markup', async ({ page, repro }) => {
  await repro.open()
  const overflow = page.locator('[data-playground-repro]').first().locator('.stepper-overflow')
  await overflow.waitFor({ state: 'visible', timeout: 10_000 })

  const markup = await overflow.evaluate(element => {
    const tabindex = element.getAttribute('tabindex')
    const focusable = element.querySelector('a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"]), [contenteditable]')
    return {
      scrolls: element.scrollWidth > element.clientWidth,
      tabindex,
      focusable: focusable ? focusable.tagName.toLowerCase() : null
    }
  })

  // Info only: press Tab and note whether the container (or a descendant)
  // took focus in this engine.
  let reached = false
  for (let index = 0; index < 5 && !reached; index++) {
    await page.keyboard.press('Tab')
    reached = await overflow.evaluate(element => element.contains(document.activeElement))
  }

  await repro.screenshot('scrollable stepper', { clip: await overflow.boundingBox() })

  const hasTabindex = markup.tabindex !== null && markup.tabindex.trim() !== '' && markup.tabindex.trim() !== '-1'
  const reachable = hasTabindex || markup.focusable !== null
  repro.verdict(markup.scrolls && reachable,
    `container ${markup.scrolls ? 'scrolls' : 'doesn\'t scroll'}, tabindex: ${markup.tabindex ?? 'none'}, focusable descendant: ${markup.focusable ?? 'none'}; Tab ${reached ? 'reached' : 'didn\'t reach'} the container in this engine (information only)`)
})
