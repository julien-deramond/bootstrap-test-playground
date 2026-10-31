// Fixed when Escape closes a combobox popup while focus is still on the toggle.
// Today the toggle's keydown handler only knows the arrow keys, Enter and
// Space: Escape is handled once focus is inside the popup, so it does nothing
// after a click. The control case (ArrowDown, then Escape) already works, so
// the verdict only depends on the toggle case.
import { expect, test } from '../../tests/issues/fixtures.js'

const EVENTS = ['show', 'shown', 'hide', 'hidden']

async function recordEvents(toggle) {
  await toggle.evaluate((element, names) => {
    window.comboboxEvents = []
    for (const name of names) {
      element.addEventListener(`${name}.bs.combobox`, () => window.comboboxEvents.push(name))
    }
  }, EVENTS)
}

const events = page => page.evaluate(() => window.comboboxEvents)

test('Escape closes the popup while focus is on the toggle', async ({ page, repro }) => {
  await repro.open()
  const toggle = page.locator('[data-playground-repro] [data-bs-toggle="combobox"]').first()
  await recordEvents(toggle)

  // Control: with focus moved to an option, Escape already closes the popup.
  await toggle.focus()
  await page.keyboard.press('ArrowDown')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Escape')
  await expect(toggle, 'Escape with focus on an option should close the popup').toHaveAttribute('aria-expanded', 'false')
  await page.evaluate(() => {window.comboboxEvents = []})

  // The bug: open with a click, focus stays on the toggle, Escape does nothing.
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await page.evaluate(() => {window.comboboxEvents = []})
  const focusedBefore = await toggle.evaluate(element => element === document.activeElement)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(100)

  const expanded = await toggle.getAttribute('aria-expanded')
  const focused = await toggle.evaluate(element => element === document.activeElement)
  const fired = await events(page)
  const closed = expanded === 'false' && fired.includes('hide') && fired.includes('hidden')

  repro.verdict(
    focusedBefore && closed && focused,
    `after click + Escape: aria-expanded="${expanded}", focus on the toggle: ${focused}, events: ${fired.join(', ') || 'none'}`
  )
})
