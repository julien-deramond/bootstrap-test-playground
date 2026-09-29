// Screenshots every page of the playground and compares them with the
// baselines in screenshots/<platform>/. Kitchen sink pages get one screenshot
// per example, other pages one full-page screenshot.
//
// Pages load with `?chrome=0&freeze`, so only Bootstrap markup shows and it
// renders the same way every time. The matrix comes from the environment:
//   VISUAL_THEMES=light,dark   (default: light,dark)
//   VISUAL_DIRS=ltr,rtl        (default: ltr)
//   VISUAL_CONFIGS=working,shadcn, or `all` for every config (default: working)
import { expect, test } from '@playwright/test'
import { listConfigs } from '../../scripts/lib/configs.mjs'
import { collectPages } from '../../scripts/lib/pages.mjs'

const list = (name, fallback) => (process.env[name] || fallback).split(',').map(value => value.trim()).filter(Boolean)

const THEMES = list('VISUAL_THEMES', 'light,dark')
const DIRS = list('VISUAL_DIRS', 'ltr')
const CONFIGS = process.env.VISUAL_CONFIGS === 'all' ?
  ['working', ...listConfigs().map(({ name }) => name)] :
  list('VISUAL_CONFIGS', 'working')

const pages = collectPages('/').flatMap(({ dir, pages }) => pages.map(page => ({ ...page, group: dir })))

// Stand-in for remote images (the docs examples use https://github.com/mdo.png
// as an avatar), so a changed or unreachable image never shows up as a diff.
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
  <rect width="256" height="256" fill="#6f42c1"/><circle cx="128" cy="100" r="48" fill="#e9d8fd"/>
  <rect x="48" y="164" width="160" height="92" rx="46" fill="#e9d8fd"/></svg>`

for (const theme of THEMES) {
  for (const dir of DIRS) {
    for (const config of CONFIGS) {
      const variant = `${theme}-${dir}-${config}`

      test.describe(variant, () => {
        test.use({ colorScheme: theme === 'dark' ? 'dark' : 'light' })

        for (const { url, group, sections } of pages) {
          test(url, async ({ page }) => {
            await page.route(target => target.hostname !== 'localhost', route =>
              route.request().resourceType() === 'image' ?
                route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }) :
                route.continue())

            const params = new URLSearchParams({ theme, dir, config, chrome: '0', freeze: '' })
            await page.goto(`${url}?${params}`)
            // A non-default config hides the page until its styles are swapped in.
            await page.waitForFunction(() => !document.getElementById('playground-config-pending'))
            await page.evaluate(() => document.fonts.ready)
            // Pages that are still working after they load, like check pages
            // (markers drawn after `load`) or pages/color-modes.html (overlays,
            // color modes), mark <html> until they're done.
            await page.waitForFunction(() => !('playgroundBusy' in document.documentElement.dataset), null, { timeout: 30_000 })

            // `issues/pg-1/` → issues/pg-1, `kitchen-sink/forms-radio.html` → kitchen-sink/forms-radio
            const name = [variant, ...url.replace(/^\/|\/$|\.html$/g, '').split('/')]

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
  }
}
