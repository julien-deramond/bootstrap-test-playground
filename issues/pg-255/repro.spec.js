// Two checks, one verdict each. Fixed when both hold:
// 1. Keyboard reach, decided from markup: `.carousel-inner` has a tabindex
//    other than -1, or contains a focusable element. Chromium and Firefox make
//    a scroll container keyboard-focusable on their own, so pressing Tab is
//    recorded as information only (Safari is where it may not reach it).
// 2. Target size, measured: every indicator button is at least 24x24px, or
//    (WCAG 2.5.8 spacing exception) a 24px circle centered on each indicator
//    overlaps no neighbor's circle.
import { test } from '../../tests/issues/fixtures.js'

const focusable = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [contenteditable], [tabindex]:not([tabindex="-1"])'

test('the carousel scroll viewport can be reached from the keyboard', async ({ page, repro }) => {
  await repro.open()
  const block = page.locator('[data-playground-repro]').first()
  const viewport = block.locator('.carousel-inner')

  const markup = await viewport.evaluate((element, selector) => {
    const tabindex = element.getAttribute('tabindex')
    const own = tabindex !== null && Number.parseInt(tabindex, 10) !== -1
    const inside = [...element.querySelectorAll(selector)].filter(child => child.tabIndex >= 0).length
    return { tabindex, own, inside }
  }, focusable)

  // Information only: where Tab goes in this engine.
  let reached = 'not reached'
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab')
    const where = await page.evaluate(() => {
      const active = document.activeElement
      const inner = document.querySelector('[data-playground-repro] .carousel-inner')
      if (active === inner) {
        return 'the viewport itself'
      }

      return inner.contains(active) ? 'a descendant of the viewport' : null
    })
    if (where) {
      reached = where
      break
    }
  }

  repro.verdict(markup.own || markup.inside > 0,
    `tabindex: ${markup.tabindex ?? 'none'}; focusable descendants: ${markup.inside}; Tab in this engine reached: ${reached} (information only)`)
})

test('the carousel indicators meet the 24px target size', async ({ page, repro }) => {
  await repro.open()
  const boxes = await page.locator('[data-playground-repro]').first().locator('.carousel-indicators button').evaluateAll(buttons => buttons.map(button => {
    const { x, y, width, height } = button.getBoundingClientRect()
    return {
      x, y, width, height
    }
  }))

  const size = 24
  const sized = boxes.every(box => box.width >= size - 0.01 && box.height >= size - 0.01)
  // Spacing exception: circles of 24px diameter centered on each target must
  // not overlap, i.e. the centers are at least 24px apart.
  const centers = boxes.map(box => ({ x: box.x + (box.width / 2), y: box.y + (box.height / 2) }))
  const gaps = centers.slice(1).map((center, i) => Math.hypot(center.x - centers[i].x, center.y - centers[i].y))
  const spaced = gaps.every(gap => gap >= size - 0.01)

  const round = value => Math.round(value * 10) / 10
  repro.verdict(sized || spaced,
    `indicators: ${boxes.map(box => `${round(box.width)}x${round(box.height)}`).join(', ')}; centers ${gaps.map(round).join(', ')}px apart (need >= ${size}px, or each box >= ${size}x${size}px)`)
})
