// Screenshots the pages people print with print emulation
// (`page.emulateMedia({ media: 'print' })`), in light mode only: browsers print
// with light colors whatever the OS color scheme is, and pages/print.html has
// its own explicit dark card
// ([#76](https://github.com/julien-deramond/bootstrap-test-playground/issues/76)).
// Only a small set of pages, not the whole playground: an invoice, a checkout
// form, two dashboards and a table. The baselines have their own variant name,
// <theme>-<dir>-<config>-print, so the ones of visual.spec.js don't move, and
// the images compare like the rest of the visual suite, with the same
// VISUAL_DIRS, VISUAL_CONFIGS and VISUAL_SCOPE. Emulated print media doesn't
// drop backgrounds the way a real print does without `print-color-adjust`, so
// the captures show layout and the rules inside `@media print`, not that.
import { expect, test } from '@playwright/test'
import {
  VARIANTS, baseline, inScope, openPage, snapshotPath
} from './shared.js'

const PRINT_URLS = [
  '/pages/print.html',
  '/pages/checkout.html',
  '/pages/dashboard.html',
  '/screens/dashboard.html',
  '/screens/tasks.html'
]

for (const variant of VARIANTS.filter(({ theme }) => theme === 'light')) {
  const name = `${variant.name}-print`

  test.describe(name, () => {
    test.use({ colorScheme: 'light' })

    for (const url of PRINT_URLS.filter(inScope)) {
      test(url, async ({ page }) => {
        await openPage(page, url, variant)
        await page.emulateMedia({ media: 'print' })
        expect(await page.evaluate(() => matchMedia('print').matches), 'print media is emulated').toBe(true)

        await expect.soft(page).toHaveScreenshot(baseline([name, ...snapshotPath(url), 'page.png']), { fullPage: true })
      })
    }
  })
}
