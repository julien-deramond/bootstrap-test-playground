// The toolbar's breakpoint indicator (src/js/breakpoint-indicator.js): it
// names the active breakpoint from the page's own `--breakpoint-*` tokens, so
// it follows a resize and a config with other breakpoints, and it never shows
// in a screenshot (`?chrome=0`).
import { expect, test } from '@playwright/test'

const URL = '/pages/layout-grid.html'

test('the breakpoint indicator follows the viewport and the config', async ({ page }) => {
  const badge = page.locator('#playground-breakpoints [popover]')

  await page.setViewportSize({ width: 800, height: 700 })
  await page.goto(URL)
  await page.waitForFunction(() => document.getElementById('playground-toolbar'))
  await page.keyboard.press('Alt+Shift+B')
  await expect(badge).toHaveAttribute('data-breakpoint', 'md')

  await page.setViewportSize({ width: 500, height: 700 })
  await expect(badge).toHaveAttribute('data-breakpoint', 'xs')

  // breakpoints-custom renames md to tablet and adds 3xl.
  await page.goto(`${URL}?config=breakpoints-custom`)
  await page.setViewportSize({ width: 800, height: 700 })
  await expect(badge).toHaveAttribute('data-breakpoint', 'tablet')
  await page.setViewportSize({ width: 2000, height: 700 })
  await expect(badge).toHaveAttribute('data-breakpoint', '3xl')

  await page.waitForFunction(() => document.getElementById('playground-toolbar'))
  await page.keyboard.press('Alt+Shift+B')
  await expect(badge).toHaveCount(0)
})

test('the breakpoint indicator is hidden in screenshots', async ({ page }) => {
  await page.goto(`${URL}?chrome=0`)
  await page.evaluate(() => sessionStorage.setItem('bootstrap-playground-breakpoints', '1'))
  await page.reload()
  await expect(page.locator('#playground-breakpoints')).toHaveCount(0)
})
