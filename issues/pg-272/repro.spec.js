// Fixed when each of the components below, focused from the keyboard, shows an
// indicator that contrasts at least 3:1 with what was there before, over at
// least a 2px band along its edge: the measure WCAG 2.4.13 uses, and the one of
// the focus ring check (tests/a11y/focus.spec.js). Today a menu item changes
// its background by 1.07:1, an active one not at all, a list group action
// shows a partly hidden browser outline, and a link on a solid background the
// browser's blue outline.
import { test } from '../../tests/issues/fixtures.js'
import { measureRings } from '../../tests/a11y/focus.js'

const PADDING = 8

test('menu items, list group actions and links show a focus indicator that contrasts 3:1', async ({ page, repro }) => {
  await repro.open()
  const block = page.locator('[data-playground-repro]').first()
  const targets = block.locator('[data-ring]')
  const count = await targets.count()

  // A key press puts the page in keyboard modality, where focus() shows rings.
  await page.keyboard.press('Shift')
  await page.evaluate(() => document.activeElement?.blur())
  await block.scrollIntoViewIfNeeded()

  // The block's rectangle, and each target's clip and the area its indicator
  // must cover: a 2px band along its edge, 2px times the perimeter less the
  // overlap of the four corners.
  const { rect, items } = await block.evaluate((element, padding) => {
    const round = ({ x, y, width, height }) => {
      const left = Math.floor(x)
      const top = Math.floor(y)
      return {
        x: left, y: top, width: Math.ceil(x + width) - left, height: Math.ceil(y + height) - top
      }
    }

    const area = round(element.getBoundingClientRect())
    return {
      rect: area,
      items: [...element.querySelectorAll('[data-ring]')].map(target => {
        const box = target.getBoundingClientRect()
        const x = Math.max(area.x, Math.floor(box.x - padding))
        const y = Math.max(area.y, Math.floor(box.y - padding))
        return {
          name: target.dataset.ring,
          required: Math.round(4 * (box.width + box.height) - 16),
          clip: {
            x,
            y,
            width: Math.min(area.x + area.width, Math.ceil(box.right + padding)) - x,
            height: Math.min(area.y + area.height, Math.ceil(box.bottom + padding)) - y
          }
        }
      })
    }
  }, PADDING)

  const shot = async clip => (await page.screenshot({ clip, scale: 'css' })).toString('base64')
  const unfocused = await shot(rect)
  for (const [index, item] of items.entries()) {
    await targets.nth(index).evaluate(target => target.focus({ focusVisible: true, preventScroll: true }))
    item.focused = await shot(item.clip)
  }

  await page.evaluate(() => document.activeElement?.blur())
  const measured = await page.evaluate(measureRings, { rect, unfocused, items })
  await repro.screenshot('block, unfocused', { clip: rect })

  const failing = measured.flatMap(({ covered, required, colors, contrast }, index) =>
    covered >= required ? [] : [`${items[index].name} (${covered}/${required}px at 3:1; ${colors ?? 'no change'}, ${contrast}:1)`])

  repro.verdict(count > 0 && failing.length === 0,
    failing.length ? `no 3:1 indicator on: ${failing.join(', ')}` : `all ${count} focused components show a 3:1 indicator`)
})
