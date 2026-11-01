// pages/table-large.html under scroll: its 1000 rows, the sticky header and
// the long tasks of a scroll. It isn't a smoke scenario (those are per kitchen
// sink component) but runs with the suite, once, in Chromium: the `longtask`
// entries it counts don't exist in Firefox and WebKit.
//
// Timings vary a lot between machines and CI runners, so the long-task
// ceiling is generous and the numbers are printed, not compared tightly.
import { expect, test } from '@playwright/test'

const URL = '/pages/table-large.html'
const NAVBAR = 56

async function open(page, query) {
  await page.goto(`${URL}?freeze&${query}`)
  await page.waitForFunction(() => document.documentElement.dataset.tableLarge === 'ready')
}

const headerTop = page => page.locator('thead th').first().evaluate(th => th.getBoundingClientRect().top)

test.describe('large table', () => {
  test('renders 1000 rows with an accessible name on every checkbox', async ({ page }) => {
    await open(page, 'wrapper=none')
    await expect(page.locator('tbody tr')).toHaveCount(1000)
    const unnamed = await page.locator('input[type="checkbox"]').evaluateAll(inputs => inputs.filter(input => !input.getAttribute('aria-label') && !input.labels.length).length)
    expect(unnamed).toBe(0)
  })

  test('the header sticks under the navbar when the page scrolls', async ({ page }) => {
    await open(page, 'wrapper=none&variants=striped')
    await page.evaluate(() => window.scrollTo(0, 20_000))
    expect(await headerTop(page)).toBeCloseTo(NAVBAR, 0)
  })

  test('the header sticks to a wrapper with a fixed height', async ({ page }) => {
    await open(page, 'wrapper=box')
    const top = await page.locator('.tl-wrapper').evaluate(wrapper => {
      wrapper.scrollTop = 5000
      return wrapper.getBoundingClientRect().top
    })
    expect(await headerTop(page)).toBeCloseTo(top, 0)
  })

  test('scrolling the page leaves few long tasks', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the longtask entry type is Chromium only')
    await open(page, 'wrapper=none&variants=striped,hover')

    await page.evaluate(() => {
      window.longTasks = []
      new PerformanceObserver(list => window.longTasks.push(...list.getEntries().map(entry => entry.duration))).observe({ type: 'longtask', buffered: false })
    })

    // Twenty screens down in steps, as a wheel would.
    for (let step = 0; step < 20; step++) {
      await page.mouse.wheel(0, 700)
      await page.waitForTimeout(50)
    }

    const durations = await page.evaluate(() => window.longTasks)
    // Blocking time is what exceeds 50 ms in each task.
    const blocking = durations.reduce((sum, duration) => sum + Math.max(0, duration - 50), 0)
    console.log(`long tasks while scrolling 1000 rows: ${durations.length}, total blocking time ${Math.round(blocking)} ms`)
    expect(durations.length).toBeLessThan(25)
  })
})
