// The layout pages (pages/layout-*.html) at every breakpoint of the page's
// config: at each breakpoint's minimum width and one pixel below it, where the
// layout changes. The breakpoints are read in the page from the
// `--breakpoint-*` tokens (the toolbar's breakpoint indicator reads them the
// same way), so a config with other breakpoints, like `breakpoints-custom`,
// gets its own widths. The smallest breakpoint starts at 0 and is captured at
// 320px, the narrowest width WCAG's reflow criterion asks for.
//
// One test per page, one baseline per width:
// <variant>/pages/layout-grid/<breakpoint>.png (at its minimum) and
// <breakpoint>-below.png (one pixel below it). Light mode only, to keep the
// baselines to a few dozen per engine; VISUAL_DIRS, VISUAL_CONFIGS and
// VISUAL_SCOPE apply as usual.
import { expect, test } from '@playwright/test'
import {
  VARIANTS, baseline, inScope, openPage
} from './shared.js'

const PAGES = ['/pages/layout-grid.html', '/pages/layout-cssgrid.html', '/pages/layout-containers.html']
const SMALLEST_WIDTH = 320
const HEIGHT = 800

// [{ name, min }], narrowest first, from the tokens declared on :root.
const readBreakpoints = () => {
  const tokens = new Set()
  const walk = rules => {
    for (const rule of rules) {
      if (rule.cssRules) {
        walk(rule.cssRules)
      }

      if (rule.style && /(^|,)\s*(:root|:host|html)\s*(,|$)/.test(rule.selectorText ?? '')) {
        for (const name of rule.style) {
          if (/^--(?:\w+-)?breakpoint-.+$/.test(name)) {
            tokens.add(name)
          }
        }
      }
    }
  }

  for (const sheet of document.styleSheets) {
    try {
      walk(sheet.cssRules)
    } catch {}
  }

  const style = getComputedStyle(document.documentElement)
  return [...tokens]
    .map(token => {
      const value = style.getPropertyValue(token).trim()
      return { name: token.replace(/^--(?:\w+-)?breakpoint-/, ''), min: Number.parseFloat(value) * (/r?em$/.test(value) ? 16 : 1) }
    })
    .filter(({ min }) => !Number.isNaN(min))
    .sort((a, b) => a.min - b.min)
}

for (const variant of VARIANTS.filter(({ theme }) => theme === 'light')) {
  test.describe(variant.name, () => {
    for (const url of PAGES.filter(page => inScope(page))) {
      test(`${url} at each breakpoint`, async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: HEIGHT })
        await openPage(page, url, variant)

        const breakpoints = await page.evaluate(readBreakpoints)
        expect(breakpoints.length, 'breakpoint tokens found in the page').toBeGreaterThan(0)

        const widths = []
        for (const { name, min } of breakpoints) {
          if (min > 0) {
            widths.push({ file: `${name}-below`, width: min - 1 })
          }

          widths.push({ file: name, width: min > 0 ? min : SMALLEST_WIDTH })
        }

        for (const { file, width } of widths) {
          await page.setViewportSize({ width, height: HEIGHT })
          // Two frames: the layout, then the widths the page prints.
          await page.evaluate(() => new Promise(resolve => {
            requestAnimationFrame(() => requestAnimationFrame(resolve))
          }))
          await expect.soft(page, `${width}px`).toHaveScreenshot(
            baseline([variant.name, ...url.replace(/^\/|\.html$/g, '').split('/'), `${file}.png`]),
            { fullPage: true }
          )
        }
      })
    }
  })
}
