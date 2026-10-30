// Fixed when, in RTL, ← shows the next slide and → the previous one, like the
// mirrored controls and the scroll direction. Today the carousel's _keydown()
// maps the keys without checking isRTL(): → shows the next slide and ← the
// previous one. A control run in LTR must keep → as the next slide, so a fix
// cannot break it.
import { test } from '../../tests/issues/fixtures.js'

test('the arrow keys follow the reading direction in RTL, and stay as they are in LTR', async ({ page, repro }) => {
  const carousel = page.locator('[data-playground-repro] .carousel').first()
  const next = carousel.locator('[data-bs-slide="next"]').first()
  const active = () => carousel.locator('.carousel-item').evaluateAll(list => list.findIndex(item => item.classList.contains('active')))

  // From the middle slide, so that "next" (the third) and "previous" (the
  // first) can't be mistaken for each other or for a loop past an end.
  const keyFromMiddle = async (params, key) => {
    await repro.open(params)
    await next.click()
    await page.waitForFunction(() => document.querySelector('[data-playground-repro] .carousel .carousel-item:nth-child(2)').classList.contains('active'), null, { timeout: 5000 })
    await page.waitForTimeout(500)
    await next.focus()
    await page.keyboard.press(key)
    // The slide scrolls in, then the active class follows.
    await page.waitForTimeout(1000)
    return active()
  }

  const ltrRight = await keyFromMiddle('', 'ArrowRight')
  const rtlLeft = await keyFromMiddle('dir=rtl', 'ArrowLeft')
  const rtlRight = await keyFromMiddle('dir=rtl', 'ArrowRight')

  // Slides are 0-based: from the second slide (1), the next one is 2, the previous one 0.
  const ok = ltrRight === 2 && rtlLeft === 2 && rtlRight === 0
  repro.verdict(ok, `from the second slide, LTR → shows slide ${ltrRight + 1} (third expected); RTL ← shows slide ${rtlLeft + 1} (third, the next one, expected); RTL → shows slide ${rtlRight + 1} (first, the previous one, expected)`)
})
