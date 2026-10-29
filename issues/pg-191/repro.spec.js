// Fixed when the responsive prefixes of data-bs-placement are the breakpoints of
// the compiled CSS. In the breakpoints-custom config `md` is renamed `tablet`
// (768px), `2xl` is removed and `3xl` is 1920px. Today floating-ui.ts
// hard-codes sm, md, lg, xl and 2xl at their default widths, so `tablet:` and
// `3xl:` are ignored and `md:` still applies from 768px.
import { test } from '../../tests/issues/fixtures.js'

const COMPONENTS = ['tooltip', 'popover', 'menu']
const CASES = ['tablet', 'md', '3xl']

// What "fixed" looks like, per viewport width: the placement each prefix gives.
const EXPECTED = {
  700: { tablet: 'base', md: 'base', '3xl': 'base' },
  1400: { tablet: 'right', md: 'base', '3xl': 'base' },
  1920: { tablet: 'right', md: 'base', '3xl': 'right' }
}

// The placement Bootstrap applied to the shown tooltip, popover or menu.
async function shownPlacement(page, component, name) {
  return page.evaluate(([component, name]) => {
    const trigger = document.querySelector(`[data-component="${component}"] [data-case="${name}"]`)
    const bs = window.bootstrap
    const Component = { tooltip: bs.Tooltip, popover: bs.Popover, menu: bs.Menu }[component]
    const instance = Component.getOrCreateInstance(trigger)
    instance.show()
    return new Promise(resolve => {
      // Placement is set once the floating position is computed.
      const start = Date.now()
      const read = () => {
        const element = component === 'menu' ? trigger.parentElement.querySelector('.menu') : instance.tip
        const placement = element?.getAttribute('data-bs-placement')
        if (placement || Date.now() - start > 3000) {
          instance.hide()
          resolve(placement ?? 'none')
        } else {
          setTimeout(read, 50)
        }
      }

      read()
    })
  }, [component, name])
}

test('the placement prefixes follow the compiled breakpoints', async ({ page, repro }) => {
  await page.setViewportSize({ width: 700, height: 900 })
  await repro.open()

  const failures = []
  const seen = []
  for (const [width, expected] of Object.entries(EXPECTED)) {
    // Crossing a breakpoint after the page loaded, like a resized window.
    await page.setViewportSize({ width: Number(width), height: 900 })
    for (const component of COMPONENTS) {
      for (const name of CASES) {
        const placement = await shownPlacement(page, component, name)
        const want = expected[name] === 'base' ? (component === 'menu' ? 'bottom' : 'top') : expected[name]
        seen.push(`${width}px ${component} ${name}: ${placement}`)
        if (placement !== want) {
          failures.push(`${width}px ${component} ${name}: ${placement}, expected ${want}`)
        }
      }
    }
  }

  repro.verdict(failures.length === 0, failures.length ? `${failures.length} of ${seen.length} wrong, for example ${failures.slice(0, 3).join('; ')}` : `all ${seen.length} placements follow the compiled breakpoints`)
})
