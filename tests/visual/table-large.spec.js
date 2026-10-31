// pages/table-large.html scrolled to the middle of its 1000 rows, with the
// header sticking above them. visual.spec.js already captures the top: with
// ?chrome=0 the page is capped at one screen, so its full-page screenshot is
// the first rows. Here the page's scroll area goes to row 500 and the two
// wrappers that keep the sticky header working are captured, as
// <variant>/pages/table-large/scrolled-<wrapper>.png, with the same
// VISUAL_THEMES, VISUAL_DIRS, VISUAL_CONFIGS and VISUAL_SCOPE as
// visual.spec.js.
import { expect, test } from '@playwright/test'
import { VARIANTS, baseline, inScope, openPage } from './shared.js'

const URL = '/pages/table-large.html'

for (const variant of inScope(URL) ? VARIANTS : []) {
  test.describe(variant.name, () => {
    test.use({ colorScheme: variant.theme === 'dark' ? 'dark' : 'light' })

    for (const wrapper of ['none', 'box']) {
      test(`${URL} scrolled, wrapper ${wrapper}`, async ({ page }) => {
        await openPage(page, `${URL}`, variant, { variants: 'striped,hover,sm', wrapper })
        await page.waitForFunction(() => document.documentElement.dataset.tableLarge === 'ready')

        // Row 500 at the top of whatever scrolls: the page's main area, or
        // the wrapper with a fixed height.
        await page.evaluate(wrapperMode => {
          const row = document.querySelector('[data-row="10500"]')
          const scroller = wrapperMode === 'box' ? document.querySelector('.tl-wrapper') : document.querySelector('.tl-main')
          const header = document.querySelector('thead').getBoundingClientRect().height
          scroller.scrollTop += row.getBoundingClientRect().top - scroller.getBoundingClientRect().top - header
        }, wrapper)

        await expect.soft(page).toHaveScreenshot(baseline([variant.name, 'pages', 'table-large', `scrolled-${wrapper}.png`]))
      })
    }
  })
}
