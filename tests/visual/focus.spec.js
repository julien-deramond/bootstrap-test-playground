// Captures every component of pages/focus.html focused, one image (and one
// test) per surface: each component is focused alone and screenshotted, and
// the pixels its focus changes are pasted onto the unfocused surface (see
// tests/a11y/focus.js). The images compare with baselines like the rest of the
// visual suite, as <variant>/pages/focus/focused-<surface>.png, with the same
// VISUAL_THEMES, VISUAL_DIRS and VISUAL_CONFIGS matrix as visual.spec.js.
import { expect, test } from '@playwright/test'
import { listConfigs } from '../../scripts/lib/configs.mjs'
import { FOCUS_URL, SURFACES, captureSurface, compositeRings, toBase64 } from '../a11y/focus.js'

const list = (name, fallback) => (process.env[name] || fallback).split(',').map(value => value.trim()).filter(Boolean)

const THEMES = list('VISUAL_THEMES', 'light,dark')
const DIRS = list('VISUAL_DIRS', 'ltr')
const CONFIGS = process.env.VISUAL_CONFIGS === 'all' ?
  ['working', ...listConfigs().map(({ name }) => name)] :
  list('VISUAL_CONFIGS', 'working')

for (const theme of THEMES) {
  for (const dir of DIRS) {
    for (const config of CONFIGS) {
      const variant = `${theme}-${dir}-${config}`

      test.describe(variant, () => {
        test.use({ colorScheme: theme === 'dark' ? 'dark' : 'light' })

        // One test per surface, so they run in parallel and each one stays
        // short, even in WebKit.
        for (const surface of SURFACES) {
          test(`${FOCUS_URL} focused ${surface}`, async ({ page }) => {
            // bg-body's 136 components take over 30s in Linux WebKit.
            test.setTimeout(120_000)
            const params = new URLSearchParams({ theme, dir, config, chrome: '0', freeze: '' })
            await page.goto(`${FOCUS_URL}?${params}`)
            await page.waitForFunction(() => !document.getElementById('playground-config-pending'))
            await page.evaluate(() => document.fonts.ready)

            const capture = await captureSurface(page, surface)
            const image = Buffer.from(await page.evaluate(compositeRings, toBase64(capture)), 'base64')
            expect.soft(image).toMatchSnapshot([variant, 'pages', 'focus', `focused-${surface}.png`])
            expect(capture.items.filter(item => !item.focusVisible).map(({ name }) => name), 'Components that don\'t match :focus-visible once focused').toEqual([])
          })
        }
      })
    }
  }
}
