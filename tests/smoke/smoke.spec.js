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
// Known upstream bugs are listed in known-issues.js: their scenario is marked
// `test.fail()`, so Playwright reports it when it starts passing. The suite
// runs in each engine (`smoke`, `smoke-firefox`, `smoke-webkit`), and an
// entry can be limited to some of them.
import { expect, test } from '@playwright/test'
import { listConfigs } from '../../scripts/lib/configs.mjs'
import known from './known-issues.js'

const VARIANTS = [
  ...['working', ...listConfigs().map(({ name }) => name)].map(config => ({ name: config, params: `config=${config}` })),
  { name: 'dist', params: 'config=working&css=dist&js=dist' }
]

// Records every Bootstrap event (`show.bs.menu`…) as it's dispatched.
function recordEvents() {
  window.bsEvents = []
  const dispatch = EventTarget.prototype.dispatchEvent
  EventTarget.prototype.dispatchEvent = function (event) {
    if (event.type.includes('.bs.')) {
      window.bsEvents.push(event.type)
    }

    return dispatch.call(this, event)
  }
}

async function load(page, url, params) {
  await page.addInitScript(recordEvents)
  await page.goto(`${url}?${params}&chrome=0&freeze`)
  await page.waitForFunction(() => !document.getElementById('playground-config-pending'))
  await page.waitForFunction(() => window.bootstrap)
}

const events = page => page.evaluate(() => window.bsEvents)
const clearEvents = page => page.evaluate(() => {
  window.bsEvents = []
})

// Waits until the events were emitted, in this order (others may interleave).
async function expectEvents(page, expected) {
  await expect.poll(async () => {
    const seen = await events(page)
    let index = 0
    for (const type of seen) {
      if (type === expected[index]) {
        index++
      }
    }

    return expected.slice(index)
  }, { message: `events ${expected.join(', ')}`, timeout: 3000 }).toEqual([])
}

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

// The first element matching `selector` outside the playground's UI.
const first = (page, selector) => page.locator(selector).filter({ visible: true }).first()

const SCENARIOS = {
  async dialog(page) {
    await load(page, '/kitchen-sink/components-dialog.html', page.config)
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
    await load(page, '/kitchen-sink/components-drawer.html', page.config)
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
    await load(page, '/kitchen-sink/components-menu.html', page.config)
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
    await load(page, '/kitchen-sink/components-tooltip.html', page.config)
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
    await load(page, '/kitchen-sink/components-popover.html', page.config)
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
    await load(page, '/kitchen-sink/components-collapse.html', page.config)
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
    await load(page, '/kitchen-sink/components-tab.html', page.config)
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
    await load(page, '/kitchen-sink/components-carousel.html', page.config)
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
    await load(page, '/kitchen-sink/components-toasts.html', page.config)
    const toast = page.locator('.toast:has([data-bs-dismiss="toast"])').first()

    await toast.evaluate(element => window.bootstrap.Toast.getOrCreateInstance(element, { autohide: false }).show())
    await expect(toast).toBeVisible()
    await expectEvents(page, ['show.bs.toast', 'shown.bs.toast'])

    await clearEvents(page)
    await toast.locator('[data-bs-dismiss="toast"]').click()
    await expect(toast).toBeHidden()
    await expectEvents(page, ['hide.bs.toast', 'hidden.bs.toast'])
  },

  async alert(page) {
    await load(page, '/kitchen-sink/components-alert.html', page.config)
    const alert = first(page, '.alert:has([data-bs-dismiss="alert"])')
    const count = await page.locator('.alert').count()

    await alert.locator('[data-bs-dismiss="alert"]').click()
    await expectEvents(page, ['close.bs.alert', 'closed.bs.alert'])
    await expect(page.locator('.alert')).toHaveCount(count - 1)
  },

  async button(page) {
    await load(page, '/kitchen-sink/components-button.html', page.config)
    const button = await pin(page, first(page, '[data-bs-toggle="button"][aria-pressed="false"]'), 'button')

    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(button).toHaveClass(/\bactive\b/)
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await expect(button).not.toHaveClass(/\bactive\b/)
  },

  async toggler(page) {
    await load(page, '/kitchen-sink/components-toggler.html', page.config)
    const toggler = first(page, '[data-bs-toggle="toggler"][data-bs-attribute="class"]')
    const value = await toggler.getAttribute('data-bs-value')

    await toggler.click()
    await expect(toggler).toHaveClass(new RegExp(`\\b${value}\\b`))
    await expectEvents(page, ['toggle.bs.toggler', 'toggled.bs.toggler'])
    await toggler.click()
    await expect(toggler).not.toHaveClass(new RegExp(`\\b${value}\\b`))
  },

  async scrollspy(page) {
    await load(page, '/kitchen-sink/components-scrollspy.html', page.config)
    const spy = first(page, '[data-bs-spy="scroll"]')
    const nav = page.locator(await spy.getAttribute('data-bs-target'))

    await spy.evaluate(element => element.scrollTo({ top: element.scrollHeight, behavior: 'instant' }))
    await expectEvents(page, ['activate.bs.scrollspy'])
    const links = nav.locator('a[href^="#"]')
    await expect.poll(() => links.evaluateAll(list => list.findLastIndex(link => link.classList.contains('active')))).toBeGreaterThan(0)
  },

  async combobox(page) {
    await load(page, '/kitchen-sink/forms-combobox.html', page.config)
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
    await load(page, '/kitchen-sink/forms-datepicker.html', page.config)
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
    await load(page, '/kitchen-sink/forms-otp-input.html', page.config)
    const otp = first(page, '[data-bs-otp]')
    const length = await otp.locator('.otp-slot').count() || 6

    await otp.locator('input').first().focus()
    await page.keyboard.type('123456789'.slice(0, length))
    await expect.poll(async () => (await events(page)).some(type => type.startsWith('complete.'))).toBe(true)
  },

  async chips(page) {
    await load(page, '/kitchen-sink/forms-chips.html', page.config)
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
    await load(page, '/kitchen-sink/forms-password-strength.html', page.config)
    const input = first(page, '.bd-example:has([data-bs-strength]) input[type="password"]')

    await input.fill('a')
    await input.fill('Tr0ub4dor&3-horse-battery')
    await expect.poll(async () => (await events(page)).some(type => type.startsWith('strengthChange.'))).toBe(true)
  },

  async range(page) {
    await load(page, '/kitchen-sink/forms-range.html', page.config)
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
    for (const [name, scenario] of Object.entries(SCENARIOS)) {
      test(name, async ({ page, browserName }) => {
        const issue = known.find(entry => entry.scenario === name &&
          (!entry.configs || entry.configs.includes(variant)) &&
          (!entry.engines || entry.engines.includes(browserName)))
        test.fail(Boolean(issue), issue && `known upstream bug #${issue.issue}`)
        page.config = params
        await scenario(page)
      })
    }
  })
}
