// Screenshots the kitchen sink examples and pages/forced-colors.html with
// forced colors emulated (`forcedColors: 'active'`, Windows High Contrast), in
// light mode only: forced colors replace the palette, so dark adds nothing
// ([#106](https://github.com/julien-deramond/bootstrap-test-playground/issues/106)).
// The baselines have their own variant name, <theme>-<dir>-<config>-forced, so
// the ones of visual.spec.js don't move, and the images compare like the rest
// of the visual suite, with the same VISUAL_DIRS, VISUAL_CONFIGS and
// VISUAL_SCOPE. Chromium only: it is the engine whose forced colors emulation
// this playground documents, and Windows High Contrast is its main case.
import { expect, test } from '@playwright/test'
import { collectPages } from '../../scripts/lib/pages.mjs'
import { VARIANTS, baseline, inScope, openPage, snapshotPath } from './shared.js'

const FORCED_COLORS_URL = '/pages/forced-colors.html'

const pages = collectPages('/')
  .flatMap(({ dir, pages }) => pages.map(page => ({ ...page, group: dir })))
  .filter(({ url, group }) => (group === 'kitchen-sink' || url === FORCED_COLORS_URL) && inScope(url))

test.skip(({ browserName }) => browserName !== 'chromium', 'The forced colors captures are Chromium only')

for (const variant of VARIANTS.filter(({ theme }) => theme === 'light')) {
  const name = `${variant.name}-forced`

  test.describe(name, () => {
    test.use({ colorScheme: 'light', forcedColors: 'active' })

    for (const { url, group, sections } of pages) {
      test(url, async ({ page }) => {
        await openPage(page, url, variant)
        expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches), 'forced colors are on').toBe(true)
        const path = [name, ...snapshotPath(url)]

        if (group === 'kitchen-sink') {
          for (const { id } of sections) {
            const section = page.locator(`.bd-kitchen-sink-section[aria-labelledby="${id}"]`)
            await expect.soft(section, `example #${id}`).toHaveScreenshot(baseline([...path, `${id}.png`]))
          }
        } else {
          await expect.soft(page).toHaveScreenshot(baseline([...path, 'page.png']), { fullPage: true })
        }
      })
    }
  })
}
