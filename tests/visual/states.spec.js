// Captures interactive components in every state: the kitchen sink examples
// of the components that have states, and each table of pages/states.html.
// Most state bugs don't show at rest, and pseudo-classes can't be set from
// markup, so each state is applied to a whole example or table at once, in
// the page, and screenshotted. The screenshots of one example stack into one
// image, the rest state first, each under its state's name:
// <variant>/kitchen-sink/<page>/states/<example>.png and
// <variant>/pages/states/<table>.png, with the same VISUAL_THEMES,
// VISUAL_DIRS and VISUAL_CONFIGS matrix as visual.spec.js.
//
// - hover, focus and active force `:hover`, `:focus` + `:focus-visible` and
//   `:hover` + `:active` on every interactive element through the DevTools
//   protocol (CSS.forcePseudoState), and their ancestors match `:hover`,
//   `:focus-within` or `:active` as they would in the browser. Elements that
//   are `:disabled` are left alone: they can't be hovered, focused or pressed.
// - selected, disabled, invalid and checked change the markup the way
//   Bootstrap documents each state, on every element it applies to:
//   `.active` (with `aria-pressed` or `aria-current`), the `disabled`
//   attribute or `.disabled` (with `aria-disabled`), `.is-invalid` (with
//   `aria-invalid`), `checked`. Kitchen sink examples only: the tables of
//   pages/states.html already show them.
//
// A state that applies to no element of an example has no row. A state that
// changes nothing still gets its row: two screenshots of the same state can
// differ by a few anti-aliased pixels, which the comparison tolerates but a
// byte-for-byte check doesn't. VISUAL_STATES=hover,focus limits
// the states. Chromium only, since forcing a pseudo-class needs the DevTools
// protocol.
import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { root } from '../../scripts/lib/configs.mjs'
import { collectPages } from '../../scripts/lib/pages.mjs'
import { VARIANTS, openPage, snapshotPath } from './shared.js'

const PSEUDO_STATES = ['hover', 'focus', 'active']
const MARKUP_STATES = ['selected', 'disabled', 'invalid', 'checked']
const STATES = (process.env.VISUAL_STATES || [...PSEUDO_STATES, ...MARKUP_STATES].join(',')).split(',').map(value => value.trim()).filter(Boolean)

// Kitchen sink pages whose examples get states: the components of
// pages/states.html, and every form page.
const KITCHEN_SINK = new Set(['accordion', 'breadcrumb', 'button', 'button-group', 'card', 'close-button', 'list-group', 'menu', 'nav', 'navbar', 'pagination', 'tab'].map(name => `components-${name}`))

const STATES_URL = '/pages/states.html'
const TABLES = [...fs.readFileSync(path.join(root, STATES_URL), 'utf8').matchAll(/data-states="([^"]+)"/g)].map(([, name]) => name)

const targets = [
  ...collectPages('/')
    .find(({ dir }) => dir === 'kitchen-sink').pages
    .filter(({ url }) => {
      const name = path.basename(url, '.html')
      return KITCHEN_SINK.has(name) || name.startsWith('forms-')
    })
    .map(({ url, sections }) => ({
      url,
      folder: [...snapshotPath(url), 'states'],
      sections: sections.map(({ id }) => ({ name: id, selector: `.bd-kitchen-sink-section[aria-labelledby="${id}"]` })),
      states: STATES
    })),
  {
    url: STATES_URL,
    folder: snapshotPath(STATES_URL),
    sections: TABLES.map(name => ({ name, selector: `[data-states="${name}"]` })),
    states: STATES.filter(state => PSEUDO_STATES.includes(state))
  }
]

// Runs in the browser. Marks what a pseudo-class state forces on, inside the
// section `selector` (excluded): each interactive element and its ancestors,
// with `data-pg-force` listing their pseudo-classes. Returns the distinct
// lists, for querying them, or none when no element matches.
function markPseudoState([selector, state]) {
  const INTERACTIVE = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]:not([tabindex="-1"]), label.btn-check, .chip, .hover-lift'
  const own = { hover: ['hover'], focus: ['focus', 'focus-visible'], active: ['hover', 'active'] }[state]
  const inherited = { hover: ['hover'], focus: ['focus-within'], active: ['hover', 'active'] }[state]
  const section = document.querySelector(selector)
  const forced = new Map()
  const add = (element, classes) => forced.set(element, new Set([...forced.get(element) ?? [], ...classes]))

  for (const element of section.querySelectorAll(INTERACTIVE)) {
    if (element.matches(':disabled') || !element.checkVisibility()) {
      continue
    }

    add(element, own)
    for (let parent = element.parentElement; parent && parent !== section; parent = parent.parentElement) {
      add(parent, inherited)
    }
  }

  for (const [element, classes] of forced) {
    element.dataset.pgForce = [...classes].sort().join(' ')
  }

  return [...new Set([...forced.values()].map(classes => [...classes].sort().join(' ')))]
}

// Runs in the browser. Applies a markup state to every element of the section
// it changes, and keeps how to undo it. Returns how many elements changed.
function applyMarkupState([selector, state]) {
  const section = document.querySelector(selector)
  const all = query => [...section.querySelectorAll(query)].filter(element => element.checkVisibility())
  const undo = []
  let changed = 0

  const setProperty = (element, name, value) => {
    if (element[name] !== value) {
      const previous = element[name]
      element[name] = value
      undo.push(() => {
        element[name] = previous
      })
      return true
    }

    return false
  }

  const setAttribute = (element, name, value) => {
    const previous = element.getAttribute(name)
    if (previous !== value) {
      element.setAttribute(name, value)
      undo.push(() => previous === null ? element.removeAttribute(name) : element.setAttribute(name, previous))
    }
  }

  const toggleClass = (element, name, force) => {
    if (element.classList.contains(name) !== force) {
      element.classList.toggle(name, force)
      undo.push(() => element.classList.toggle(name, !force))
      return true
    }

    return false
  }

  const LINKS = 'a[href], [role="button"]:not(button, input), .nav-link:not(button), .page-link:not(button), .menu-item:not(button), .list-group-item-action:not(button), .chip:not(button)'
  const FIELDS = 'input:not([type="hidden"], [type="button"], [type="submit"], [type="reset"], [type="image"]), select, textarea'

  if (state === 'selected') {
    // `.active` is what Bootstrap's CSS reads; its JavaScript adds
    // aria-pressed to toggle buttons and the docs aria-current to links.
    // Disabled items can't be selected.
    const disabled = '.disabled, [aria-disabled="true"], :disabled, label.btn-check:has(:disabled)'
    for (const element of all(`${LINKS}, button:not(.btn-close, .chip-dismiss), label.btn-check`).filter(element => !element.matches(disabled))) {
      if (toggleClass(element, 'active', true)) {
        changed++
        if (element.matches('button')) {
          setAttribute(element, 'aria-pressed', 'true')
        } else if (element.matches('a')) {
          setAttribute(element, 'aria-current', 'true')
        }
      }
    }
  } else if (state === 'disabled') {
    for (const element of all('button, input:not([type="hidden"]), select, textarea')) {
      changed += setProperty(element, 'disabled', true)
    }

    for (const element of all(`${LINKS}, .chip-input`)) {
      if (toggleClass(element, 'disabled', true)) {
        changed++
        setAttribute(element, 'aria-disabled', 'true')
      }
    }
  } else if (state === 'invalid') {
    for (const element of all(`${FIELDS}, .otp`)) {
      if (toggleClass(element, 'is-invalid', true)) {
        changed++
        toggleClass(element, 'is-valid', false)
        if (element.matches(FIELDS)) {
          setAttribute(element, 'aria-invalid', 'true')
        }
      }
    }
  } else if (state === 'checked') {
    // In a radio group, the last radio ends up checked.
    for (const element of all('input[type="checkbox"], input[type="radio"]')) {
      changed += setProperty(element, 'checked', true)
    }
  }

  window.playgroundUndoState = () => {
    for (const step of undo.reverse()) {
      step()
    }
  }

  return changed
}

// Stacks the screenshots of an example on `sheet`, a blank page, each under a
// band with its state's name, and screenshots the stack. Through the page rather than a canvas, so the
// image is encoded like every other screenshot, a third smaller.
async function stackStates(sheet, rows) {
  const band = label => `<div style="height: 20px; padding-inline: 6px; font: 12px/20px monospace; color: #212529; background: #e9ecef">${label}</div>`
  await sheet.setContent(`<body style="margin: 0"><div id="sheet" style="width: max-content; min-width: 240px; background: #fff">${rows.map(({ label, image }) =>
    `${band(label)}<img src="data:image/png;base64,${image}" alt="" style="display: block">`).join('')}</div></body>`)
  await sheet.evaluate(() => Promise.all([...document.images].map(image => image.decode())))
  return sheet.locator('#sheet').screenshot({ scale: 'css' })
}

// Forces the pseudo-classes markPseudoState marked, through the DevTools
// protocol. Returns the nodes, to release them.
async function forcePseudoClasses(client, lists) {
  const { root: document } = await client.send('DOM.getDocument', { depth: 0 })
  const nodes = []
  for (const list of lists) {
    const { nodeIds } = await client.send('DOM.querySelectorAll', { nodeId: document.nodeId, selector: `[data-pg-force="${list}"]` })
    await Promise.all(nodeIds.map(nodeId => client.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: list.split(' ') })))
    nodes.push(...nodeIds)
  }

  return nodes
}

async function releasePseudoClasses(page, client, nodes) {
  await Promise.all(nodes.map(nodeId => client.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] })))

  await page.evaluate(() => {
    for (const element of document.querySelectorAll('[data-pg-force]')) {
      delete element.dataset.pgForce
    }
  })
}

for (const variant of VARIANTS) {
  test.describe(variant.name, () => {
    test.use({ colorScheme: variant.theme === 'dark' ? 'dark' : 'light' })
    test.skip(({ browserName }) => browserName !== 'chromium', 'Forcing pseudo-classes needs the DevTools protocol')

    for (const { url, folder, sections, states } of targets) {
      test(`${url} states`, async ({ page, context }) => {
        test.setTimeout(180_000)
        await openPage(page, url, variant)
        // No transitions or caret, so each screenshot shows the end state at
        // once, without Playwright's `animations` option restyling the page
        // for every screenshot. The mouse rests where it hovers nothing.
        await page.addStyleTag({ content: '*, ::before, ::after { transition: none !important; animation: none !important; caret-color: transparent !important; }' })
        await page.mouse.move(0, 0)
        await page.evaluate(() => document.activeElement?.blur())

        const sheet = await context.newPage()
        const client = await page.context().newCDPSession(page)
        await client.send('DOM.enable')
        await client.send('CSS.enable')

        for (const { name, selector } of sections) {
          const section = page.locator(selector)
          const shot = async () => (await section.screenshot({ scale: 'css' })).toString('base64')
          const rows = [{ label: 'rest', image: await shot() }]

          for (const state of states) {
            let image
            if (PSEUDO_STATES.includes(state)) {
              const lists = await page.evaluate(markPseudoState, [selector, state])
              if (!lists.length) {
                continue
              }

              const nodes = await forcePseudoClasses(client, lists)
              image = await shot()
              await releasePseudoClasses(page, client, nodes)
            } else {
              if (!await page.evaluate(applyMarkupState, [selector, state])) {
                await page.evaluate(() => window.playgroundUndoState())
                continue
              }

              image = await shot()
              await page.evaluate(() => window.playgroundUndoState())
            }

            rows.push({ label: state, image })
          }

          if (rows.length === 1) {
            continue
          }

          expect.soft(await stackStates(sheet, rows), `#${name}`).toMatchSnapshot([variant.name, ...folder, `${name}.png`])
        }
      })
    }
  })
}
