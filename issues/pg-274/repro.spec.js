// Fixed when a carousel indicator reached from the keyboard draws the same ring
// as the carousel's previous control (.btn-icon), which uses focus-ring(): the
// same outline color, width and offset, and the same box shadow. Today the
// indicators set no :focus-visible style, so only the browser's default outline
// shows.
import { test } from '../../tests/issues/fixtures.js'

const ring = element => {
  const { outlineColor, outlineStyle, outlineWidth, outlineOffset, boxShadow } = getComputedStyle(element)
  return {
    focused: document.activeElement === element,
    visible: element.matches(':focus-visible'),
    outlineColor,
    outlineStyle,
    outlineWidth,
    outlineOffset,
    boxShadow
  }
}

const describe = measured => `outline: ${measured.outlineWidth} ${measured.outlineStyle} ${measured.outlineColor} offset ${measured.outlineOffset}, box-shadow: ${measured.boxShadow}`

test('a carousel indicator focused from the keyboard shows Bootstrap\'s ring', async ({ page, repro }) => {
  await repro.open()
  const block = page.locator('[data-playground-repro]').first()
  const control = block.locator('.btn-icon')
  const indicators = block.locator('.carousel-indicators button')

  // Tab order: previous control, then the indicators.
  await page.keyboard.press('Tab')
  const reference = await control.evaluate(ring)
  await page.keyboard.press('Tab')
  const active = await indicators.nth(0).evaluate(ring)
  await repro.screenshot('focused active indicator', {
    clip: await indicators.nth(0).boundingBox().then(box => ({
      x: box.x - 12, y: box.y - 12, width: box.width + 24, height: box.height + 24
    }))
  })
  await page.keyboard.press('Tab')
  const other = await indicators.nth(1).evaluate(ring)

  const sameRing = measured => measured.focused && measured.visible &&
    ['outlineColor', 'outlineStyle', 'outlineWidth', 'outlineOffset', 'boxShadow'].every(key => measured[key] === reference[key])

  repro.verdict(sameRing(active) && sameRing(other),
    `previous control: ${describe(reference)}; active indicator: ${describe(active)}; other indicator: ${describe(other)}`)
})
