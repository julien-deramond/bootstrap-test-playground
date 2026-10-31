// Fixed when the arrow keys of a chip input follow the layout in RTL, as they
// do mirrored in LTR: from the empty input, → focuses the last chip; on a chip,
// → moves to the previous one and ← to the next one, or back to the input from
// the last; and Shift+→ extends the selection toward the first chip. Today the
// LTR keys apply in both directions, so every arrow points away from where
// focus goes. A control run in LTR must keep ← = back and → = forward, so a fix
// can't break LTR.
import { expect, test } from '../../tests/issues/fixtures.js'

// Where focus and the selection are: the focused chip's index, `input`, or
// `none`, and the indexes of the selected chips.
const state = container => container.evaluate(element => {
  const chips = [...element.querySelectorAll('.chip')]
  const focused = document.activeElement
  return {
    focus: focused === element.querySelector('input') ? 'input' : (chips.includes(focused) ? chips.indexOf(focused) : 'none'),
    selected: chips.flatMap((chip, index) => (chip.classList.contains('active') ? [index] : []))
  }
})

// Runs the keys of one direction and reports what each one did. `back` and
// `forward` are the arrows that should go toward the first chip and toward the
// input.
const walk = async (page, container, { back, forward }) => {
  const input = container.locator('input').first()
  const chips = container.locator('.chip')
  // Two chips, the input empty and focused, nothing selected.
  const reset = async () => {
    await container.evaluate(element => {
      const instance = window.bootstrap.Chips.getOrCreateInstance(element)
      instance.clear()
      instance.add('Alpha')
      instance.add('Bravo')
    })
    await input.fill('')
    await input.focus()
    await expect(chips).toHaveCount(2)
  }

  const result = {}

  await reset()
  await page.keyboard.press(back)
  result.fromInput = (await state(container)).focus

  await reset()
  await chips.last().click()
  await page.keyboard.press(back)
  result.backOnLast = (await state(container)).focus
  await page.keyboard.press(forward)
  result.forwardOnFirst = (await state(container)).focus
  await page.keyboard.press(forward)
  result.forwardOnLast = (await state(container)).focus

  await reset()
  await chips.last().click()
  await page.keyboard.press(`Shift+${back}`)
  result.shiftBack = (await state(container)).selected

  return result
}

const expected = {
  fromInput: 1, backOnLast: 0, forwardOnFirst: 1, forwardOnLast: 'input', shiftBack: [0, 1]
}

test('the arrows of a chip input follow the layout in RTL', async ({ page, repro }) => {
  // Control: in LTR ← goes back and → goes forward, and stays so after a fix.
  await repro.open('dir=ltr')
  const ltr = await walk(page, page.locator('[data-playground-repro] [data-bs-chips]').first(), { back: 'ArrowLeft', forward: 'ArrowRight' })
  expect(ltr, 'in LTR, ← goes back and → forward').toEqual(expected)

  // In RTL the chips run right to left: → goes back (toward the first chip, on
  // the right), ← goes forward (toward the input, on the left).
  await repro.open('dir=rtl')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  const rtl = await walk(page, page.locator('[data-playground-repro] [data-bs-chips]').first(), { back: 'ArrowRight', forward: 'ArrowLeft' })
  const details = `in RTL, from Alpha, Bravo and the input: → from the input focuses ${rtl.fromInput} (expected 1), → on the last chip focuses ${rtl.backOnLast} (expected 0), ← on the first chip focuses ${rtl.forwardOnFirst} (expected 1), ← on the last chip focuses ${rtl.forwardOnLast} (expected input), Shift+→ selects [${rtl.shiftBack}] (expected [0,1])`
  repro.verdict(JSON.stringify(rtl) === JSON.stringify(expected), details)
})
