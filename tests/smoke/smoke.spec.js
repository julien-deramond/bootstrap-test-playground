// Interaction smoke tests: for every Bootstrap JavaScript component, open it
// on its kitchen sink page, check its state, walk its keyboard paths, close
// it, and check that the expected `*.bs.*` events fired and nothing is left
// stuck (focus, scroll lock, an open dialog).
//
// Every scenario runs against the working copy and every config: a config
// must never break behavior. A `dist` variant runs the working copy with
// Bootstrap's prebuilt files (`?css=dist&js=dist`), what users install. Pages load with `?chrome=0&freeze`, so
// transitions are off and `shown`/`hidden` fire right away.
//
// SMOKE_SCOPE, which `npm run test-scope` prints and smoke.yml sets on pull
// requests, limits the run to what changed: the working copy and dist on every
// scenario, the changed configs on every scenario, and the scenarios whose
// page changed with every config. Without it, everything runs.
//
// Known upstream bugs are listed in known-issues.js: their scenario is marked
// `test.fail()`, so Playwright reports it when it starts passing. The suite
// runs in each engine (`smoke`, `smoke-firefox`, `smoke-webkit`), and an
// entry can be limited to some of them.
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loadEnv } from 'vite'
import { bootstrapSource } from '../../scripts/lib/bootstrap.mjs'
import { root } from '../../scripts/lib/configs.mjs'
import { listReproductions } from '../../scripts/lib/export-issue.mjs'
import { readReproductionMeta } from '../../scripts/lib/repro-status.mjs'
import { PAGES, PARTIALS, VARIANTS, clearEvents, events, expectEvents, first, inScope, known, knownFor, leftOut, load, tabsToControls } from './shared.js'

// What a closed overlay could leave behind: open dialogs (some docs examples
// render one open), a scroll lock, inert content.
const overlayState = page => page.evaluate(() => ({
  openDialogs: document.querySelectorAll('dialog[open]').length,
  htmlOverflow: getComputedStyle(document.documentElement).overflow,
  bodyOverflow: getComputedStyle(document.body).overflow,
  inert: document.querySelectorAll('[inert]').length
}))

async function expectNothingStuck(page, before) {
  expect(await overlayState(page), 'nothing left stuck').toEqual(before)
}

// Marks the element a locator matches now, so a locator whose selector stops
// matching after an interaction (`[aria-pressed="false"]`) keeps pointing at it.
async function pin(page, locator, name) {
  await locator.evaluate((element, value) => {
    element.dataset.smoke = value
  }, name)
  return page.locator(`[data-smoke="${name}"]`)
}

// '' when the tab order overlay draws its stop `index` over `selector` (the
// focused element by default), else where both are. The page may still be
// scrolling to the control (the overlay only draws the boxes in the viewport,
// a frame later), so both are measured together on every attempt, and
// sub-pixel text widths differ slightly between them in WebKit.
const drawnOver = (layer, index, selector) => layer.evaluate((layer, [index, selector]) => {
  const target = selector ? document.querySelector(selector) : document.activeElement
  const box = layer.querySelector(`.box[data-index="${index}"]`)
  const rect = element => {
    const { left, top, width, height } = element.getBoundingClientRect()
    return { left, top, width, height }
  }

  if (box && target && Object.entries(rect(target)).every(([key, value]) => Math.abs(rect(box)[key] - value) < 0.5)) {
    return ''
  }

  const where = element => Object.values(rect(element)).map(value => Math.round(value * 10) / 10).join(', ')
  const name = target ? `${target.localName}${target.id ? `#${target.id}` : ''} at ${where(target)}` : 'nothing'
  return `${name}, box ${box ? `at ${where(box)}` : 'not drawn'}`
}, [index, selector])

// In the page, given the element focused before Tab: whether Tab went from a
// radio without a name past the next one of the same form. Marks that radio
// `data-skipped-radio` and scrolls it into view.
function skipsUnnamedRadio(from) {
  const unnamed = element => element?.matches?.('input[type="radio"]:not([name]), input[type="radio"][name=""]')
  if (!unnamed(from)) {
    return false
  }

  const to = document.activeElement
  const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
  // Focus left the page's stops: Tab wrapped around, or went to the browser.
  const end = !to || to === document.body || !follows(from, to)
  const skipped = [...document.querySelectorAll('input[type="radio"]')].find(radio =>
    unnamed(radio) && radio.form === from.form && follows(from, radio) && (end || follows(radio, to)) &&
    !radio.disabled && radio.tabIndex >= 0 && !radio.closest('[inert]') && radio.checkVisibility({ visibilityProperty: true }))
  if (!skipped) {
    return false
  }

  skipped.dataset.skippedRadio = ''
  skipped.scrollIntoView({ block: 'center' })
  return true
}

const SCENARIOS = {
  async dialog(page) {
    await load(page, PAGES.dialog, page.config)
    const trigger = first(page, '[data-bs-toggle="dialog"][data-bs-target]')
    const dialog = page.locator(await trigger.getAttribute('data-bs-target'))
    const before = await overlayState(page)

    await trigger.click()
    await expect(dialog).toHaveAttribute('open', '')
    await expectEvents(page, ['show.bs.dialog', 'shown.bs.dialog'])
    await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)

    await clearEvents(page)
    await page.keyboard.press('Escape')
    await expect(dialog).not.toHaveAttribute('open')
    await expectEvents(page, ['hide.bs.dialog', 'hidden.bs.dialog'])
    await expect(trigger).toBeFocused()
    await expectNothingStuck(page, before)
  },

  async drawer(page) {
    await load(page, PAGES.drawer, page.config)
    const trigger = first(page, '[data-bs-toggle="drawer"][data-bs-target]')
    const drawer = page.locator(await trigger.getAttribute('data-bs-target'))
    // The docs render some drawers open, and opening a drawer closes the one
    // already open (on purpose). Close them first, for a clean baseline.
    await page.evaluate(() => {
      for (const element of document.querySelectorAll('dialog.drawer[open]')) {
        window.bootstrap.Drawer.getOrCreateInstance(element).hide()
      }
    })
    await expect(page.locator('dialog.drawer[open]')).toHaveCount(0)
    await clearEvents(page)
    const before = await overlayState(page)

    await trigger.click()
    await expect(drawer).toHaveAttribute('open', '')
    await expectEvents(page, ['show.bs.drawer', 'shown.bs.drawer'])

    await clearEvents(page)
    await page.keyboard.press('Escape')
    await expect(drawer).not.toHaveAttribute('open')
    await expectEvents(page, ['hide.bs.drawer', 'hidden.bs.drawer'])
    await expect(trigger).toBeFocused()
    await expectNothingStuck(page, before)
  },

  async menu(page) {
    await load(page, PAGES.menu, page.config)
    const toggle = first(page, '[data-bs-toggle="menu"]')
    const menu = toggle.locator('xpath=following-sibling::*[contains(concat(" ", @class, " "), " menu ")][1]')

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(menu).toBeVisible()
    await expectEvents(page, ['show.bs.menu', 'shown.bs.menu'])

    await page.keyboard.press('ArrowDown')
    const items = menu.locator('.menu-item:not(.disabled, :disabled)')
    await expect.poll(() => items.evaluateAll(list => list.indexOf(document.activeElement))).toBeGreaterThanOrEqual(0)
    const firstFocused = await items.evaluateAll(list => list.indexOf(document.activeElement))
    await page.keyboard.press('ArrowDown')
    await expect.poll(() => items.evaluateAll(list => list.indexOf(document.activeElement))).not.toBe(firstFocused)
    await page.keyboard.press('End')
    await expect.poll(() => items.evaluateAll(list => list.indexOf(document.activeElement) === list.length - 1)).toBe(true)
    await page.keyboard.press('Home')
    await expect.poll(() => items.evaluateAll(list => list.indexOf(document.activeElement))).toBe(0)

    await clearEvents(page)
    await page.keyboard.press('Escape')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(menu).toBeHidden()
    await expectEvents(page, ['hide.bs.menu', 'hidden.bs.menu'])
    await expect(toggle).toBeFocused()
  },

  async tooltip(page) {
    await load(page, PAGES.tooltip, page.config)
    const trigger = first(page, '[data-bs-toggle="tooltip"]')

    await trigger.focus()
    const tooltip = page.locator('.tooltip')
    await expect(tooltip).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-describedby', /.+/)
    await expectEvents(page, ['show.bs.tooltip', 'inserted.bs.tooltip', 'shown.bs.tooltip'])

    await clearEvents(page)
    await page.keyboard.press('Escape')
    await expect(tooltip).toHaveCount(0)
    await expectEvents(page, ['hide.bs.tooltip', 'hidden.bs.tooltip'])
  },

  async popover(page) {
    await load(page, PAGES.popover, page.config)
    const trigger = first(page, '[data-bs-toggle="popover"]')

    await trigger.click()
    const popover = page.locator('.popover')
    await expect(popover).toBeVisible()
    await expectEvents(page, ['show.bs.popover', 'inserted.bs.popover', 'shown.bs.popover'])

    await clearEvents(page)
    await trigger.click()
    await expect(popover).toHaveCount(0)
    await expectEvents(page, ['hide.bs.popover', 'hidden.bs.popover'])
  },

  async collapse(page) {
    await load(page, PAGES.collapse, page.config)
    const toggle = first(page, '[data-bs-toggle="collapse"]')
    const target = page.locator(await toggle.getAttribute('data-bs-target') ?? await toggle.getAttribute('href'))

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(target).toHaveClass(/\bshow\b/)
    await expect(target).toBeVisible()
    await expectEvents(page, ['show.bs.collapse', 'shown.bs.collapse'])

    await clearEvents(page)
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(target).toBeHidden()
    await expectEvents(page, ['hide.bs.collapse', 'hidden.bs.collapse'])
  },

  async tab(page) {
    await load(page, PAGES.tab, page.config)
    const tablist = first(page, '[role="tablist"]:has([data-bs-toggle="tab"])')
    const tabs = tablist.locator('[data-bs-toggle="tab"]:not(.disabled, :disabled)')
    const selected = () => tabs.evaluateAll(list => list.findIndex(tab => tab.getAttribute('aria-selected') === 'true'))

    await tabs.nth(1).click()
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
    const pane = page.locator(await tabs.nth(1).getAttribute('data-bs-target'))
    await expect(pane).toHaveClass(/\bactive\b/)
    await expect(pane).toBeVisible()
    await expectEvents(page, ['hide.bs.tab', 'show.bs.tab', 'hidden.bs.tab', 'shown.bs.tab'])

    await page.keyboard.press('ArrowRight')
    await expect.poll(selected).toBe(2 % await tabs.count())
    await page.keyboard.press('Home')
    await expect.poll(selected).toBe(0)
    await page.keyboard.press('End')
    await expect.poll(selected).toBe(await tabs.count() - 1)
  },

  async carousel(page) {
    await load(page, PAGES.carousel, page.config)
    const carousel = first(page, '.carousel:has([data-bs-slide="next"])')
    const active = () => carousel.locator('.carousel-item').evaluateAll(list => list.findIndex(item => item.classList.contains('active')))
    const before = await active()

    await carousel.locator('[data-bs-slide="next"]').first().click()
    await expectEvents(page, ['slide.bs.carousel', 'slid.bs.carousel'])
    await expect.poll(active).not.toBe(before)

    await clearEvents(page)
    await carousel.locator('[data-bs-slide="prev"]').first().click()
    await expectEvents(page, ['slide.bs.carousel', 'slid.bs.carousel'])
    await expect.poll(active).toBe(before)
  },

  async toast(page) {
    await load(page, PAGES.toast, page.config)
    const toast = page.locator('#liveToast')

    await page.locator('#liveToastBtn').click()
    await expect(toast).toBeVisible()
    await expectEvents(page, ['show.bs.toast', 'shown.bs.toast'])

    await clearEvents(page)
    await toast.locator('[data-bs-dismiss="toast"]').click()
    await expect(toast).toBeHidden()
    await expectEvents(page, ['hide.bs.toast', 'hidden.bs.toast'])
  },

  async alert(page) {
    await load(page, PAGES.alert, page.config)
    const alert = first(page, '.alert:has([data-bs-dismiss="alert"])')
    const count = await page.locator('.alert').count()

    await alert.locator('[data-bs-dismiss="alert"]').click()
    await expectEvents(page, ['close.bs.alert', 'closed.bs.alert'])
    await expect(page.locator('.alert')).toHaveCount(count - 1)
  },

  async button(page) {
    await load(page, PAGES.button, page.config)
    const button = await pin(page, first(page, '[data-bs-toggle="button"][aria-pressed="false"]'), 'button')

    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(button).toHaveClass(/\bactive\b/)
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await expect(button).not.toHaveClass(/\bactive\b/)
  },

  async toggler(page) {
    await load(page, PAGES.toggler, page.config)
    const toggler = first(page, '[data-bs-toggle="toggler"][data-bs-attribute="class"]')
    const value = await toggler.getAttribute('data-bs-value')

    await toggler.click()
    await expect(toggler).toHaveClass(new RegExp(`\\b${value}\\b`))
    await expectEvents(page, ['toggle.bs.toggler', 'toggled.bs.toggler'])
    await toggler.click()
    await expect(toggler).not.toHaveClass(new RegExp(`\\b${value}\\b`))
  },

  async scrollspy(page) {
    await load(page, PAGES.scrollspy, page.config)
    const spy = first(page, '[data-bs-spy="scroll"]')
    const nav = page.locator(await spy.getAttribute('data-bs-target'))

    await spy.evaluate(element => element.scrollTo({ top: element.scrollHeight, behavior: 'instant' }))
    await expectEvents(page, ['activate.bs.scrollspy'])
    const links = nav.locator('a[href^="#"]')
    await expect.poll(() => links.evaluateAll(list => list.findLastIndex(link => link.classList.contains('active')))).toBeGreaterThan(0)
  },

  async combobox(page) {
    await load(page, PAGES.combobox, page.config)
    const toggle = first(page, '[data-bs-toggle="combobox"]')
    const value = toggle.locator('.combobox-value')

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expectEvents(page, ['show.bs.combobox', 'shown.bs.combobox'])

    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expectEvents(page, ['change.bs.combobox'])
    await expect(value).not.toHaveText(await toggle.getAttribute('data-bs-placeholder'))

    await clearEvents(page)
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Escape')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expectEvents(page, ['hide.bs.combobox', 'hidden.bs.combobox'])
  },

  async datepicker(page) {
    await load(page, PAGES.datepicker, page.config)
    const input = first(page, 'input[data-bs-toggle="datepicker"]')

    await input.click()
    await expectEvents(page, ['show.bs.datepicker', 'shown.bs.datepicker'])
    const calendar = page.locator('[data-vc="calendar"]').filter({ visible: true })
    await expect(calendar.first()).toBeVisible()

    await clearEvents(page)
    await page.keyboard.press('Escape')
    await expectEvents(page, ['hide.bs.datepicker', 'hidden.bs.datepicker'])
  },

  async otp(page) {
    await load(page, PAGES.otp, page.config)
    const otp = first(page, '[data-bs-otp]')
    const length = await otp.locator('.otp-slot').count() || 6

    await otp.locator('input').first().focus()
    await page.keyboard.type('123456789'.slice(0, length))
    await expect.poll(async () => (await events(page)).some(type => type.startsWith('complete.'))).toBe(true)
  },

  async chips(page) {
    await load(page, PAGES.chips, page.config)
    const input = first(page, '[data-bs-chips]').locator('input').first()
    const chips = first(page, '[data-bs-chips]').locator('.chip')
    const count = await chips.count()

    await input.fill('Smoke')
    await input.press('Enter')
    await expectEvents(page, ['add.bs.chips'])
    await expect(chips).toHaveCount(count + 1)

    // The first Backspace selects the last chip and focuses it; the second
    // one, on the chip, removes it.
    await clearEvents(page)
    await input.press('Backspace')
    await page.keyboard.press('Backspace')
    await expectEvents(page, ['remove.bs.chips'])
    await expect(chips).toHaveCount(count)
  },

  async strength(page) {
    await load(page, PAGES.strength, page.config)
    const input = first(page, '.bd-example:has([data-bs-strength]) input[type="password"]')

    await input.fill('a')
    await input.fill('Tr0ub4dor&3-horse-battery')
    await expect.poll(async () => (await events(page)).some(type => type.startsWith('strengthChange.'))).toBe(true)
  },

  async range(page) {
    await load(page, PAGES.range, page.config)
    const input = first(page, '.form-range-input')
    const fill = () => input.evaluate(element => element.closest('.form-range').style.getPropertyValue('--bs-range-fill') || element.style.getPropertyValue('--bs-range-fill'))
    const before = await fill()

    await input.focus()
    await page.keyboard.press('End')
    await expect.poll(fill).not.toBe(before)
    await expect.poll(async () => (await events(page)).some(type => type.startsWith('changed.'))).toBe(true)
  }
}

for (const { name: variant, params } of VARIANTS) {
  test.describe(variant, () => {
    for (const [name, scenario] of Object.entries(SCENARIOS).filter(([name]) => inScope(variant, name))) {
      test(name, async ({ page, browserName }) => {
        const [issue] = knownFor(known.filter(entry => entry.scenario === name), variant, browserName)
        test.skip(leftOut(variant, name), `${variant} doesn't load the ${PARTIALS[name]} partial`)
        test.fail(Boolean(issue), issue && `known upstream bug #${issue.issue}`)
        page.config = params
        await scenario(page)
      })
    }
  })
}

// The playground's own configurator, once per engine and whatever the scope:
// open the panel, pick a config from a category, the stylesheets swap, then
// close it, reopen it with its shortcut and reset. Builds hash the
// stylesheets' URLs, so the swap shows in `pill`'s radius token.
test.describe('playground', () => {
  test('toolbar', async ({ page }) => {
    await page.goto('/kitchen-sink/components-button.html?freeze')
    await page.waitForFunction(() => window.bootstrap)

    const toolbar = page.locator('#playground-toolbar')
    const summary = toolbar.getByRole('button', { name: /^Playground settings/ })
    const panel = toolbar.getByRole('dialog', { name: 'Playground settings' })
    const styles = () => page.evaluate(() => [...document.querySelectorAll('link[data-playground-styles]')].map(link => link.href))
    const radius = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bs-radius-5'))
    const working = await styles()

    await summary.click()
    await expect(panel).toBeVisible()
    await panel.getByRole('searchbox', { name: 'Filter configs' }).fill('radius')
    await expect(panel.getByRole('group', { name: /^Typography/ })).toBeHidden()
    // The radios are visually hidden: click the label, as a user would.
    const shape = panel.getByRole('group', { name: /^Shape/ })
    const pill = shape.getByRole('radio', { name: /^pill/ })
    await shape.locator('label', { has: page.getByRole('radio', { name: /^pill/ }) }).click()
    await expect(pill).toBeChecked()
    await expect.poll(radius).toBe('2rem')
    expect(await styles()).not.toEqual(working)
    await expect(summary).toHaveAccessibleName(/pill/)

    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await page.keyboard.press('Alt+Shift+P')
    await expect(panel).toBeVisible()

    await panel.getByRole('button', { name: 'Reset' }).click()
    await expect.poll(styles).toEqual(working)
    await expect.poll(radius).not.toBe('2rem')
    await expect(summary).toHaveAccessibleName('Playground settings: src/styles')
  })

  // Class names and tokens find the pages whose markup uses them, on the home
  // page and in the page switcher.
  test('search by class and token', async ({ page }) => {
    await page.goto('/?q=btn-subtle')
    const first = page.locator('#results .page-card').first()
    await expect(first.getByRole('heading')).toHaveText('Button')
    await expect(first.locator('.page-card-matches')).toHaveText('.btn-subtle')
    await expect(first.locator('.page-card-section')).toHaveText('Variants')

    await page.goto('/kitchen-sink/components-button.html?freeze')
    await page.waitForFunction(() => window.bootstrap)
    await page.keyboard.press('ControlOrMeta+K')
    const palette = page.locator('#playground-palette').getByRole('dialog', { name: 'Go to page' })
    await palette.getByRole('combobox').fill('--alert-padding-x')
    await expect(palette.getByRole('option').first()).toContainText('Alert')
    await expect(palette.getByRole('option').first()).toContainText('--alert-padding-x')
  })

  // Reproductions show their upstream status on the home page, from their
  // <meta name="playground-upstream">, and the sidebar filters by it.
  test('reproduction status', async ({ page }) => {
    const statuses = listReproductions().map(name => readReproductionMeta(name)?.status).filter(Boolean)
    test.skip(statuses.length === 0, 'No reproduction with an upstream status')

    await page.goto('/?group=issues')
    const cards = page.locator('#results .page-card')
    await expect(cards.locator('.page-card-repro .badge')).toHaveCount(statuses.length)

    const [status] = statuses
    const chip = page.locator('#status-filters').locator(`[data-repro-status="${status}"]`)
    await expect(chip).toContainText(String(statuses.filter(entry => entry === status).length))
    await chip.click()
    await expect(page).toHaveURL(new RegExp(`status=${status}`))
    await expect(chip).toHaveAttribute('aria-pressed', 'true')
    await expect(cards).toHaveCount(statuses.filter(entry => entry === status).length)
    await chip.click()
    await expect(page).not.toHaveURL(/status=/)
  })

  // Every reproduction exports itself for upstream maintainers
  // (scripts/lib/export-issue.mjs): one HTML file, whose Bootstrap comes from
  // jsDelivr, served here from the local copy, and a project the toolbar posts
  // to StackBlitz, intercepted here.
  test('issue exports', async ({ page, request }) => {
    const names = listReproductions()
    test.skip(names.length === 0, 'No reproduction left in issues/')

    const bootstrap = bootstrapSource(loadEnv('production', root, ''))
    const bootstrapDir = bootstrap.dir ?? path.join(root, 'node_modules/bootstrap')
    await page.context().route('https://cdn.jsdelivr.net/gh/twbs/bootstrap@*/**', route => route.fulfill({
      // /gh/twbs/bootstrap@<sha>/dist/js/bootstrap.bundle.min.js → dist/js/…
      path: path.join(bootstrapDir, ...new URL(route.request().url()).pathname.split('/').slice(4))
    }))
    const posts = []
    await page.context().route('https://stackblitz.com/**', route => {
      posts.push(route.request())
      return route.fulfill({ contentType: 'text/html', body: '<title>StackBlitz</title>' })
    })

    for (const name of names) {
      const html = await (await request.get(`/issues/${name}/export.html`)).text()
      expect(html, name).toContain('/dist/js/bootstrap.bundle.min.js')
      expect(html, name).not.toMatch(/data-playground-chrome|src="[^"]*(src\/js\/main\.js|playground-prefs\.js)"/)
      const project = await (await request.get(`/issues/${name}/stackblitz.json`)).json()
      expect(Object.keys(project.files), name).toEqual(expect.arrayContaining(['index.html', 'main.js', 'main.scss', '_custom.scss', 'tokens.css', 'package.json']))
    }

    // The HTML export renders alone, with Bootstrap's styles and JavaScript.
    const [name] = names
    await page.goto(`/issues/${name}/export.html`)
    await page.waitForFunction(() => window.bootstrap)
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bs-primary-base'))).not.toBe('')

    await page.goto(`/issues/${name}/?freeze`)
    await page.waitForFunction(() => window.bootstrap)
    await page.keyboard.press('Alt+Shift+P')
    const panel = page.locator('#playground-toolbar').getByRole('dialog', { name: 'Playground settings' })
    await expect(panel.getByRole('link', { name: 'Export HTML' })).toHaveAttribute('download', `bootstrap-repro-${name}.html`)
    // A page of its own posts the project: an imported reproduction's
    // Content-Security-Policy blocks forms to other sites.
    const popup = page.waitForEvent('popup')
    await panel.getByRole('link', { name: 'Open in StackBlitz' }).click()
    await expect(await popup).toHaveTitle('StackBlitz')
    expect(posts).toHaveLength(1)
    const fields = new URLSearchParams(posts[0].postData())
    expect(posts[0].method()).toBe('POST')
    expect(fields.get('project[template]')).toBe('node')
    expect(fields.get('project[files][main.scss]')).toContain('bootstrap/scss/bootstrap')
  })

  // The tab order overlay (src/js/tab-order.js) numbers the tab stops in the
  // order Tab visits them: roving tabindex, disabled controls, radio groups.
  test('tab order', async ({ page, browserName }) => {
    await page.goto('/kitchen-sink/components-button.html?freeze')
    await page.waitForFunction(() => window.bootstrap)
    const toolbar = page.locator('#playground-toolbar')
    await toolbar.getByRole('button', { name: /^Playground settings/ }).click()
    const button = toolbar.getByRole('button', { name: /^Show tab order/ })
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('Escape')
    const layer = page.locator('#playground-tab-order [popover]')
    await expect(layer).toHaveAttribute('data-count', /^\d+$/)
    test.skip(!await tabsToControls(page), 'Tab skips buttons and links here')

    // It stays on from page to page, in the same tab.
    for (const url of ['/kitchen-sink/components-tab.html', '/kitchen-sink/forms-radio.html']) {
      await page.goto(`${url}?freeze`)
      await page.waitForFunction(() => window.bootstrap)
      await expect(layer).toHaveAttribute('data-count', /^\d+$/)
      const count = Math.min(Number(await layer.getAttribute('data-count')), 60)
      for (let index = 1; index <= count; index++) {
        const previous = await page.evaluateHandle(() => document.activeElement)
        await page.keyboard.press('Tab')
        // WebKit's Tab never goes from a radio without a name to another one
        // of the same form: it takes them all for a single group, where HTML
        // puts each in a group of its own, as the overlay, Chromium and Firefox
        // do. Check that the overlay's stop is the radio WebKit skipped; the
        // rest of the page no longer lines up.
        if (browserName === 'webkit' && await previous.evaluate(skipsUnnamedRadio)) {
          await expect.poll(() => drawnOver(layer, index, '[data-skipped-radio]'), `tab stop ${index} of ${url}, skipped by WebKit`).toBe('')
          test.info().annotations.push({ type: 'WebKit skips unnamed radios', description: `${url}: walked ${index - 1} of ${count} stops` })
          break
        }

        await expect.poll(() => drawnOver(layer, index), `tab stop ${index} of ${url}`).toBe('')
      }
    }

    await page.keyboard.press('Alt+Shift+O')
    await expect(layer).toHaveCount(0)
  })

  // The first-visit hint hides under automation: pretend to be a person.
  test('toolbar hint', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }))
    await page.goto('/kitchen-sink/components-button.html?freeze')

    const toolbar = page.locator('#playground-toolbar')
    const hint = toolbar.getByRole('note', { name: 'Playground settings' })
    const summary = toolbar.getByRole('button', { name: /^Playground settings/ })
    await expect(hint).toBeVisible()
    await expect(summary).toHaveAccessibleDescription(/Switch the config/)

    await hint.getByRole('button', { name: 'Dismiss' }).click()
    await expect(hint).toBeHidden()
    await expect(summary).not.toHaveAccessibleDescription(/Switch the config/)
    await page.reload()
    await expect(summary).toBeVisible()
    await expect(hint).toBeHidden()

    // Opening the panel counts as having seen it too.
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(hint).toBeVisible()
    await page.keyboard.press('Alt+Shift+P')
    await expect(toolbar.getByRole('dialog', { name: 'Playground settings' })).toBeVisible()
    await expect(hint).toBeHidden()
  })
})
