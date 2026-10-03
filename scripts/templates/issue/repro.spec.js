// What "fixed" looks like for issues/__NAME__/, as a Playwright spec: for a bug
// that needs the keyboard, the viewport or a forced pseudo-class, which an
// in-page assert.js can't do. `npm run check-issues` and the `issues` project
// (`npm run test:issues`) run it. The fixture is documented in
// tests/issues/fixtures.js: `repro.open()`, `repro.verdict(pass, details)`,
// `repro.expectFixed(details, assertions)`, `repro.screenshot(title)` and
// `repro.forcePseudoState(locator, states)`.
import { expect, test } from '../../tests/issues/fixtures.js'

test('describe what fixed looks like', async ({ page, repro }) => {
  await repro.open()
  const button = page.locator('[data-playground-repro] .btn-solid').first()
  await page.keyboard.press('Tab')

  // Until the spec is written, it reports SKIP. Then either compute the
  // verdict, true when the bug is gone…
  //   const outline = await button.evaluate(element => getComputedStyle(element).outlineStyle)
  //   repro.verdict(outline !== 'none', `outline-style: ${outline}`)
  // …or make the assertions that hold once it's fixed:
  //   await repro.expectFixed('the focused button shows a ring', async () => {
  //     await expect(button).toHaveCSS('outline-style', 'solid')
  //   })
  await expect(button).toBeVisible()
  repro.verdict(null, 'no verdict yet: describe what fixed looks like in repro.spec.js')
})
