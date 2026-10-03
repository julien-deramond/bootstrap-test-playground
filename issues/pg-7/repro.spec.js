// Fixed when a chip reached from the keyboard shows a focus ring: an outline or
// a box shadow once `:focus-visible` matches. Shift+Tab from the input lands on
// the last chip, which Bootstrap's Chips makes focusable.
import { test } from '../../tests/issues/fixtures.js'

test('a chip focused from the keyboard shows a focus ring', async ({ page, repro }) => {
  await repro.open()
  const block = page.locator('[data-playground-repro]').first()
  await block.locator('input').click()
  await page.keyboard.press('Shift+Tab')

  const chip = block.locator('.chip').last()
  const measured = await chip.evaluate(element => {
    const { outlineStyle, outlineWidth, boxShadow } = getComputedStyle(element)
    return { focused: document.activeElement === element, visible: element.matches(':focus-visible'), outlineStyle, outlineWidth, boxShadow }
  })
  await repro.screenshot('focused chip', { clip: await chip.boundingBox().then(box => ({ x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 })) })

  const ring = (measured.outlineStyle !== 'none' && Number.parseFloat(measured.outlineWidth) > 0) || measured.boxShadow !== 'none'
  repro.verdict(measured.focused && measured.visible && ring,
    `${measured.focused ? 'focused' : 'not focused'}, :focus-visible ${measured.visible ? 'matches' : 'doesn\'t match'}, outline: ${measured.outlineWidth} ${measured.outlineStyle}, box-shadow: ${measured.boxShadow}`)
})
