// Keyboard walkthroughs: for every Bootstrap JavaScript component whose docs
// describe keyboard behavior, tab into it on its kitchen sink page and press
// every documented key, in LTR and RTL. Each step checks where focus lands,
// the `aria-*` state and, once the component closes, that focus is back on
// its trigger.
//
// In RTL, the arrows along the inline axis flip: the key that points to the
// next item is ← (`forward` below), as the ARIA Authoring Practices ask. Up,
// down, Home, End, Enter, Space, Escape and Tab don't change.
//
// Like the smoke scenarios, each walkthrough runs with the working copy,
// every config and dist, in each engine, scoped by SMOKE_SCOPE: a config must
// never change behavior. Pages load with `?chrome=0&freeze`, so transitions
// are off.
//
// A walkthrough is a list of named steps that each set up what they need, so
// one failing step doesn't hide the others. A step that fails because of an
// open upstream bug is listed in known-issues.js with `walkthrough`, `step`,
// its tracking issue and, when it only happens in one direction, `dirs`. The
// walkthrough fails on any other failing step, and on a listed step that
// passes: the bug is fixed, so remove the entry (step 3 of "Upstream issue
// tracking" in CLAUDE.md).
import { expect as baseExpect, test } from '@playwright/test'
import { PAGES, VARIANTS, clearEvents, expectEvents, first, inScope, known, knownFor, leftOut, load, tabsToControls } from './shared.js'

// Transitions are off: what a key does shows at once, and a step that fails
// on a known bug shouldn't wait long for it.
const expect = baseExpect.configure({ timeout: 2000 })

const DIRS = ['ltr', 'rtl']

// The arrows along the inline axis, by direction.
const arrows = dir => (dir === 'rtl' ?
  { forward: 'ArrowLeft', back: 'ArrowRight' } :
  { forward: 'ArrowRight', back: 'ArrowLeft' })

// Moves focus to `target` with the Tab key, the way a keyboard user gets
// there: from a focusable sentinel placed right before it (or before
// `before`), so the step checks that `target` is the next tab stop. Where Tab
// skips buttons and links (`tabsToControls`), it focuses `target` directly.
async function tabTo(page, target, { before = target } = {}) {
  const textField = await target.evaluate(element => element.matches('input:not([type="button"], [type="submit"], [type="reset"], [type="checkbox"], [type="radio"]), select, textarea'))
  if (!textField && !await tabsToControls(page)) {
    await target.focus()
    return
  }

  await before.evaluate(element => {
    const sentinel = document.createElement('span')
    sentinel.tabIndex = -1
    sentinel.dataset.keyboardSentinel = ''
    sentinel.style.position = 'absolute'
    element.before(sentinel)
    sentinel.focus()
  })
  await page.keyboard.press('Tab')
  await page.evaluate(() => document.querySelector('[data-keyboard-sentinel]')?.remove())
  await expect(target).toBeFocused()
}

// Whether focus is inside `locator`'s element.
const holdsFocus = locator => locator.evaluate(element => element.contains(document.activeElement))

// Opening and closing dialogs and drawers (`kind`), which share their base.
// Keys pressed while one is still opening are ignored, so each step waits
// for `shown` or `hidden` before going on.
function dialogs(page, kind) {
  const Component = kind === 'drawer' ? 'Drawer' : 'Dialog'
  const tabStops = 'a[href], button:not(:disabled), input:not(:disabled), select, textarea, [tabindex="0"]'

  return {
    // Closes every open one, like those the docs render open.
    async close() {
      await page.evaluate(Component => {
        for (const element of document.querySelectorAll('dialog[open]')) {
          window.bootstrap[Component].getOrCreateInstance(element).hide()
        }
      }, Component)
      await expect(page.locator('dialog[open], dialog.hiding')).toHaveCount(0)
    },

    // Opens the trigger's target with `key`, and returns it with focus in.
    // `focusMovesIn` checks that the component moved it there; otherwise
    // focus is moved in, so the steps that don't test it test the rest.
    async open(trigger, key = 'Enter', { focusMovesIn = false } = {}) {
      const target = page.locator(await trigger.getAttribute('data-bs-target') ?? await trigger.getAttribute('href'))
      await trigger.focus()
      await clearEvents(page)
      await page.keyboard.press(key)
      await expectEvents(page, [`show.bs.${kind}`, `shown.bs.${kind}`])
      await expect(target).toHaveAttribute('open', '')
      if (focusMovesIn) {
        await expect.poll(() => holdsFocus(target), { message: 'focus moves in' }).toBe(true)
      } else if (!await holdsFocus(target)) {
        await target.locator(tabStops).first().focus()
      }

      return target
    },

    // Tab and Shift+Tab through every tab stop and one more: focus stays in
    // `target`, or can leave it when it isn't modal. A modal <dialog> lets
    // focus go to the browser's own UI, which shows as no focused element:
    // only the page behind counts as a leak.
    async expectTrapped(target, trapped = true) {
      if (!trapped && !await tabsToControls(page)) {
        return
      }

      const stops = await target.locator(tabStops).count()
      const outside = () => target.evaluate(element => document.activeElement !== document.body && !element.contains(document.activeElement))
      for (const key of ['Tab', 'Shift+Tab']) {
        await target.locator(tabStops).first().focus()
        let left = false
        for (let index = 0; index <= stops && !left; index++) {
          await page.keyboard.press(key)
          left = await outside()
        }

        expect(left, `${key} ${trapped ? 'stays in' : 'can leave'} the ${kind}`).toBe(!trapped)
      }
    },

    async expectClosed(target, trigger) {
      await expectEvents(page, [`hidden.bs.${kind}`])
      await expect(target).not.toHaveAttribute('open')
      await expect(trigger).toBeFocused()
    }
  }
}

// Marks the element a locator matches now, so a locator whose selector stops
// matching after an interaction (a chip input with one chip left) keeps
// pointing at it.
async function pin(page, locator, name) {
  await locator.evaluate((element, value) => {
    element.dataset.keyboard = value
  }, name)
  return page.locator(`[data-keyboard="${name}"]`)
}

const WALKTHROUGHS = {
  // Docs: Menu > Accessibility > Keyboard navigation.
  async menu({ page, step, keys }) {
    const toggle = first(page, 'button[data-bs-toggle="menu"]')
    const menu = toggle.locator('xpath=following-sibling::*[contains(concat(" ", @class, " "), " menu ")][1]')
    const items = menu.locator(':scope > .menu-item:not(.disabled, :disabled)')
    const close = async () => {
      if (await toggle.getAttribute('aria-expanded') === 'true') {
        await toggle.evaluate(element => window.bootstrap.Menu.getOrCreateInstance(element).hide())
      }

      await toggle.focus()
    }

    await step('Tab reaches the toggle', () => tabTo(page, toggle))

    await step('↓ opens the menu on the first item', async () => {
      await close()
      await page.keyboard.press('ArrowDown')
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      await expect(items.first()).toBeFocused()
    })

    await step('↑ opens the menu on the last item', async () => {
      await close()
      await page.keyboard.press('ArrowUp')
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      await expect(items.last()).toBeFocused()
    })

    await step('↓ and ↑ move between items', async () => {
      await close()
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await expect(items.nth(1)).toBeFocused()
      await page.keyboard.press('ArrowUp')
      await expect(items.first()).toBeFocused()
    })

    await step('End and Home jump to the last and first items', async () => {
      await close()
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('End')
      await expect(items.last()).toBeFocused()
      await page.keyboard.press('Home')
      await expect(items.first()).toBeFocused()
    })

    await step('Escape closes the menu and focuses the toggle', async () => {
      await close()
      await page.keyboard.press('ArrowDown')
      await expect(items.first()).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await expect(menu).toBeHidden()
      await expect(toggle).toBeFocused()
    })

    await step('Tab moves focus on and closes the menu', async () => {
      await close()
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('End')
      await page.keyboard.press('Tab')
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await expect(menu).toBeHidden()
      expect(await holdsFocus(menu)).toBe(false)
    })

    // A link toggle with role="button" is a button for assistive technology.
    const link = first(page, 'a[role="button"][data-bs-toggle="menu"]')
    await step('Space opens a menu from a link with role="button"', async () => {
      await close()
      await link.focus()
      await page.keyboard.press(' ')
      await expect(link).toHaveAttribute('aria-expanded', 'true')
      await link.evaluate(element => window.bootstrap.Menu.getOrCreateInstance(element).hide())
    })

    // Submenus: Enter, Space and the forward arrow open one on its first
    // item, the back arrow and Escape close it and focus its trigger.
    const parentToggle = first(page, 'button[data-bs-toggle="menu"]:has(+ .menu > .submenu)')
    const parent = parentToggle.locator('xpath=following-sibling::*[1]')
    const trigger = parent.locator(':scope > .submenu > .menu-item').first()
    const submenu = parent.locator(':scope > .submenu').first().locator(':scope > .menu')
    const openParent = async () => {
      if (await parentToggle.getAttribute('aria-expanded') === 'true') {
        await parentToggle.evaluate(element => window.bootstrap.Menu.getOrCreateInstance(element).hide())
      }

      await parentToggle.focus()
      await page.keyboard.press('ArrowDown')
      await expect(trigger).toBeFocused()
    }

    for (const [name, key] of [['The forward arrow', keys.forward], ['Enter', 'Enter'], ['Space', ' ']]) {
      await step(`${name} opens a submenu on its first item`, async () => {
        await openParent()
        await page.keyboard.press(key)
        await expect(trigger).toHaveAttribute('aria-expanded', 'true')
        await expect(submenu.locator('.menu-item').first()).toBeFocused()
      })
    }

    await step('↓ moves within the submenu', async () => {
      await openParent()
      await page.keyboard.press(keys.forward)
      await expect(submenu.locator('.menu-item').first()).toBeFocused()
      await page.keyboard.press('ArrowDown')
      await expect(submenu.locator('.menu-item').nth(1)).toBeFocused()
    })

    await step('The back arrow closes a submenu and focuses its trigger', async () => {
      await openParent()
      await page.keyboard.press(keys.forward)
      await expect(submenu.locator('.menu-item').first()).toBeFocused()
      await page.keyboard.press(keys.back)
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await expect(submenu).toBeHidden()
      await expect(trigger).toBeFocused()
    })

    await step('Escape closes only the submenu, then the menu', async () => {
      await openParent()
      await page.keyboard.press(keys.forward)
      await expect(submenu.locator('.menu-item').first()).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(submenu).toBeHidden()
      await expect(trigger).toBeFocused()
      await expect(parentToggle).toHaveAttribute('aria-expanded', 'true')
      await page.keyboard.press('Escape')
      await expect(parentToggle).toHaveAttribute('aria-expanded', 'false')
      await expect(parentToggle).toBeFocused()
    })
  },

  // Docs: Navs and tabs > Accessibility. Only the active tab is a tab stop;
  // the arrows select the previous or next tab, Home and End the first and
  // last, skipping disabled tabs.
  async tab({ page, step, keys }) {
    const tablist = first(page, '[role="tablist"]:has(> * > [data-bs-toggle="tab"]:disabled)')
    const tabs = tablist.locator('[data-bs-toggle="tab"]:not(.disabled, :disabled)')
    const select = async index => {
      await tabs.nth(index).evaluate(element => window.bootstrap.Tab.getOrCreateInstance(element).show())
      await expect(tabs.nth(index)).toHaveAttribute('aria-selected', 'true')
      await tabs.nth(index).focus()
    }

    const expectSelected = async index => {
      await expect(tabs.nth(index)).toBeFocused()
      await expect(tabs.nth(index)).toHaveAttribute('aria-selected', 'true')
      await expect(tabs.nth(index)).not.toHaveAttribute('tabindex', '-1')
      await expect(page.locator(await tabs.nth(index).getAttribute('data-bs-target'))).toBeVisible()
      for (const other of await tabs.all()) {
        if (await other.evaluate(element => element !== document.activeElement)) {
          await expect(other).toHaveAttribute('aria-selected', 'false')
          await expect(other).toHaveAttribute('tabindex', '-1')
        }
      }
    }

    await step('Tab reaches the active tab, and leaves the tab list', async () => {
      await select(1)
      await tabTo(page, tabs.nth(1), { before: tablist })
      await page.keyboard.press('Tab')
      expect(await holdsFocus(tablist)).toBe(false)
    })

    await step('The forward arrow selects the next tab', async () => {
      await select(0)
      await page.keyboard.press(keys.forward)
      await expectSelected(1)
    })

    await step('The back arrow selects the previous tab', async () => {
      await select(1)
      await page.keyboard.press(keys.back)
      await expectSelected(0)
    })

    await step('↓ and ↑ select the next and previous tabs', async () => {
      await select(0)
      await page.keyboard.press('ArrowDown')
      await expectSelected(1)
      await page.keyboard.press('ArrowUp')
      await expectSelected(0)
    })

    await step('The arrows wrap, skipping disabled tabs', async () => {
      const last = await tabs.count() - 1
      await select(last)
      await page.keyboard.press('ArrowDown')
      await expectSelected(0)
      await page.keyboard.press('ArrowUp')
      await expectSelected(last)
    })

    await step('Home and End select the first and last tabs', async () => {
      await select(1)
      await page.keyboard.press('End')
      await expectSelected(await tabs.count() - 1)
      await page.keyboard.press('Home')
      await expectSelected(0)
    })
  },

  // Docs: Dialog. Focus moves in and is trapped while it's modal, Escape
  // closes it unless `keyboard` is false, and focus returns to the trigger.
  async dialog({ page, step }) {
    const { open, close, expectTrapped, expectClosed } = dialogs(page, 'dialog')
    const trigger = first(page, '[data-bs-toggle="dialog"][data-bs-target]:not([data-bs-modal], [data-bs-backdrop])')
    const dialog = page.locator(await trigger.getAttribute('data-bs-target'))

    await step('Tab reaches the trigger', () => tabTo(page, trigger))

    await step('Enter opens the dialog and moves focus into it', async () => {
      await close()
      await open(trigger, 'Enter', { focusMovesIn: true })
    })

    await step('Space opens the dialog and moves focus into it', async () => {
      await close()
      await open(trigger, ' ', { focusMovesIn: true })
    })

    await step('Tab and Shift+Tab stay in the dialog', async () => {
      await close()
      await open(trigger)
      await expectTrapped(dialog)
    })

    await step('Escape closes the dialog and focuses the trigger', async () => {
      await close()
      await open(trigger)
      await page.keyboard.press('Escape')
      await expectClosed(dialog, trigger)
    })

    await step('Enter on a dismiss button closes the dialog and focuses the trigger', async () => {
      await close()
      await open(trigger)
      await dialog.locator('[data-bs-dismiss="dialog"]').last().focus()
      await page.keyboard.press('Enter')
      await expectClosed(dialog, trigger)
    })

    // Static backdrop: `keyboard` is still true, so Escape closes it.
    const staticTrigger = first(page, '[data-bs-toggle="dialog"][data-bs-backdrop="static"]')
    await step('Escape closes a dialog with a static backdrop', async () => {
      await close()
      const staticDialog = await open(staticTrigger)
      await page.keyboard.press('Escape')
      await expectClosed(staticDialog, staticTrigger)
    })

    // The first Escape closes a tooltip or popover inside the dialog, the
    // next one the dialog (Tooltip and Popover docs).
    const tipsDialog = page.locator('dialog:has([data-bs-toggle="tooltip"]):has([data-bs-toggle="popover"])').first()
    const tipsTrigger = first(page, `[data-bs-toggle="dialog"][data-bs-target="#${await tipsDialog.getAttribute('id')}"]`)
    for (const [kind, key] of [['tooltip', null], ['popover', 'Enter']]) {
      await step(`Escape closes a ${kind} inside the dialog first, then the dialog`, async () => {
        await close()
        await open(tipsTrigger)
        const tip = tipsDialog.locator(`[data-bs-toggle="${kind}"]`).first()
        await tip.focus()
        if (key) {
          await page.keyboard.press(key)
        }

        await expect(page.locator(`.${kind}`)).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(page.locator(`.${kind}`)).toHaveCount(0)
        await expect(tipsDialog).toHaveAttribute('open', '')
        await expect(tip).toBeFocused()
        await page.keyboard.press('Escape')
        await expectClosed(tipsDialog, tipsTrigger)
      })
    }

    // Non-modal: focus moves in but isn't trapped, Escape still closes it.
    const nonModalTrigger = first(page, '[data-bs-toggle="dialog"][data-bs-modal="false"]')
    await step('Enter opens a non-modal dialog and moves focus into it', async () => {
      await close()
      await open(nonModalTrigger, 'Enter', { focusMovesIn: true })
    })

    await step('Escape closes a non-modal dialog and focuses the trigger', async () => {
      await close()
      const nonModal = await open(nonModalTrigger)
      await page.keyboard.press('Escape')
      await expectClosed(nonModal, nonModalTrigger)
    })

    await step('Tab can leave a non-modal dialog', async () => {
      await close()
      const nonModal = await open(nonModalTrigger)
      await expectTrapped(nonModal, false)
    })
  },

  // Docs: Drawer. The dialog's behavior, on a drawer.
  async drawer({ page, step }) {
    const { open, close, expectTrapped, expectClosed } = dialogs(page, 'drawer')
    const trigger = first(page, 'button[data-bs-toggle="drawer"][data-bs-target]')
    const drawer = page.locator(await trigger.getAttribute('data-bs-target'))

    await step('Tab reaches the trigger', async () => {
      // The docs render some drawers open.
      await close()
      await tabTo(page, trigger)
    })

    await step('Enter opens the drawer and moves focus into it', async () => {
      await close()
      await open(trigger, 'Enter', { focusMovesIn: true })
    })

    await step('Tab and Shift+Tab stay in the drawer', async () => {
      await close()
      await open(trigger)
      await expectTrapped(drawer)
    })

    await step('Escape closes the drawer and focuses the trigger', async () => {
      await close()
      await open(trigger)
      await page.keyboard.press('Escape')
      await expectClosed(drawer, trigger)
    })

    // A link toggle with role="button" is a button for assistive technology.
    const link = first(page, 'a[role="button"][data-bs-toggle="drawer"]')
    await step('Space opens a drawer from a link with role="button"', async () => {
      await close()
      await open(link, ' ')
    })

    // Body scrolling without a backdrop: non-modal, focus moves in but isn't
    // trapped.
    const scrolling = page.locator('dialog.drawer[data-bs-scroll="true"][data-bs-backdrop="false"]').first()
    const scrollTrigger = first(page, `[data-bs-toggle="drawer"][data-bs-target="#${await scrolling.getAttribute('id')}"]`)
    await step('Enter opens a non-modal drawer and moves focus into it', async () => {
      await close()
      await open(scrollTrigger, 'Enter', { focusMovesIn: true })
    })

    await step('Escape closes a non-modal drawer and focuses the trigger', async () => {
      await close()
      await open(scrollTrigger)
      await page.keyboard.press('Escape')
      await expectClosed(scrolling, scrollTrigger)
    })

    await step('Tab can leave a non-modal drawer', async () => {
      await close()
      await open(scrollTrigger)
      await expectTrapped(scrolling, false)
    })
  },

  // Docs: Chips > Keyboard behavior. Mail.app-style: the arrows move between
  // chips and the input, Shift extends the selection.
  async chips({ page, step, keys }) {
    // Pinned: removing a chip would make the selector match the next one.
    const container = await pin(page, first(page, '[data-bs-chips]:has(> .chip ~ .chip)'), 'chips')
    const input = container.locator('input').first()
    const chips = container.locator('.chip')
    const selected = () => chips.evaluateAll(list => list.flatMap((chip, index) => (chip.classList.contains('active') ? [index] : [])))
    // Two chips, the input empty and focused, nothing selected.
    const reset = async () => {
      await container.evaluate(element => {
        const instance = window.bootstrap.Chips.getOrCreateInstance(element)
        instance.clear()
        instance.add('Alpha')
        instance.add('Bravo')
      })
      await input.fill('')
      await input.focus()
      await expect(chips).toHaveCount(2)
    }

    await step('Tab reaches the first chip', async () => {
      await reset()
      await tabTo(page, chips.first(), { before: container })
    })

    await step('Enter adds a chip and keeps focus in the input', async () => {
      await reset()
      await input.fill('Charlie')
      await page.keyboard.press('Enter')
      await expect(chips).toHaveCount(3)
      await expect(input).toHaveValue('')
      await expect(input).toBeFocused()
    })

    await step('The separator adds a chip', async () => {
      await reset()
      await page.keyboard.type('Delta,')
      await expect(chips).toHaveCount(3)
      await expect(input).toHaveValue('')
    })

    await step('Backspace in the empty input selects the last chip, then removes it', async () => {
      await reset()
      await page.keyboard.press('Backspace')
      await expect(chips.last()).toBeFocused()
      expect(await selected()).toEqual([1])
      await page.keyboard.press('Backspace')
      await expect(chips).toHaveCount(1)
      await expect(chips.first()).toBeFocused()
      expect(await selected()).toEqual([0])
    })

    await step('The back arrow at the start of the input focuses the last chip', async () => {
      await reset()
      await page.keyboard.press(keys.back)
      await expect(chips.last()).toBeFocused()
      expect(await selected()).toEqual([1])
    })

    await step('The arrows move between chips, and forward from the last one to the input', async () => {
      await reset()
      await chips.last().click()
      await page.keyboard.press(keys.back)
      await expect(chips.first()).toBeFocused()
      expect(await selected()).toEqual([0])
      await page.keyboard.press(keys.forward)
      await expect(chips.last()).toBeFocused()
      await page.keyboard.press(keys.forward)
      await expect(input).toBeFocused()
      expect(await selected()).toEqual([])
    })

    await step('Shift and the back arrow extend the selection', async () => {
      await reset()
      await chips.last().click()
      await page.keyboard.press(`Shift+${keys.back}`)
      expect(await selected()).toEqual([0, 1])
    })

    await step('Home focuses the first chip, End the input', async () => {
      await reset()
      await chips.last().click()
      await page.keyboard.press('Home')
      await expect(chips.first()).toBeFocused()
      await page.keyboard.press('End')
      await expect(input).toBeFocused()
    })

    await step('Ctrl+A or ⌘A on a chip selects every chip', async () => {
      await reset()
      await chips.first().click()
      await page.keyboard.press('ControlOrMeta+a')
      expect(await selected()).toEqual([0, 1])
    })

    await step('Escape on a chip clears the selection and focuses the input', async () => {
      await reset()
      await chips.first().click()
      await page.keyboard.press('Escape')
      await expect(input).toBeFocused()
      expect(await selected()).toEqual([])
    })

    await step('Escape in the input clears it and leaves it', async () => {
      await reset()
      await input.fill('Echo')
      await page.keyboard.press('Escape')
      await expect(input).toHaveValue('')
      await expect(input).not.toBeFocused()
    })

    // Mouse selection with modifiers (twbs/bootstrap#42956).
    await step('Shift+click selects a range, Ctrl+click or ⌘-click toggles a chip', async () => {
      await reset()
      await input.fill('Foxtrot')
      await page.keyboard.press('Enter')
      await chips.first().click()
      await chips.last().click({ modifiers: ['Shift'] })
      expect(await selected()).toEqual([0, 1, 2])
      await chips.nth(1).click({ modifiers: ['ControlOrMeta'] })
      expect(await selected()).toEqual([0, 2])
    })
  },

  // Docs: Combobox > Accessibility. The toggle opens the list, the arrows,
  // Home and End move through the options, Enter and Space pick one, Escape
  // and Tab close it.
  async combobox({ page, step }) {
    const toggle = first(page, '[data-bs-toggle="combobox"]:not([data-bs-search], [data-bs-multiple], :disabled)')
    const menu = toggle.locator('xpath=following-sibling::*[contains(concat(" ", @class, " "), " menu ")][1]')
    const options = menu.locator('.menu-item:not(:disabled)')
    const close = async () => {
      if (await toggle.getAttribute('aria-expanded') === 'true') {
        await toggle.evaluate(element => window.bootstrap.Combobox.getOrCreateInstance(element).hide())
      }

      await toggle.focus()
    }

    await step('Tab reaches the toggle', () => tabTo(page, toggle))

    await step('↓ opens the list on the first option', async () => {
      await close()
      await page.keyboard.press('ArrowDown')
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      await expect(options.first()).toBeFocused()
    })

    await step('↑ opens the list on the last option', async () => {
      await close()
      await page.keyboard.press('ArrowUp')
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      await expect(options.last()).toBeFocused()
    })

    await step('↓ and ↑ move between options', async () => {
      await close()
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await expect(options.nth(1)).toBeFocused()
      await page.keyboard.press('ArrowUp')
      await expect(options.first()).toBeFocused()
    })

    await step('End and Home jump to the last and first options', async () => {
      await close()
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('End')
      await expect(options.last()).toBeFocused()
      await page.keyboard.press('Home')
      await expect(options.first()).toBeFocused()
    })

    for (const [key, name] of [['Enter', 'Enter'], [' ', 'Space']]) {
      await step(`${name} on the toggle opens the list`, async () => {
        await close()
        await page.keyboard.press(key)
        await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      })

      await step(`${name} picks an option, closes the list and focuses the toggle`, async () => {
        await close()
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('ArrowDown')
        await expect(options.nth(1)).toBeFocused()
        await clearEvents(page)
        await page.keyboard.press(key)
        await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true')
        await expect(options.first()).not.toHaveAttribute('aria-selected', 'true')
        await expect(toggle).toHaveAttribute('aria-expanded', 'false')
        await expect(toggle).toBeFocused()
        await expect(toggle.locator('.combobox-value')).toHaveText(await options.nth(1).innerText())
        await expectEvents(page, ['change.bs.combobox'])
      })
    }

    await step('Escape on an option closes the list and focuses the toggle', async () => {
      await close()
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Escape')
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await expect(toggle).toBeFocused()
    })

    await step('Escape on the toggle closes the list', async () => {
      await close()
      await page.keyboard.press('Enter')
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      await expect(toggle).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    })

    await step('Tab closes the list', async () => {
      await close()
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Tab')
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      expect(await holdsFocus(menu)).toBe(false)
    })

    // With a search field, ↓ goes from it to the first match, and Escape
    // closes the list.
    const searchToggle = first(page, '[data-bs-toggle="combobox"][data-bs-search="true"]')
    const searchMenu = searchToggle.locator('xpath=following-sibling::*[contains(concat(" ", @class, " "), " menu ")][1]')
    const search = searchMenu.locator('input').first()
    await step('The search field gets focus, ↓ moves to the first option, Escape closes', async () => {
      await searchToggle.focus()
      await page.keyboard.press('Enter')
      await expect(search).toBeFocused()
      await page.keyboard.press('ArrowDown')
      await expect(searchMenu.locator('.menu-item:not(:disabled)').filter({ visible: true }).first()).toBeFocused()
      await search.focus()
      await page.keyboard.press('Escape')
      await expect(searchToggle).toHaveAttribute('aria-expanded', 'false')
      await expect(searchToggle).toBeFocused()
    })
  },

  // Docs: Datepicker. Focus opens the calendar, Escape closes it, and so does
  // focus leaving the input and the calendar.
  async datepicker({ page, step }) {
    const input = first(page, 'input[data-bs-toggle="datepicker"]')
    // Vanilla Calendar Pro appends the popups to <body> in the order of their
    // inputs, and hides one with `data-vc-calendar-hidden`. The page's inline
    // calendars don't have `data-vc-input`.
    const popup = page.locator('[data-vc="calendar"][data-vc-input]').first()
    const reset = async () => {
      await page.evaluate(() => document.activeElement?.blur())
      await input.evaluate(element => window.bootstrap.Datepicker.getOrCreateInstance(element).hide())
      await expect(popup).toHaveAttribute('data-vc-calendar-hidden')
    }

    await step('Tab reaches the input and opens the calendar', async () => {
      await tabTo(page, input)
      await expect(popup).toBeVisible()
      await expect(popup).not.toHaveAttribute('data-vc-calendar-hidden')
    })

    await step('Tab moves into the calendar, and focus leaving it closes it', async () => {
      await reset()
      await input.focus()
      await expect(popup).not.toHaveAttribute('data-vc-calendar-hidden')
      await page.keyboard.press('Tab')
      await expect.poll(() => holdsFocus(popup), { message: 'focus is in the calendar' }).toBe(true)
      // The popup comes last in <body>: Shift+Tab leaves it for the page.
      await page.keyboard.press('Shift+Tab')
      await expect.poll(() => holdsFocus(popup)).toBe(false)
      await expect(popup).toHaveAttribute('data-vc-calendar-hidden')
    })

    // Last: after Escape, the picker no longer goes through hide() and show()
    // (#155).
    await step('Escape closes the calendar and keeps focus on the input', async () => {
      await reset()
      await input.focus()
      await expect(popup).not.toHaveAttribute('data-vc-calendar-hidden')
      await page.keyboard.press('Escape')
      await expect(popup).toHaveAttribute('data-vc-calendar-hidden')
      await expect(input).toBeFocused()
    })
  },

  // Docs: OTP input. One text input: typing fills the slot at the caret, which
  // the active slot shows, Backspace clears the one before it, and the
  // arrows move the caret.
  async otp({ page, step, keys }) {
    const otp = first(page, '[data-bs-otp]')
    const input = otp.locator('input').first()
    const slots = otp.locator('.otp-slot')
    const active = () => slots.evaluateAll(list => list.findIndex(slot => slot.classList.contains('otp-slot-active')))
    const reset = async () => {
      await input.evaluate(element => {
        element.value = ''
        element.dispatchEvent(new Event('input', { bubbles: true }))
      })
      await input.focus()
      await input.evaluate(element => element.setSelectionRange(0, 0))
    }

    await step('Tab reaches the input on its first slot', async () => {
      await reset()
      await tabTo(page, input, { before: otp })
      await expect.poll(active).toBe(0)
    })

    await step('Typing fills the slots and moves the active slot', async () => {
      await reset()
      await page.keyboard.type('123')
      await expect(input).toHaveValue('123')
      await expect.poll(active).toBe(3)
      await expect(slots.nth(0)).toHaveClass(/\botp-slot-filled\b/)
    })

    await step('Backspace clears the previous slot', async () => {
      await reset()
      await page.keyboard.type('123')
      await page.keyboard.press('Backspace')
      await expect(input).toHaveValue('12')
      await expect.poll(active).toBe(2)
    })

    await step('The back and forward arrows move the active slot', async () => {
      await reset()
      await page.keyboard.type('123')
      await page.keyboard.press(keys.back)
      await expect.poll(active).toBe(2)
      await page.keyboard.press(keys.back)
      await expect.poll(active).toBe(1)
      await page.keyboard.press(keys.forward)
      await expect.poll(active).toBe(2)
    })
  },

  // Docs: Carousel. With focus in the carousel, the arrows show the previous
  // and next slides. With `ends: stop`, focus moves to the other control
  // when the focused one gets disabled at an end.
  async carousel({ page, step, keys }) {
    const carousel = first(page, '.carousel:has([data-bs-slide="next"]):not([data-bs-ends="stop"])')
    const next = carousel.locator('[data-bs-slide="next"]').first()
    const active = () => carousel.locator('.carousel-item').evaluateAll(list => list.findIndex(item => item.classList.contains('active')))
    const reset = async () => {
      await carousel.evaluate(element => window.bootstrap.Carousel.getOrCreateInstance(element).to(1))
      await expect.poll(active).toBe(1)
      await next.focus()
    }

    await step('The forward arrow shows the next slide', async () => {
      await reset()
      await page.keyboard.press(keys.forward)
      await expect.poll(active).toBe(2)
      await expect(next).toBeFocused()
    })

    await step('The back arrow shows the previous slide', async () => {
      await reset()
      await page.keyboard.press(keys.back)
      await expect.poll(active).toBe(0)
    })

    const stop = first(page, '.carousel[data-bs-ends="stop"]:not([style*="--bs-carousel-items"]):not(.carousel-auto)')
    await step('With ends: stop, focus moves to the other control at an end', async () => {
      const stopNext = stop.locator('[data-bs-slide="next"]').first()
      const stopPrev = stop.locator('[data-bs-slide="prev"]').first()
      const count = await stop.locator('.carousel-item').count()
      const stopActive = () => stop.locator('.carousel-item').evaluateAll(list => list.findIndex(item => item.classList.contains('active')))
      await stop.evaluate(element => window.bootstrap.Carousel.getOrCreateInstance(element).to(0))
      await expect.poll(stopActive).toBe(0)
      await stopNext.focus()
      for (let index = 1; index < count; index++) {
        await page.keyboard.press('Enter')
        await expect.poll(stopActive).toBe(index)
      }

      await expect(stopNext).toBeDisabled()
      await expect(stopPrev).toBeFocused()
    })
  },

  // Docs: Toasts > Accessibility. A toast doesn't take focus when it shows,
  // and its close button works from the keyboard.
  async toast({ page, step }) {
    const button = page.locator('#liveToastBtn')
    const toast = page.locator('#liveToast')

    await step('Showing a toast leaves focus where it was', async () => {
      await button.focus()
      await page.keyboard.press('Enter')
      await expect(toast).toBeVisible()
      await expect(button).toBeFocused()
    })

    await step('Enter on the close button hides the toast', async () => {
      if (!await toast.isVisible()) {
        await button.focus()
        await page.keyboard.press('Enter')
      }

      await toast.locator('[data-bs-dismiss="toast"]').focus()
      await page.keyboard.press('Enter')
      await expect(toast).toBeHidden()
    })
  },

  // Docs: Tooltip. Focus shows it, Escape hides it and keeps focus.
  async tooltip({ page, step }) {
    const trigger = first(page, 'button[data-bs-toggle="tooltip"]')
    const tooltip = page.locator('.tooltip')

    await step('Tab to the trigger shows the tooltip', async () => {
      await tabTo(page, trigger)
      await expect(tooltip).toBeVisible()
      await expect(trigger).toHaveAttribute('aria-describedby', /.+/)
    })

    await step('Escape hides the tooltip and keeps focus on the trigger', async () => {
      await trigger.focus()
      await expect(tooltip).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(tooltip).toHaveCount(0)
      await expect(trigger).toBeFocused()
    })
  },

  // Docs: Popover. Enter toggles it, Escape hides it and keeps focus.
  async popover({ page, step }) {
    const trigger = first(page, 'button[data-bs-toggle="popover"]:not([data-bs-trigger])')
    const popover = page.locator('.popover')

    await step('Enter on the trigger shows the popover, and hides it again', async () => {
      await tabTo(page, trigger)
      await page.keyboard.press('Enter')
      await expect(popover).toBeVisible()
      await page.keyboard.press('Enter')
      await expect(popover).toHaveCount(0)
    })

    await step('Escape hides the popover and keeps focus on the trigger', async () => {
      await trigger.focus()
      await page.keyboard.press('Enter')
      await expect(popover).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(popover).toHaveCount(0)
      await expect(trigger).toBeFocused()
    })
  },

  // Docs: Collapse. Enter and Space toggle it, on a button or on a link with
  // `role="button"`, and `aria-expanded` follows.
  async collapse({ page, step }) {
    for (const [selector, name] of [['button[data-bs-toggle="collapse"]', 'a button'], ['a[data-bs-toggle="collapse"][role="button"]', 'a link with role="button"']]) {
      const toggle = first(page, selector)
      for (const [key, keyName] of [['Enter', 'Enter'], [' ', 'Space']]) {
        await step(`${keyName} toggles a collapse from ${name}`, async () => {
          const target = page.locator(await toggle.getAttribute('data-bs-target') ?? await toggle.getAttribute('href'))
          const expanded = await toggle.getAttribute('aria-expanded') === 'true'
          await toggle.focus()
          await page.keyboard.press(key)
          await expect(toggle).toHaveAttribute('aria-expanded', String(!expanded))
          await (expanded ? expect(target).toBeHidden() : expect(target).toBeVisible())
          await expect(toggle).toBeFocused()
        })
      }
    }
  }
}

for (const { name: variant, params } of VARIANTS) {
  test.describe(`${variant} keyboard`, () => {
    for (const [name, walkthrough] of Object.entries(WALKTHROUGHS).filter(([name]) => inScope(variant, name))) {
      for (const dir of DIRS) {
        test(`${name} ${dir}`, async ({ page, browserName }) => {
          test.skip(leftOut(variant, name), `${variant} doesn't load the partial of ${name}`)
          const listed = knownFor(known.filter(entry => entry.walkthrough === name && (!entry.dirs || entry.dirs.includes(dir))), variant, browserName)
          const failures = new Map()
          const step = async (title, body) => {
            try {
              await test.step(title, body)
            } catch (error) {
              failures.set(title, error)
            }
          }

          await load(page, PAGES[name], `${params}&dir=${dir}`)
          await walkthrough({ page, step, keys: arrows(dir) })

          for (const entry of listed.filter(entry => failures.has(entry.step))) {
            test.info().annotations.push({ type: 'known upstream bug', description: `#${entry.issue}: ${entry.step}` })
          }

          const unexpected = [...failures].filter(([title]) => !listed.some(entry => entry.step === title))
          const fixed = listed.filter(entry => !failures.has(entry.step))
          if (unexpected.length > 0) {
            throw new Error(unexpected.map(([title, error]) => `${title}\n${error.message}`).join('\n\n'))
          }

          expect(fixed.map(entry => `#${entry.issue}: ${entry.step}`), 'Listed in known-issues.js, but passes now: remove the entry, the bug is fixed upstream').toEqual([])
        })
      }
    }
  })
}
