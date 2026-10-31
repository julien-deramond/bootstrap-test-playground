// The playground's own UI with the keyboard only: the toolbar's pill, its
// settings panel, its Alt+Shift shortcuts and the Ctrl+K page switcher. They
// sit on top of every page under test, so a focus trap, a lost focus or a
// shortcut that takes a key from the page would be blamed on Bootstrap.
//
// Each test loads a kitchen sink page with the toolbar (no `chrome=0`), with
// `?freeze` so transitions are off, and checks:
//
// - the pill's tab order, and the names of the panel's segmented controls;
// - the panel: focus moves in, stays in, and Escape gives it back to the pill;
// - the page switcher: arrow keys, Enter, and Escape giving focus back to what
//   had it;
// - each shortcut, and that none fires while typing in a text field of the
//   page (src/js/shortcuts.js), while the playground's own fields keep them;
// - Escape with a Bootstrap dialog under the panel or the switcher: one press
//   closes only the top layer.
//
// It runs once, with the working copy, in each engine: the toolbar doesn't
// change with the config. A failure here is the playground's to fix, never an
// entry in known-issues.js. The axe side of the same UI is
// tests/a11y/playground-ui.spec.js.
import { expect as baseExpect, test } from '@playwright/test'
import { tabsToControls } from './shared.js'

const expect = baseExpect.configure({ timeout: 3000 })

const DIALOG_PAGE = '/kitchen-sink/components-dialog.html'
const FORM_PAGE = '/kitchen-sink/forms-form-control.html'

async function load(page, url) {
  await page.goto(`${url}?freeze`)
  await page.waitForFunction(() => window.bootstrap && document.getElementById('playground-toolbar'))
}

// Playwright's locators pierce open shadow roots.
const toolbar = page => page.locator('#playground-toolbar')
const panel = page => toolbar(page).locator('dialog')
const summary = page => toolbar(page).getByRole('button', { name: /^Playground settings/ })
const palette = page => page.locator('#playground-palette dialog')
const paletteInput = page => palette(page).getByRole('combobox')

const prefs = page => page.evaluate(() => window.playgroundPrefs.effective())

// What a shortcut must not change.
const snapshot = async page => ({
  ...await prefs(page),
  panel: await panel(page).evaluate(dialog => dialog.open),
  palette: await palette(page).evaluate(dialog => dialog.open),
  tabOrder: await page.locator('#playground-tab-order').count()
})

// Whether focus is in `locator`'s element, looking through shadow roots.
const holdsFocus = locator => locator.evaluate(element => {
  let active = document.activeElement
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement
  }

  return element.contains(active) || element.getRootNode().activeElement === element
})

const SHORTCUTS = ['Alt+Shift+KeyT', 'Alt+Shift+KeyD', 'Alt+Shift+KeyP', 'Alt+Shift+KeyO', 'ControlOrMeta+KeyK']

test.describe('playground keyboard', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the pill is in the tab order', async ({ page }) => {
    await load(page, DIALOG_PAGE)
    const stops = [
      toolbar(page).getByRole('link', { name: 'All pages' }),
      toolbar(page).getByRole('link', { name: /^Previous: / }),
      toolbar(page).getByRole('link', { name: /^Next: / }),
      summary(page),
      toolbar(page).getByRole('button', { name: /^Go to another page/ })
    ]

    if (!await tabsToControls(page)) {
      for (const stop of stops) {
        await stop.focus()
        await expect(stop).toBeFocused()
      }

      return
    }

    // From a sentinel right before the toolbar, appended last to the body.
    await page.evaluate(() => {
      const sentinel = document.createElement('span')
      sentinel.tabIndex = -1
      document.getElementById('playground-toolbar').before(sentinel)
      sentinel.focus()
    })
    for (const stop of stops) {
      await page.keyboard.press('Tab')
      await expect(stop).toBeFocused()
    }
  })

  test('the panel traps focus and gives it back on Escape', async ({ page }) => {
    await load(page, DIALOG_PAGE)
    await summary(page).focus()
    await page.keyboard.press('Enter')
    await expect(panel(page)).toHaveAttribute('open', '')
    await expect(summary(page)).toHaveAttribute('aria-expanded', 'true')
    await expect.poll(() => holdsFocus(panel(page)), { message: 'focus moves into the panel' }).toBe(true)

    // A modal <dialog> lets focus go to the browser's own UI, which shows as
    // no focused element: only the page behind counts as a leak.
    if (await tabsToControls(page)) {
      const stops = await panel(page).locator('button, a[href], input:not([type="radio"]), input[type="radio"]:checked').count()
      for (const key of ['Tab', 'Shift+Tab']) {
        for (let index = 0; index <= stops; index++) {
          await page.keyboard.press(key)
          const leaked = await page.evaluate(() => ![document.body, document.getElementById('playground-toolbar')].includes(document.activeElement))
          expect(leaked, `${key} stays in the panel`).toBe(false)
        }
      }
    }

    await panel(page).getByRole('button', { name: 'Close' }).focus()
    await page.keyboard.press('Escape')
    await expect(panel(page)).not.toHaveAttribute('open', '')
    await expect(summary(page)).toHaveAttribute('aria-expanded', 'false')
    await expect(summary(page)).toBeFocused()
  })

  test('the segmented controls have names and follow the arrow keys', async ({ page }) => {
    await load(page, DIALOG_PAGE)
    await page.keyboard.press('Alt+Shift+KeyP')
    await expect(panel(page)).toHaveAttribute('open', '')

    const groups = {
      'Color mode': ['Auto', 'Light', 'Dark'],
      Direction: ['LTR', 'RTL'],
      CSS: ['Source', 'Dist'],
      JavaScript: ['Source', 'Dist'],
      Primary: ['Default primary', 'Indigo', 'Teal', 'Gray']
    }
    for (const [group, radios] of Object.entries(groups)) {
      const fieldset = panel(page).getByRole('group', { name: new RegExp(`^${group}`) })
      for (const radio of radios) {
        await expect(fieldset.getByRole('radio', { name: radio, exact: true }), `${group} › ${radio}`).toHaveCount(1)
      }
    }

    // A radio group takes one tab stop, and the arrows pick the next choice.
    const colorMode = panel(page).getByRole('group', { name: /^Color mode/ })
    await colorMode.getByRole('radio', { name: 'Auto', exact: true }).focus()
    await page.keyboard.press('ArrowDown')
    await expect(colorMode.getByRole('radio', { name: 'Light', exact: true })).toBeChecked()
    await expect(colorMode.getByRole('radio', { name: 'Light', exact: true })).toBeFocused()
    expect((await prefs(page)).colorMode).toBe('light')
    await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'light')
  })

  test('each shortcut does what it says', async ({ page }) => {
    await load(page, DIALOG_PAGE)

    for (const colorMode of ['light', 'dark', 'auto']) {
      await page.keyboard.press('Alt+Shift+KeyT')
      expect((await prefs(page)).colorMode, 'Alt+Shift+T cycles the color mode').toBe(colorMode)
    }

    await page.keyboard.press('Alt+Shift+KeyD')
    await expect(page.locator('html'), 'Alt+Shift+D toggles the direction').toHaveAttribute('dir', 'rtl')
    await page.keyboard.press('Alt+Shift+KeyD')
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')

    await page.keyboard.press('Alt+Shift+KeyO')
    await expect(page.locator('#playground-tab-order'), 'Alt+Shift+O shows the tab order').toBeAttached()
    // The panel's button follows, closed or not.
    await expect(toolbar(page).locator('.tab-order')).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('Alt+Shift+KeyO')
    await expect(page.locator('#playground-tab-order')).not.toBeAttached()

    await page.keyboard.press('Alt+Shift+KeyP')
    await expect(panel(page), 'Alt+Shift+P opens the panel').toHaveAttribute('open', '')
    await page.keyboard.press('Alt+Shift+KeyP')
    await expect(panel(page), 'and closes it').not.toHaveAttribute('open', '')

    await page.keyboard.press('ControlOrMeta+KeyK')
    await expect(palette(page), 'Ctrl+K opens the page switcher').toHaveAttribute('open', '')
  })

  test('the page switcher follows the arrows, Enter and Escape', async ({ page }) => {
    await load(page, DIALOG_PAGE)
    const trigger = page.locator('button[data-bs-target="#exampleDialog"]')
    await trigger.focus()
    await page.keyboard.press('ControlOrMeta+KeyK')
    await expect(palette(page)).toHaveAttribute('open', '')
    await expect(paletteInput(page)).toBeFocused()

    const option = index => palette(page).locator(`#palette-option-${index}`)
    await expect(paletteInput(page)).toHaveAttribute('aria-activedescendant', 'palette-option-0')
    await expect(option(0)).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('ArrowDown')
    await expect(paletteInput(page)).toHaveAttribute('aria-activedescendant', 'palette-option-1')
    await expect(option(1)).toHaveAttribute('aria-selected', 'true')
    await expect(option(0)).toHaveAttribute('aria-selected', 'false')
    await page.keyboard.press('ArrowUp')
    await expect(option(0)).toHaveAttribute('aria-selected', 'true')

    // Escape closes it and gives focus back to what had it.
    await page.keyboard.press('Escape')
    await expect(palette(page)).not.toHaveAttribute('open', '')
    await expect(trigger).toBeFocused()

    // Enter opens the selected result.
    await page.keyboard.press('ControlOrMeta+KeyK')
    await page.keyboard.type('drawer')
    const href = await option(0).getAttribute('href')
    await page.keyboard.press('Enter')
    await page.waitForURL(url => `${url.pathname}${url.search}${url.hash}` === href)
  })

  test('no shortcut fires while typing in the page', async ({ page }) => {
    await load(page, FORM_PAGE)
    const before = await snapshot(page)

    for (const field of [page.locator('#sizesInputDefault'), page.locator('#exampleFormControlTextarea1')]) {
      await field.click()
      for (const shortcut of SHORTCUTS) {
        await page.keyboard.press(shortcut)
      }

      // `/` focuses the search field on the home page only, never in a field.
      await page.keyboard.type('a/b')
      await expect(field).toHaveValue(/a\/b$/)
      await expect(field).toBeFocused()
      expect(await snapshot(page), 'the shortcuts left the page as it was').toEqual(before)
    }

    // Out of the field, they work again.
    await page.evaluate(() => document.activeElement.blur())
    await page.keyboard.press('Alt+Shift+KeyD')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  test('the playground\'s own fields keep the shortcuts', async ({ page }) => {
    await load(page, DIALOG_PAGE)
    await page.keyboard.press('Alt+Shift+KeyP')
    const filter = panel(page).getByRole('searchbox', { name: 'Filter configs' })
    await filter.focus()
    await page.keyboard.press('Alt+Shift+KeyD')
    await expect(page.locator('html'), 'Alt+Shift+D from the config filter').toHaveAttribute('dir', 'rtl')
    await page.keyboard.press('Alt+Shift+KeyP')
    await expect(panel(page), 'Alt+Shift+P from the config filter').not.toHaveAttribute('open', '')

    await page.keyboard.press('ControlOrMeta+KeyK')
    await page.keyboard.type('menu')
    await page.keyboard.press('ControlOrMeta+KeyK')
    await expect(palette(page), 'Ctrl+K from the switcher keeps it open').toHaveAttribute('open', '')
    await expect(paletteInput(page)).toHaveValue('menu')
  })

  for (const layer of ['page switcher', 'panel']) {
    test(`Escape closes the ${layer} before the Bootstrap dialog under it`, async ({ page }) => {
      await load(page, DIALOG_PAGE)
      const trigger = page.locator('button[data-bs-target="#exampleDialog"]')
      const dialog = page.locator('#exampleDialog')
      await trigger.focus()
      // Bootstrap ignores keys while the dialog is still opening: wait for
      // `shown`, as keyboard.spec.js does.
      await dialog.evaluate(element => element.addEventListener('shown.bs.dialog', () => {
        element.dataset.shown = ''
      }, { once: true }))
      await page.keyboard.press('Enter')
      await expect(dialog).toHaveAttribute('data-shown', '')
      await expect(dialog).toHaveAttribute('open', '')
      const inside = dialog.getByRole('button', { name: 'Close' }).first()
      await inside.focus()

      const top = layer === 'panel' ? panel(page) : palette(page)
      await page.keyboard.press(layer === 'panel' ? 'Alt+Shift+KeyP' : 'ControlOrMeta+KeyK')
      await expect(top).toHaveAttribute('open', '')

      await page.keyboard.press('Escape')
      await expect(top, `the first Escape closes the ${layer}`).not.toHaveAttribute('open', '')
      await expect(dialog, 'and leaves the dialog open').toHaveAttribute('open', '')
      await expect(inside, 'with focus back in it').toBeFocused()

      await page.keyboard.press('Escape')
      await expect(dialog, 'the second Escape closes the dialog').not.toHaveAttribute('open', '')
      await expect(trigger).toBeFocused()
    })
  }
})
