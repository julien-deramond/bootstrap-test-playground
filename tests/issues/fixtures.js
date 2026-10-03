// Fixtures for a reproduction's Playwright spec, issues/<name>/repro.spec.js:
// what an in-page assert.js can't do, like driving the keyboard, resizing the
// viewport or forcing a pseudo-class. A spec says what "fixed" looks like and
// records a verdict, as assert.js returns one:
//
//   import { expect, test } from '../../tests/issues/fixtures.js'
//
//   test('a focused chip shows a focus ring', async ({ page, repro }) => {
//     await repro.open()
//     await page.keyboard.press('Tab')
//     const outline = await page.locator('.chip').first().evaluate(chip => getComputedStyle(chip).outlineStyle)
//     repro.verdict(outline !== 'none', `outline-style: ${outline}`)
//   })
//
// A verdict of `false` is the expected state while the bug is there: the test
// passes. `true` means the fix landed: the test fails with the step to take
// (step 3 of "Upstream issue tracking" in CLAUDE.md), as `npm run check-issues`
// reports PASS. `null` means the spec can't tell here. A spec that throws fails
// like any test: a broken spec never passes for a fixed bug. See "Assertions"
// in docs/pages.md.
import fs from 'node:fs'
import path from 'node:path'
import { expect, test as base } from '@playwright/test'
import { root } from '../../scripts/lib/configs.mjs'

export { expect }

export const test = base.extend({
  repro: async ({ page }, use, testInfo) => {
    const name = path.basename(path.dirname(testInfo.file))
    const url = `/issues/${name}/`
    const html = fs.readFileSync(path.join(root, 'issues', name, 'index.html'), 'utf8')
    const meta = html.match(/<meta name="playground-upstream" content="([^"]*)"(?: data-status="([^"]*)")?(?: data-tracking="([^"]*)")?>/)
    let verdict

    const repro = {
      name,
      url,
      upstream: meta?.[1] ?? '',
      status: meta?.[2] ?? '',
      tracking: meta?.[3] ?? '',

      // Loads the page without its chrome and with transitions off, and waits
      // for Bootstrap and for a non-default config's styles. `params` adds to
      // the query string (`theme=dark`, `config=pill`).
      async open(params = '') {
        await page.goto(`${url}?chrome=0&freeze${params ? `&${params}` : ''}`)
        await page.waitForFunction(() => !document.getElementById('playground-config-pending'))
        await page.waitForFunction(() => window.bootstrap && document.readyState === 'complete')
      },

      // The verdict: `pass` is true when the bug is gone, false while it's
      // there, null when this environment can't tell. `details` says what was
      // measured, in one line.
      verdict(pass, details) {
        verdict = { pass: pass === null ? null : Boolean(pass), details: String(details) }
      },

      // Runs Playwright assertions as the verdict: they hold when the bug is
      // gone. A failed `expect` is a false verdict with its message; any other
      // error is the spec's own and fails the test.
      async expectFixed(details, assertions) {
        try {
          await assertions()
          repro.verdict(true, details)
        } catch (error) {
          if (!error.matcherResult) {
            throw error
          }

          repro.verdict(false, `${details}: ${error.message.split('\n').find(line => line.trim()) ?? error.message}`)
        }
      },

      // Attaches a screenshot to the report, as evidence.
      async screenshot(title, options = {}) {
        await testInfo.attach(title, { body: await page.screenshot(options), contentType: 'image/png' })
      },

      // Forces pseudo-classes on an element (`['hover']`, `['focus',
      // 'focus-visible']`), through the DevTools protocol: Chromium only.
      async forcePseudoState(locator, states) {
        const marker = `repro-pseudo-${Date.now()}`
        await locator.evaluate((element, value) => {
          element.dataset.reproPseudo = value
        }, marker)
        const client = await page.context().newCDPSession(page)
        await client.send('DOM.enable')
        await client.send('CSS.enable')
        const { root: document } = await client.send('DOM.getDocument', { depth: 0 })
        const { nodeId } = await client.send('DOM.querySelector', { nodeId: document.nodeId, selector: `[data-repro-pseudo="${marker}"]` })
        await client.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: states })
      }
    }

    await use(repro)

    // A test that threw is already failed: nothing to add.
    if (testInfo.status !== 'passed' && testInfo.status !== testInfo.expectedStatus) {
      return
    }

    if (!verdict) {
      throw new Error(`issues/${name}/repro.spec.js recorded no verdict: call repro.verdict(pass, details) or repro.expectFixed(details, assertions)`)
    }

    testInfo.annotations.push({ type: 'verdict', description: JSON.stringify(verdict) })
    if (verdict.pass === true) {
      throw new Error(`issues/${name}/ passes now: the bug may be fixed (${verdict.details}). Check the page by hand, then step 3 of "Upstream issue tracking" in CLAUDE.md, which deletes the reproduction. \`npm run check-issues -- ${name}\` prints the commands.`)
    }
  }
})
