// Screenshots every page of the playground and compares them with the
// baselines in screenshots/<platform>/. Kitchen sink pages get one screenshot
// per example, other pages one full-page screenshot.
//
// Pages load with `?chrome=0&freeze`, so only Bootstrap markup shows and it
// renders the same way every time. The matrix comes from the environment:
// VISUAL_THEMES, VISUAL_DIRS and VISUAL_CONFIGS (see shared.js).
import { expect, test } from '@playwright/test'
import { collectPages } from '../../scripts/lib/pages.mjs'
import { VARIANTS, openPage, snapshotPath } from './shared.js'

const pages = collectPages('/').flatMap(({ dir, pages }) => pages.map(page => ({ ...page, group: dir })))

for (const variant of VARIANTS) {
  test.describe(variant.name, () => {
    test.use({ colorScheme: variant.theme === 'dark' ? 'dark' : 'light' })

    for (const { url, group, sections } of pages) {
      test(url, async ({ page }) => {
        await openPage(page, url, variant)
        const name = [variant.name, ...snapshotPath(url)]

        if (group === 'kitchen-sink') {
          for (const { id } of sections) {
            const section = page.locator(`.bd-kitchen-sink-section[aria-labelledby="${id}"]`)
            await expect.soft(section, `example #${id}`).toHaveScreenshot([...name, `${id}.png`])
          }
        } else {
          await expect.soft(page).toHaveScreenshot([...name, 'page.png'], { fullPage: true })
        }
      })
    }
  })
}
