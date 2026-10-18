// Fixed when the color-mode() mixin's dark rule applies exactly where the
// element is in dark mode, with at least one $color-mode-type, in the four
// contexts of the issue (the page, a dark subtree, a light subtree, light
// nested in dark), under a light and a dark system preference. Each probe
// resolves its used color scheme with light-dark() on column-rule-color:
// rgb(0, 0, 2) is dark. The element carrying data-bs-theme itself is reported
// in the details only, so a fix that misses it shows without failing a check
// stricter than the issue. A new $color-mode-type needs a probe of its own.
import { test } from '../../tests/issues/fixtures.js'

const TYPES = ['media-query', 'data']
const SCHEMES = ['light', 'dark']
const CONTEXTS = ['page', 'dark', 'light', 'nested']

test('the color-mode() mixin applies where the element is dark, with the system in light and dark', async ({ page, repro }) => {
  const results = {}
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme })
    await repro.open()
    results[scheme] = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#mixin-checks tbody tr')].map(row => [
      row.dataset.context,
      Object.fromEntries(['media-query', 'data'].map(type => {
        const style = getComputedStyle(row.querySelector(`.pg-probe-${type}`))
        const dark = style.columnRuleColor === 'rgb(0, 0, 2)'
        const applied = style.outlineStyle !== 'none'
        return [type, { dark, applied, ok: dark === applied }]
      }))
    ])))
    await repro.screenshot(`system ${scheme}`, { fullPage: true })
  }

  const wrong = (type, contexts) => SCHEMES.flatMap(scheme => contexts
    .filter(context => !results[scheme][context][type].ok)
    .map(context => `${context} (system ${scheme})`))
  const report = type => {
    const bad = wrong(type, CONTEXTS)
    return `${type}: ${bad.length ? `wrong in ${bad.join(', ')}` : 'right everywhere'}`
  }

  const itself = TYPES.map(type => `${type}: ${SCHEMES.map(scheme => `${results[scheme].self[type].ok ? 'right' : 'wrong'} with the system in ${scheme}`).join(', ')}`).join('; ')
  const fixed = TYPES.some(type => wrong(type, CONTEXTS).length === 0)
  repro.verdict(fixed, `${TYPES.map(report).join('; ')}. On the element itself, ${itself}`)
})
