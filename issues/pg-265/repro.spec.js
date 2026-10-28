// Fixed when the datepicker's outside-month days and in-range days keep their
// text at 4.5:1 or more, light and dark. Both are dimmed with `opacity` today
// (.5 and .8), so the contrast is computed with the opacity folded in, as axe
// does: getComputedStyle alone reports the undimmed colors and looks fine.
import { test } from '../../tests/issues/fixtures.js'

// Effective text and background of an element, walking up its ancestors: each
// background is blended at its alpha times the opacity of its element and of
// every ancestor above it, the text at its alpha times every opacity.
function measure(element) {
  // Computed colors can be in any color space (oklch, color-mix…): a canvas
  // turns them into sRGB.
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  context.canvas.width = 1
  context.canvas.height = 1
  const parse = value => {
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = '#000'
    context.fillStyle = value
    context.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
    return { r, g, b, a: a / 255 }
  }

  const chain = []
  for (let node = element; node; node = node.parentElement) {
    chain.unshift(node)
  }

  let backdrop = { r: 255, g: 255, b: 255 }
  let opacity = 1
  for (const node of chain) {
    const style = getComputedStyle(node)
    opacity *= Number(style.opacity)
    const bg = parse(style.backgroundColor)
    const alpha = bg.a * opacity
    if (alpha > 0) {
      backdrop = {
        r: backdrop.r * (1 - alpha) + bg.r * alpha,
        g: backdrop.g * (1 - alpha) + bg.g * alpha,
        b: backdrop.b * (1 - alpha) + bg.b * alpha
      }
    }
  }

  const text = parse(getComputedStyle(element).color)
  const alpha = text.a * opacity
  const foreground = {
    r: backdrop.r * (1 - alpha) + text.r * alpha,
    g: backdrop.g * (1 - alpha) + text.g * alpha,
    b: backdrop.b * (1 - alpha) + text.b * alpha
  }

  const luminance = ({ r, g, b }) => {
    const [lr, lg, lb] = [r, g, b].map(channel => {
      const c = channel / 255
      return c <= 0.039_28 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
  }

  const [light, dark] = [luminance(foreground), luminance(backdrop)].sort((a, b) => b - a)
  const hex = ({ r, g, b }) => `#${[r, g, b].map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
  return { ratio: (light + 0.05) / (dark + 0.05), foreground: hex(foreground), background: hex(backdrop), opacity }
}

const days = {
  'outside-month': '[data-vc-date-month="prev"] [data-vc-date-btn], [data-vc-date-month="next"] [data-vc-date-btn]',
  'in-range': '[data-vc-date-selected="middle"] [data-vc-date-btn]'
}

test('outside-month and in-range days have 4.5:1 text contrast', async ({ page, repro }) => {
  const results = []

  for (const mode of ['light', 'dark']) {
    // The page shows the example twice, light and a dark clone with `-dark`
    // added to its ids; each copy opens its own calendar.
    await repro.open()
    await page.locator(mode === 'dark' ? '#datepickerRange-dark' : '#datepickerRange').click()
    await page.locator('[data-vc="calendar"]').last().waitFor({ state: 'visible', timeout: 10_000 })

    for (const [kind, selector] of Object.entries(days)) {
      const button = page.locator(selector).first()
      await button.waitFor({ state: 'visible', timeout: 10_000 })
      const measured = await button.evaluate(measure)
      results.push({ mode, kind, ...measured })
    }

    await repro.screenshot(`calendar, ${mode}`)
  }

  const summary = results.map(result => `${result.kind} ${result.mode}: ${result.foreground} on ${result.background} = ${result.ratio.toFixed(2)}:1 (opacity ${result.opacity})`).join('; ')
  await page.evaluate(text => {
    const output = document.getElementById('measured')
    if (output) {
      output.textContent = text
    }
  }, summary)

  repro.verdict(results.every(result => result.ratio >= 4.5), summary)
})
