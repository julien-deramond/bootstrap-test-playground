// Fixed when a pressed checkbox follows --bs-check-active-bg and
// --bs-check-active-border-color, or when Bootstrap no longer declares them.
// Today `.check` has no :active rule: the tokens are declared and never read,
// so a checkbox that sets them to red stays the same color while it is held.
import { test } from '../../tests/issues/fixtures.js'

const RED = 'rgb(255, 0, 0)'

test('a pressed checkbox follows the active tokens, or the tokens are gone', async ({ page, repro }) => {
  await repro.open()

  // A .check without an override shows whether Bootstrap still declares the tokens.
  const declared = await page.locator('#default').evaluate(element => {
    const style = getComputedStyle(element)
    return ['--bs-check-active-bg', '--bs-check-active-border-color'].some(token => style.getPropertyValue(token).trim() !== '')
  })

  const box = await page.locator('#pressed').boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()

  const colors = await page.locator('#pressed').evaluate(element => {
    const style = getComputedStyle(element)
    return { bg: style.backgroundColor, border: style.borderColor }
  })

  // Release away from the checkbox so it isn't toggled.
  await page.mouse.move(0, 0)
  await page.mouse.up()

  const follows = colors.bg === RED && colors.border === RED
  repro.verdict(!declared || follows, `tokens ${declared ? 'declared' : 'removed'}; pressed background ${colors.bg}, border ${colors.border}`)
})
