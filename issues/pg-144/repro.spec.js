// Fixed when the fake caret of a focused OTP slot stops blinking under
// prefers-reduced-motion: reduce. The caret is the ::after of
// `.otp-slot-active:not(.otp-slot-filled)`, which only exists once the hidden
// input has focus, so this needs a real focus and an emulated media query.
// Today `otp-caret-blink` runs regardless. The control case (no reduced
// motion) shows the caret does animate, so a "none" verdict can't come from a
// missing caret.
import { expect, test } from '../../tests/issues/fixtures.js'

const SLOT = '[data-playground-repro] .otp-slot-active:not(.otp-slot-filled)'

const caretStyle = slot => slot.evaluate(element => {
  const style = getComputedStyle(element, '::after')
  return { name: style.animationName, opacity: style.opacity, content: style.content }
})

test('the OTP caret does not blink with reduced motion', async ({ page, repro }) => {
  // Not repro.open(): its `freeze` parameter switches animations off, which is
  // exactly what this reproduction measures.
  await page.goto(`${repro.url}?chrome=0`)
  await page.waitForFunction(() => window.bootstrap && document.readyState === 'complete')
  const input = page.locator('[data-playground-repro] .otp-input').first()
  const slot = page.locator(SLOT).first()

  // Control: without reduced motion, the focused slot has the blinking caret.
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await input.focus()
  await expect(slot, 'a focused empty OTP slot should be active').toBeVisible()
  await expect.poll(async () => (await caretStyle(slot)).name, {
    message: 'the caret should animate without reduced motion',
    timeout: 5000
  }).toContain('otp-caret-blink')

  // The bug: with reduced motion, the animation still runs.
  await input.blur()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await input.focus()
  await expect(slot).toBeVisible()
  await page.waitForTimeout(300)
  const reduced = await caretStyle(slot)

  repro.verdict(
    reduced.name === 'none' && reduced.opacity !== '0',
    `reduced motion: ::after animation-name "${reduced.name}", opacity ${reduced.opacity}`
  )
})
