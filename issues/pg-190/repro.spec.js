// Fixed when `.container` widens with the viewport whatever the order of the
// keys in `$container-max-widths`: 720px at 800px, 960px at 1100px and 1200px at
// 1400px, and `.xl:container` is as wide as `.container` at 1400px. Today the
// `tablet` rule is output after the `lg` and `xl` ones, so `.container` stays
// 720px wide from 768px up. Needs the viewport, so it is a spec.
import { test } from '../../tests/issues/fixtures.js'

test('.container widens with the viewport under custom breakpoints', async ({ page, repro }) => {
  await repro.open()
  const measure = async width => {
    await page.setViewportSize({ width, height: 800 })
    return page.evaluate(() => {
      const of = name => Math.round(document.querySelector(`[data-container="${name}"]`).getBoundingClientRect().width)
      return { plain: of('plain'), xl: of('xl') }
    })
  }

  const widths = {}
  for (const width of [800, 1100, 1400]) {
    widths[width] = await measure(width)
  }

  const increasing = widths[800].plain < widths[1100].plain && widths[1100].plain < widths[1400].plain
  const same = widths[1400].plain === widths[1400].xl
  const details = Object.entries(widths).map(([width, item]) => `${width}px: .container ${item.plain}px, .xl:container ${item.xl}px`).join('; ')
  repro.verdict(increasing && same, details)
})
