// What the smoke scenarios (smoke.spec.js) and the keyboard walkthroughs
// (keyboard.spec.js) share: the variants every component runs with, loading
// a kitchen sink page with Bootstrap's events recorded, each component's page
// and partial, SMOKE_SCOPE, and matching known-issues.js.
import { expect, test } from '@playwright/test'
import { configDir, listConfigs, readPartials } from '../../scripts/lib/configs.mjs'
import known from './known-issues.js'

// The working copy, every config, and Bootstrap's prebuilt files.
export const VARIANTS = [
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

export async function load(page, url, params) {
  await page.addInitScript(recordEvents)
  await page.goto(`${url}?${params}&chrome=0&freeze`)
  await page.waitForFunction(() => !document.getElementById('playground-config-pending'))
  await page.waitForFunction(() => window.bootstrap)
}

export const events = page => page.evaluate(() => window.bsEvents)
export const clearEvents = page => page.evaluate(() => {
  window.bsEvents = []
})

// Waits until the events were emitted, in this order (others may interleave).
export async function expectEvents(page, expected) {
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

// Whether Tab reaches buttons and links. WebKit on macOS follows Safari's
// setting, off by default, and only tabs to text fields and selects. Probed
// once per page, from a sentinel to a button.
export async function tabsToControls(page) {
  page.tabsToControls ??= await (async () => {
    await page.evaluate(() => {
      const sentinel = document.createElement('span')
      const probe = document.createElement('button')
      sentinel.tabIndex = -1
      for (const element of [sentinel, probe]) {
        element.dataset.keyboardSentinel = ''
        element.style.position = 'absolute'
      }

      document.body.prepend(sentinel, probe)
      sentinel.focus()
    })
    await page.keyboard.press('Tab')
    return page.evaluate(() => {
      const reached = document.activeElement?.matches('button[data-keyboard-sentinel]')
      for (const element of document.querySelectorAll('[data-keyboard-sentinel]')) {
        element.remove()
      }

      return reached
    })
  })()

  if (!page.tabsToControls && !page.tabsAnnotated) {
    page.tabsAnnotated = true
    test.info().annotations.push({ type: 'Tab skips buttons and links', description: 'WebKit on macOS: steps focus them directly' })
  }

  return page.tabsToControls
}

// The first element matching `selector` outside the playground's UI.
export const first = (page, selector) => page.locator(selector).filter({ visible: true }).first()

// Each component's kitchen sink page, so a pull request that changes the page
// runs its scenario and walkthrough with every config (SMOKE_SCOPE).
export const PAGES = {
  dialog: '/kitchen-sink/components-dialog.html',
  drawer: '/kitchen-sink/components-drawer.html',
  menu: '/kitchen-sink/components-menu.html',
  tooltip: '/kitchen-sink/components-tooltip.html',
  popover: '/kitchen-sink/components-popover.html',
  collapse: '/kitchen-sink/components-collapse.html',
  tab: '/kitchen-sink/components-tab.html',
  carousel: '/kitchen-sink/components-carousel.html',
  toast: '/kitchen-sink/components-toasts.html',
  alert: '/kitchen-sink/components-alert.html',
  button: '/kitchen-sink/components-button.html',
  toggler: '/kitchen-sink/components-toggler.html',
  scrollspy: '/kitchen-sink/components-scrollspy.html',
  combobox: '/kitchen-sink/forms-combobox.html',
  datepicker: '/kitchen-sink/forms-datepicker.html',
  otp: '/kitchen-sink/forms-otp-input.html',
  chips: '/kitchen-sink/forms-chips.html',
  strength: '/kitchen-sink/forms-password-strength.html',
  range: '/kitchen-sink/forms-range.html'
}

// The partial that styles each component. A config that loads only some
// partials (configs/partial) leaves the others out on purpose, so their
// scenarios are skipped there. Toggler and scrollspy only need JavaScript.
export const PARTIALS = {
  dialog: 'dialog',
  drawer: 'drawer',
  menu: 'menu',
  tooltip: 'tooltip',
  popover: 'popover',
  collapse: 'transitions',
  tab: 'nav',
  carousel: 'carousel',
  toast: 'toasts',
  alert: 'alert',
  button: 'buttons',
  combobox: 'forms',
  datepicker: 'datepicker',
  otp: 'forms',
  chips: 'forms',
  strength: 'forms',
  range: 'forms'
}

const loadedPartials = Object.fromEntries(listConfigs().map(({ name }) => [name, readPartials(configDir(name))]))
export const leftOut = (variant, name) => Boolean(loadedPartials[variant] && PARTIALS[name] && !loadedPartials[variant].includes(PARTIALS[name]))

// SMOKE_SCOPE, which `npm run test-scope` prints and smoke.yml sets on pull
// requests: the working copy and dist with every component, the changed
// configs with every component, and the components whose page changed with
// every config. Without it, everything runs.
const scope = process.env.SMOKE_SCOPE ? JSON.parse(process.env.SMOKE_SCOPE) : { full: true }
export const inScope = (variant, name) => scope.full || ['working', 'dist'].includes(variant) ||
  scope.configs.includes(variant) || scope.urls.includes(PAGES[name])

// The known-issues.js entries that apply to a variant in an engine, among
// `entries` (a scenario's, or a walkthrough's).
export const knownFor = (entries, variant, browserName) => entries.filter(entry =>
  (!entry.configs || entry.configs.includes(variant)) &&
  (!entry.engines || entry.engines.includes(browserName)))

export { known }
