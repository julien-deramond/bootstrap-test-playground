// Fixed when every `.bg-2 .dark:bg-primary` box has the background of its own
// color mode (the nearest `data-bs-theme`), with the system in light mode and
// in dark mode. The page measures one system setting at a time (assert.js), so
// this spec emulates both and fails if either one disagrees.
import { test } from '../../tests/issues/fixtures.js'

test('dark: variants follow data-bs-theme under both system color schemes', async ({ page, repro }) => {
  await repro.open()
  const results = []

  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme })
    const cases = await page.evaluate(() => [...document.querySelectorAll('[data-case]')].map(element => {
      const background = selector => getComputedStyle(element.querySelector(selector)).backgroundColor
      const { mode } = element.dataset
      const actual = background('[data-box]')
      const expected = background(mode === 'dark' ? '[data-ref-dark]' : '[data-ref-light]')
      return { name: element.dataset.case, mode, pass: actual === expected }
    }))
    results.push({ colorScheme, cases })
  }

  const pass = results.every(({ cases }) => cases.length > 0 && cases.every(item => item.pass))
  const details = results.map(({ colorScheme, cases }) => {
    const failing = cases.filter(item => !item.pass).map(item => `${item.name} (${item.mode})`)
    return `system ${colorScheme}: ${failing.length ? `wrong in ${failing.join(', ')}` : 'all cases match'}`
  }).join('; ')
  repro.verdict(pass, details)
})
