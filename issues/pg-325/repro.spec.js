// Fixed when, in RTL, ← selects the next tab (the one on its left) and → the
// previous one, like the tabs' own visual order. Today Tab._keydown() sets
// isNext from ArrowRight and ArrowDown without checking isRTL(): ← selects the
// previous tab. A control run in LTR must keep → as the next tab, so a fix
// cannot break it.
import { test } from '../../tests/issues/fixtures.js'

test('the arrow keys follow the reading direction in RTL, and stay as they are in LTR', async ({ page, repro }) => {
  const tabs = page.locator('[data-playground-repro] [role="tab"]')

  // From the first tab, the next one is the second and the previous wraps to
  // the last, so the two can't be mistaken for each other.
  const selectedAfter = async (params, key) => {
    await repro.open(params)
    await tabs.first().focus()
    await page.keyboard.press(key)
    return tabs.evaluateAll(list => list.findIndex(tab => tab.getAttribute('aria-selected') === 'true'))
  }

  const ltrRight = await selectedAfter('', 'ArrowRight')
  const rtlLeft = await selectedAfter('dir=rtl', 'ArrowLeft')
  const rtlRight = await selectedAfter('dir=rtl', 'ArrowRight')

  // Tabs are 0-based: from the first tab (0), the next one is 1, the previous one 2 (wrap).
  const ok = ltrRight === 1 && rtlLeft === 1 && rtlRight === 2
  repro.verdict(ok, `from the first tab, LTR → selects tab ${ltrRight + 1} (second expected); RTL ← selects tab ${rtlLeft + 1} (second, the next one, expected); RTL → selects tab ${rtlRight + 1} (third, the previous one wrapping, expected)`)
})
