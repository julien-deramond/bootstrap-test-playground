// Fixed when the hover, pressed (:active), .active and checked states of
// .btn-solid, .btn-outline and .btn-subtle keep the text readable: for every
// theme color, in light and dark mode, the contrast of the resolved color over
// background-color is at least 4.5:1, or at least the contrast of the same
// button at rest when that one is already lower (so that other contrast gaps
// don't hide this bug). Today the states darken the text color along with the
// background, so the ratio falls below the rest state's.
import { test } from '../../tests/issues/fixtures.js'

const TOLERANCE = 0.01

// Resolves any CSS color (oklch, color-mix, relative colors) to sRGB through a
// canvas, composites translucent backgrounds over the nearest opaque ancestor,
// and returns the WCAG contrast ratio.
const measure = element => {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const context = canvas.getContext('2d', { willReadFrequently: true })
  const rgba = value => {
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = '#000'
    context.fillStyle = value
    context.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
    return [r, g, b, a / 255]
  }

  const over = (top, bottom) => {
    const alpha = top[3] + bottom[3] * (1 - top[3])
    return alpha === 0 ? [0, 0, 0, 0] : [0, 1, 2].map(i => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / alpha).concat(alpha)
  }

  const layers = []
  for (let node = element; node; node = node.parentElement) {
    layers.push(rgba(getComputedStyle(node).backgroundColor))
  }

  let background = [255, 255, 255, 1]
  for (const layer of layers.reverse()) {
    background = over(layer, background)
  }

  const style = getComputedStyle(element)
  const text = over(rgba(style.color), background)
  const luminance = ([r, g, b]) => {
    const [lr, lg, lb] = [r, g, b].map(channel => {
      const c = channel / 255
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
  }

  const [light, dark] = [luminance(text), luminance(background)].sort((a, b) => b - a)
  const hex = color => `#${color.slice(0, 3).map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
  return { ratio: (light + 0.05) / (dark + 0.05), colors: `${hex(text)} on ${hex(background)}` }
}

test('buttons keep their text contrast in the hover, active and checked states', async ({ page, repro }) => {
  await repro.open()
  const block = page.locator('[data-playground-repro]').first()
  const failures = []
  let checked = 0

  for (const mode of ['light', 'dark']) {
    await block.evaluate((element, value) => element.setAttribute('data-bs-theme', value), mode)

    for (const variant of ['solid', 'outline', 'subtle']) {
      const row = block.locator(`[data-variant="${variant}"]`)
      const count = await row.locator('[data-state="rest"]').count()

      for (let index = 0; index < count; index++) {
        const rest = row.locator('[data-state="rest"]').nth(index)
        const theme = (await rest.getAttribute('class')).match(/theme-(\w+)/)[1]
        const restMeasure = await rest.evaluate(measure)

        // Each forced state has its own button: a forced pseudo-class stays on
        // the element for the rest of the page.
        const at = state => row.locator(`[data-state="${state}"]`).nth(index)
        const states = {
          active: { locator: at('active-class'), forced: [] },
          checked: { locator: at('checked'), forced: [] },
          hover: { locator: at('hover'), forced: ['hover'] },
          pressed: { locator: at('pressed'), forced: ['hover', 'active'] }
        }

        for (const [state, { locator, forced }] of Object.entries(states)) {
          if (forced.length > 0) {
            await repro.forcePseudoState(locator, forced)
          }

          const measured = await locator.evaluate(measure)
          checked++
          if (measured.ratio < 4.5 && measured.ratio < restMeasure.ratio - TOLERANCE) {
            failures.push(`${mode} ${variant} ${theme} ${state}: ${measured.ratio.toFixed(2)}:1 (${measured.colors}) against ${restMeasure.ratio.toFixed(2)}:1 at rest`)
          }
        }
      }
    }
  }

  repro.verdict(failures.length === 0,
    failures.length === 0 ? `${checked} states measured, none lower than rest or 4.5:1` : `${failures.length} of ${checked} states lose contrast: ${failures.join('; ')}`)
})
