// The playground's own UI, which the other scans leave out on purpose: they
// load pages with `?chrome=0` and skip `[data-playground-chrome]`, so only
// Bootstrap's markup is checked. A violation in the toolbar, the page switcher
// or the home page would still reach a tester, who could take it for
// Bootstrap's. This scan runs axe on them, with the default config, in light
// and dark:
//
// - the home page and the compare view, whole;
// - on a kitchen sink page, the toolbar alone: its pill, its first-visit hint,
//   its settings panel open, the tab order overlay, and the page switcher open.
//
// axe pierces open shadow roots, so `include('#playground-toolbar')` reaches
// the toolbar's markup. A violation here is the playground's to fix: none of
// them goes in known-issues.js, which is for Bootstrap's bugs and intended
// markup. The keyboard side of the same UI is tests/smoke/playground-keyboard.spec.js.
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  TAGS, THEMES, describe, toNodes
} from './shared.js'

const PAGE = '/kitchen-sink/components-dialog.html'

// Remote resources (avatars, web fonts) aren't the playground's to fix. The
// toolbar shows, so no `chrome=0`.
async function open(page, url, theme) {
  await page.route(target => target.hostname !== 'localhost', route => route.abort())
  await page.goto(`${url}?${new URLSearchParams({ theme, freeze: '' })}`)
  await page.waitForFunction(() => !document.getElementById('playground-config-pending'))
  await page.evaluate(() => document.fonts.ready)
}

const toolbar = page => page.locator('#playground-toolbar')

const STATES = {
  async pill() {},
  // The hint never shows under automation (navigator.webdriver): show it.
  async hint(page) {
    await toolbar(page).locator('.hint').evaluate(hint => {
      hint.hidden = false
    })
  },
  async panel(page) {
    await toolbar(page).locator('.summary').click()
    await expect(toolbar(page).locator('dialog')).toHaveAttribute('open', '')
  },
  async 'tab order'(page) {
    await page.keyboard.press('Alt+Shift+KeyO')
    await expect(page.locator('#playground-tab-order')).toBeAttached()
  },
  async palette(page) {
    await toolbar(page).locator('.search').click()
    await expect(page.locator('#playground-palette dialog')).toHaveAttribute('open', '')
  }
}

// What each state scans: the toolbar, plus the overlay or the switcher it
// opened.
const SCOPES = {
  'tab order': ['#playground-toolbar', '#playground-tab-order'],
  palette: ['#playground-toolbar', '#playground-palette']
}

// The compare and matrix views frame the pages under test, which the page
// scan already covers: only their own UI is scanned here.
const analyze = async (page, include = []) => {
  let builder = new AxeBuilder({ page }).withTags(TAGS).exclude('iframe')
  for (const selector of include) {
    builder = builder.include(selector)
  }

  const { violations } = await builder.analyze()
  return toNodes(violations)
}

const failures = nodes => nodes.map(node => `${describe(node)}: ${node.help}`)

for (const theme of THEMES) {
  test.describe(`playground ui ${theme}`, () => {
    test.use({ colorScheme: theme, reducedMotion: 'reduce' })

    for (const url of ['/', '/compare.html', '/matrix.html', '/sizes.html']) {
      test(url, async ({ page }, testInfo) => {
        await open(page, url, theme)
        const nodes = await analyze(page)
        await testInfo.attach('violations.json', { body: JSON.stringify(nodes, null, 2), contentType: 'application/json' })
        expect(failures(nodes), `${url} has accessibility violations: fix them, they are the playground's`).toEqual([])
      })
    }

    for (const [state, setUp] of Object.entries(STATES)) {
      test(`toolbar ${state}`, async ({ page }, testInfo) => {
        await open(page, PAGE, theme)
        await expect(toolbar(page)).toBeAttached()
        await setUp(page)
        const nodes = await analyze(page, SCOPES[state] ?? ['#playground-toolbar'])
        await testInfo.attach('violations.json', { body: JSON.stringify(nodes, null, 2), contentType: 'application/json' })
        expect(failures(nodes), `The toolbar (${state}) has accessibility violations: fix them, they are the playground's`).toEqual([])
      })
    }
  })
}
