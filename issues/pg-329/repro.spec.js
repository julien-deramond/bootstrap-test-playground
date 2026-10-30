// Fixed when ← and → move the active slot of an OTP input in RTL by one slot,
// in the direction the key points, in every engine. Today, with the slots
// running right to left over an input whose digits run left to right, Firefox
// and WebKit move the caret visually through the digits: → does nothing in
// Firefox and the active slot jumps back and forth in WebKit. Chromium moves it
// logically and matches the slots, so the bug only shows in Firefox and WebKit.
// The `issues` project runs Chromium only: there the spec reports SKIP. Run it
// in Firefox or WebKit with `npx playwright test --project=<engine>` on a
// config that runs the issues specs there (see "Assertions" in docs/pages.md).
import { test } from '../../tests/issues/fixtures.js'

test('the arrows move the active slot one slot toward where they point in RTL', async ({ page, browserName, repro }) => {
  await repro.open('dir=rtl')
  const otp = page.locator('[data-playground-repro] [data-bs-otp]').first()
  const input = otp.locator('input')
  const slots = otp.locator('.otp-slot')
  const active = () => slots.evaluateAll(list => list.findIndex(slot => slot.classList.contains('otp-slot-active')))

  await input.focus()
  await page.keyboard.type('123')

  // Which way the slots run: the first slot is right of the second in RTL. If
  // a fix keeps them left to right instead, → must then move to a later slot.
  const [first, second] = await slots.evaluateAll(list => list.slice(0, 2).map(slot => slot.getBoundingClientRect().left))
  const rightArrowStep = first > second ? -1 : 1

  let index = await active()
  const seen = []
  const expected = []
  let ok = true
  for (const key of ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft']) {
    await page.keyboard.press(key)
    const want = Math.min(3, Math.max(0, index + (key === 'ArrowRight' ? rightArrowStep : -rightArrowStep)))
    // The caret needs a moment to land in some engines.
    await page.waitForTimeout(50)
    const got = await active()
    seen.push(got)
    expected.push(want)
    ok = ok && got === want
    index = want
  }

  const details = `active slot from 123 after → → ← ← ←: ${seen.join(', ')}, expected ${expected.join(', ')} (${browserName})`

  // Chromium moves the caret logically and matches the slots: it can't show
  // the bug, so it never gives a verdict.
  if (browserName === 'chromium') {
    repro.verdict(null, `${details}; the bug only shows in Firefox and WebKit, so this engine can't tell`)
    return
  }

  repro.verdict(ok, details)
})
