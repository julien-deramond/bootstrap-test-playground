// Fixed when a link keeps 4.5:1 or more against the body, `--bg-1` and `--bg-2`
// backgrounds in light mode. `--link-color` is `--primary-base` there, 3.56:1
// on white and lower on the grays; `--primary-fg` would give 5.38, 5.01 and 4.80.
// `--bg-3` and the scrollspy active background stay under 4.5:1 even with
// `--primary-fg` (4.25 and 4.32), so they aren't part of the verdict. No opacity
// is involved, so the computed colors are enough.
import { test } from '../../tests/issues/fixtures.js'

const surfaces = [
  { name: '--bg-body', selector: 'p:not(.bg-1):not(.bg-2)' },
  { name: '--bg-1', selector: 'p.bg-1' },
  { name: '--bg-2', selector: 'p.bg-2' }
]

test('links are 4.5:1 or more on the body, --bg-1 and --bg-2 in light mode', async ({ page, repro }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await repro.open('theme=light')

  const rows = await page.evaluate(items => {
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
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data
      return [r, g, b]
    }
    const luminance = rgb => {
      const [r, g, b] = rgb.map(channel => {
        const value = channel / 255
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    const block = document.querySelector('[data-playground-repro]')
    return items.map(({ name, selector }) => {
      const paragraph = block.querySelector(selector)
      const link = paragraph.querySelector('a')
      const text = parse(getComputedStyle(link).color)
      const background = parse(getComputedStyle(paragraph).backgroundColor === 'rgba(0, 0, 0, 0)' ? getComputedStyle(document.body).backgroundColor : getComputedStyle(paragraph).backgroundColor)
      const [lighter, darker] = [luminance(text), luminance(background)].sort((a, b) => b - a)
      return { name, ratio: (lighter + 0.05) / (darker + 0.05) }
    })
  }, surfaces)

  repro.verdict(rows.every(row => row.ratio >= 4.5),
    rows.map(row => `${row.name}: ${row.ratio.toFixed(2)}`).join(', '))
})
