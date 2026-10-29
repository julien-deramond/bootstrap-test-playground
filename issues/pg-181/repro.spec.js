// Fixed when a datepicker calendar is dark wherever its surroundings are dark
// through `color-scheme`, with the system in light mode: on a page made dark
// with `.color-scheme-dark` on <body> (case 1), and inside a wrapper that only
// sets `color-scheme: dark` (case 2). Case 3, a wrapper with
// `data-bs-theme="dark"`, already works and is only a sanity check.
// Today the calendar sets `color-scheme: light dark` on itself, which resets
// the inherited scheme to the system preference, so cases 1 and 2 stay white.
import { test } from '../../tests/issues/fixtures.js'

const calendarOf = selector => `${selector} [data-vc="calendar"]`

async function measure(page, selector) {
  return page.locator(calendarOf(selector)).first().evaluate(element => {
    const style = getComputedStyle(element)
    // Resolve the background to sRGB through a canvas, whatever color syntax the browser reports.
    const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    context.fillStyle = style.backgroundColor
    context.fillRect(0, 0, 1, 1)
    const [red, green, blue] = context.getImageData(0, 0, 1, 1).data
    const channel = value => {
      const unit = value / 255
      return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4
    }
    return {
      colorScheme: style.colorScheme,
      background: style.backgroundColor,
      luminance: 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
    }
  })
}

const isDark = result => result.luminance < 0.2 || result.colorScheme !== 'light dark'
const describe = (name, result) => `${name}: color-scheme ${result.colorScheme}, background ${result.background}`

test('the calendar follows a page or a wrapper made dark with color-scheme', async ({ page, repro }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await repro.open()
  await page.waitForSelector('[data-case="control"] [data-vc="calendar"]', { timeout: 30000 })

  // Case 3, the control, with the page dark.
  const control = await measure(page, '[data-case="control"]')
  if (!isDark(control) || control.colorScheme !== 'dark') {
    throw new Error(`The control should already be dark: ${describe('control', control)}`)
  }

  // Case 1: the body carries .color-scheme-dark.
  const pageCase = await measure(page, '[data-case="page"]')

  // Case 2: take the page back to light, so only the wrapper makes it dark.
  await page.evaluate(() => document.body.classList.remove('color-scheme-dark'))
  const wrapper = await measure(page, '[data-case="wrapper"]')
  await page.evaluate(() => document.body.classList.add('color-scheme-dark'))

  repro.verdict(
    isDark(pageCase) && isDark(wrapper),
    [describe('page', pageCase), describe('wrapper', wrapper), describe('control', control)].join('; ')
  )
})
