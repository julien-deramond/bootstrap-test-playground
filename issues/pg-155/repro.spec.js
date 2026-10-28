// Fixed when the datepicker keeps firing its events after Escape: hide then
// hidden when Escape closes the popup, then show and shown when the next click
// opens it again. Today Vanilla Calendar Pro closes and reopens the popup
// itself, so Bootstrap's show()/hide() never run and no event comes after the
// first open.
import { test } from '../../tests/issues/fixtures.js'

test('the datepicker fires its events after Escape', async ({ page, repro }) => {
  await repro.open()

  const input = page.locator('#datepicker1')
  await page.evaluate(() => {
    window.__datepickerEvents = []
    const input = document.getElementById('datepicker1')
    for (const name of ['show', 'shown', 'hide', 'hidden']) {
      input.addEventListener(`${name}.bs.datepicker`, () => window.__datepickerEvents.push(name))
    }
  })
  const events = () => page.evaluate(() => window.__datepickerEvents.splice(0))

  await input.click()
  await page.waitForTimeout(500)
  const opened = await events()

  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  const closed = await events()

  await input.click()
  await page.waitForTimeout(500)
  const reopened = await events()

  const expected = [['show', 'shown'], ['hide', 'hidden'], ['show', 'shown']]
  const actual = [opened, closed, reopened]
  const pass = JSON.stringify(actual) === JSON.stringify(expected)
  repro.verdict(pass, `open: [${opened}], Escape: [${closed}], open again: [${reopened}]`)
})
