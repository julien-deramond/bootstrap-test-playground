// Fixed when Space on a link toggle with role="button" toggles it like a
// <button> toggle does, without scrolling the page. The collapse, the menu and
// the drawer each have a link toggle and a <button> toggle: the buttons must
// open on Space (otherwise the page is broken, not the bug present), and the
// links must too. A link only fires click on Enter, so Space scrolls instead.
import { expect, test } from '../../tests/issues/fixtures.js'

const components = [
  { name: 'collapse', link: '#collapseLink', button: '#collapseButton', plugin: 'Collapse', panel: '#collapseExample' },
  { name: 'menu', link: '#menuLink', button: '#menuButton', plugin: 'Menu' },
  { name: 'drawer', link: '#drawerLink', button: '#drawerButton', plugin: 'Drawer', dialog: '#drawerExample' }
]

test('Space toggles link toggles with role="button" without scrolling', async ({ page, repro }) => {
  await repro.open()
  // The page must be able to scroll, or Space has nothing to scroll.
  await page.addStyleTag({ content: 'body { min-height: 200vh }' })
  const block = page.locator('[data-playground-repro]').first()

  // Focuses a toggle, presses Space and reports whether it opened its target
  // and whether the page moved, then closes it again.
  const pressSpace = async (toggle, { plugin, dialog, panel }) => {
    await page.evaluate(() => window.scrollTo(0, 0))
    await toggle.focus()
    await expect(toggle).toBeFocused()
    const before = await page.evaluate(() => window.scrollY)
    await page.keyboard.press(' ')
    // Space scrolls smoothly: give it the time to move.
    await page.waitForTimeout(400)
    const scrolled = (await page.evaluate(() => window.scrollY)) !== before
    const opened = dialog ?
      await block.locator(dialog).evaluate(element => element.open) :
      panel ?
        await block.locator(panel).evaluate(element => element.classList.contains('show')) :
        (await toggle.getAttribute('aria-expanded')) === 'true'
    // A collapse's or a drawer's instance lives on its panel, a menu's on its toggle.
    await (dialog ?? panel ? block.locator(dialog ?? panel) : toggle).evaluate((element, name) => window.bootstrap[name].getOrCreateInstance(element).hide(), plugin)
    // Let a drawer finish closing: its modal keeps the page inert until then.
    if (dialog) {
      await expect(block.locator(dialog)).not.toHaveJSProperty('open', true)
    }

    return { opened, scrolled }
  }

  const results = []
  for (const component of components) {
    const control = await pressSpace(block.locator(component.button), component)
    expect(control.opened, `the <button> ${component.name} toggle opens on Space`).toBe(true)
    results.push({ name: component.name, ...await pressSpace(block.locator(component.link), component) })
  }

  const summary = results.map(({ name, opened, scrolled }) => `${name} ${opened ? 'opens' : 'stays closed'}, page ${scrolled ? 'scrolls' : 'stays put'}`).join('; ')
  repro.verdict(results.every(({ opened, scrolled }) => opened && !scrolled), `Space on the link toggles: ${summary}`)
})
