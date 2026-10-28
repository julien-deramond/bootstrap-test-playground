// Fixed when a close button focused from the keyboard draws its ring, as the
// regular button next to it does. The ring is declared on :focus-visible, so
// its computed outline is set either way, but `mask-image` on the button masks
// it out: the spec compares pixels, focused against unfocused, over the band
// around the button where the ring is drawn (outside its box, so the icon's
// own opacity change doesn't count). Today only the regular button's band
// changes.
import { expect, test } from '../../tests/issues/fixtures.js'

// The ring's band is read from the computed outline; this margin is only what
// is captured around it.
const MARGIN = 4

test('a focused close button draws its focus ring', async ({ page, repro }) => {
  await repro.open()
  const block = page.locator('[data-playground-repro]').first()
  const button = block.locator('[data-ring="button"]')
  const close = block.locator('[data-ring="btn-close"]')
  await block.scrollIntoViewIfNeeded()

  // The clip of an element: its box plus the ring (offset and width) and a margin.
  const clipOf = locator => locator.evaluate((element, margin) => {
    const style = getComputedStyle(element)
    const reach = Math.ceil((Number.parseFloat(style.getPropertyValue('--focus-ring-width')) || 3) + 2) + margin
    const box = element.getBoundingClientRect()
    return {
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      clip: { x: Math.floor(box.x - reach), y: Math.floor(box.y - reach), width: Math.ceil(box.width + 2 * reach), height: Math.ceil(box.height + 2 * reach) }
    }
  }, MARGIN)

  const targets = { button: { locator: button }, 'btn-close': { locator: close } }
  const shot = async clip => page.screenshot({ clip, scale: 'css' })
  for (const target of Object.values(targets)) {
    Object.assign(target, await clipOf(target.locator))
    target.unfocused = await shot(target.clip)
  }

  // Tab order: the regular button, then the close button.
  for (const [name, target] of Object.entries(targets)) {
    await page.keyboard.press('Tab')
    await expect(target.locator).toBeFocused()
    target.outline = await target.locator.evaluate(element => {
      const style = getComputedStyle(element)
      return `${style.outlineStyle} ${style.outlineWidth}`
    })
    target.focused = await shot(target.clip)
    await repro.screenshot(`${name} focused`, { clip: target.clip })
  }

  // Counts the pixels that differ between both screenshots outside the button's
  // box: that is where the ring is, and the icon's opacity doesn't reach it.
  const counts = await page.evaluate(async items => {
    const load = async src => createImageBitmap(await (await fetch(`data:image/png;base64,${src}`)).blob())
    const read = bitmap => {
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const context = canvas.getContext('2d', { willReadFrequently: true })
      context.drawImage(bitmap, 0, 0)
      return context.getImageData(0, 0, bitmap.width, bitmap.height)
    }

    return Promise.all(items.map(async ({ name, unfocused, focused, box, clip }) => {
      const before = read(await load(unfocused))
      const after = read(await load(focused))
      let changed = 0
      for (let y = 0; y < after.height; y++) {
        for (let x = 0; x < after.width; x++) {
          const px = clip.x + x
          const py = clip.y + y
          if (px >= box.x && px < box.x + box.width && py >= box.y && py < box.y + box.height) {
            continue
          }

          const i = (y * after.width + x) * 4
          if (Math.abs(after.data[i] - before.data[i]) + Math.abs(after.data[i + 1] - before.data[i + 1]) + Math.abs(after.data[i + 2] - before.data[i + 2]) > 30) {
            changed++
          }
        }
      }

      return { name, changed }
    }))
  }, Object.entries(targets).map(([name, { unfocused, focused, box, clip }]) => ({
    name, unfocused: unfocused.toString('base64'), focused: focused.toString('base64'), box, clip
  })))

  const [reference, closeButton] = counts
  // The reference must show a ring, or the measure can't tell anything.
  if (reference.changed === 0) {
    repro.verdict(null, 'the regular button shows no ring either: the measure can\'t tell here')
    return
  }

  repro.verdict(closeButton.changed >= reference.changed / 2,
    `${closeButton.changed}px changed around the close button (outline: ${targets['btn-close'].outline}), ${reference.changed}px around the regular button (outline: ${targets.button.outline})`)
})
