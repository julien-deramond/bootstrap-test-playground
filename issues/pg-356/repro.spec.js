// Fixed when Tab on the last control of a popup datepicker's calendar closes
// the calendar and moves focus to the input's next tab stop, with or without a
// selected day. Today focus leaves the document: the popup is the last child
// of <body>, the calendar stays open and the next Tab starts from the top.
import { test } from '../../tests/issues/fixtures.js'

const MAX_PRESSES = 12

test('Tab past the calendar reaches the next tab stop and closes the popup', async ({ page, repro }) => {
  await repro.open()
  const results = []

  for (const [input, next, select] of [['#empty', '#after-empty', false], ['#selected', '#after-selected', true]]) {
    await page.reload()
    await page.waitForFunction(() => window.bootstrap && document.readyState === 'complete')
    await page.locator(input).focus()

    if (select) {
      // A calendar with a selected day: pick one, leave the input, come back.
      await page.locator('[data-vc-date-btn]:not([disabled])').nth(10).click()
      await page.locator(next).focus()
      await page.locator(input).focus()
    }

    // Tab through the calendar until focus is on the next stop, or has left the
    // input and its popup for somewhere else.
    let landed = 'the document was left'
    let reached = false
    for (let press = 1; press <= MAX_PRESSES; press++) {
      await page.keyboard.press('Tab')
      const active = await page.evaluate(() => {
        const element = document.activeElement
        if (!element || element === document.body) {
          return { id: '', inPopup: false, body: true }
        }

        return { id: element.id, inPopup: Boolean(element.closest('[data-vc="calendar"]')), body: false }
      })

      if (active.id === next.slice(1)) {
        reached = true
        landed = `${next} after ${press} presses`
        break
      }

      if (!active.inPopup && active.id !== input.slice(1)) {
        landed = active.body ? 'focus left the document' : `focus went to #${active.id}`
        break
      }
    }

    const open = await page.evaluate(() => Boolean(document.querySelector('[data-vc="calendar"]:not([data-vc-calendar-hidden])')))
    results.push({ input, ok: reached && !open, details: `${input}: ${landed}, popup ${open ? 'still open' : 'closed'}` })
  }

  repro.verdict(results.every(result => result.ok), results.map(result => result.details).join('; '))
})
