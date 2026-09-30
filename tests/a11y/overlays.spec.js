// axe skips hidden elements, so the page scan (a11y.spec.js) never sees what's
// inside a closed menu, combobox, datepicker, popover, tooltip, dialog or
// drawer. This scan opens every one of them, one at a time, and runs axe on
// the overlay alone, in light and dark, with the default config: on every
// page with such a trigger, each visible and enabled trigger is clicked (or
// focused or hovered, as its `data-bs-trigger` says), whatever overlay then
// appears is scanned, and the component hides it again. Triggers inside an open overlay, like a tooltip
// in a dialog, get the same treatment while it's open. A trigger that opens
// nothing is attached to the test as `opens-nothing`.
//
// Known violations are listed in known-issues.js with `state: 'open'`, and each
// page's go to reports/a11y/default/<theme>/open/<page>.json. It runs when
// A11Y_CONFIGS includes the default config, which `all` does.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { expect, test } from '@playwright/test'
import { root } from '../../scripts/lib/configs.mjs'
import { collectPages } from '../../scripts/lib/pages.mjs'
import { TAGS, THEMES, describe, describeEntry, expectedWith, goneMessage, knownOn, load, matches, report, toNodes, unexpectedMessage } from './shared.js'

const CONFIG = 'default'
const runs = process.env.A11Y_CONFIGS === 'all' || (process.env.A11Y_CONFIGS || CONFIG).split(',').map(value => value.trim()).includes(CONFIG)

// The components with an overlay, by their `data-bs-toggle`, and their class.
const COMPONENTS = {
  menu: 'Menu',
  combobox: 'Combobox',
  datepicker: 'Datepicker',
  dialog: 'Dialog',
  drawer: 'Drawer',
  popover: 'Popover',
  tooltip: 'Tooltip'
}

const TRIGGERS = Object.keys(COMPONENTS).map(kind => `[data-bs-toggle="${kind}"]`).join(', ')
// Inline datepickers are always open, so the page scan sees them.
const ENABLED_TRIGGERS = `:is(${TRIGGERS}):not(:disabled, .disabled, [data-bs-inline="true"], [data-playground-chrome] *)`
// What an open overlay looks like, whichever component opened it.
const OVERLAYS = '.menu.show, dialog[open], .tooltip, .popover, [data-vc="calendar"]'

const urls = collectPages('/')
  .filter(({ dir }) => dir !== 'issues')
  .flatMap(({ pages }) => pages.map(({ url }) => url))
  .filter(url => new RegExp(`data-bs-toggle="(${Object.keys(COMPONENTS).join('|')})"`).test(fs.readFileSync(path.join(root, url.endsWith('/') ? `${url}index.html` : url), 'utf8')))

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')

// A closed dialog can stay displayed for its exit transition, so an overlay is
// open when it still matches OVERLAYS and shows. Remembers the overlays open
// now, so the next ones can be told apart.
const snapshot = page => page.evaluate(selector => {
  window.a11yIsOpen = element => element.isConnected && element.matches(selector) && element.checkVisibility({ visibilityProperty: true, opacityProperty: true })
  window.a11yBaseline = new Set([...document.querySelectorAll(selector)].filter(window.a11yIsOpen))
}, OVERLAYS)

// The overlays that weren't open at the snapshot, once their transitions are
// over, so axe measures their final colors. Null when none opens within two
// seconds. Not the `shown` events: the datepicker's popup can open without
// them (#155).
const opened = async page => {
  const fresh = await page.waitForFunction(selector => {
    const fresh = [...document.querySelectorAll(selector)].filter(element => !window.a11yBaseline.has(element) && window.a11yIsOpen(element))
    return fresh.length ? fresh : null
  }, OVERLAYS, { timeout: 2000 }).catch(() => null)
  await fresh?.evaluate(list => Promise.all(document.getAnimations()
    .filter(animation => list.some(overlay => overlay.contains(animation.effect?.target)) && animation.effect.getComputedTiming().endTime !== Infinity)
    .map(animation => animation.finished)))
  return fresh
}

// Opens the overlay the way its `data-bs-trigger` says: a click, focus or
// hover. Tooltips default to `hover focus`, the others to a click.
async function open(page, trigger, kind) {
  const on = (await trigger.getAttribute('data-bs-trigger'))?.split(' ') ?? (kind === 'tooltip' ? ['hover', 'focus'] : ['click'])
  if (on.includes('click')) {
    await trigger.click()
    // Out of the way, so no element of the overlay is scanned hovered.
    await page.mouse.move(0, 0)
  } else if (on.includes('focus')) {
    await trigger.focus()
  } else if (on.includes('hover')) {
    await trigger.hover()
  }
}

// The trigger as a reader would name it: `menu "Dropdown button"`.
const label = async (trigger, kind) => `${kind} "${(await trigger.evaluate(element => (element.getAttribute('aria-label') ?? element.textContent ?? element.value ?? '').replace(/\s+/g, ' ').trim())).slice(0, 60)}"`

// Hides the overlay through its component, again until it's closed: a
// component ignores hide() while it's still showing.
async function close(page, trigger, name, kind, fresh) {
  await page.waitForFunction(({ trigger, list, component }) => {
    const target = ['Dialog', 'Drawer'].includes(component) ? document.querySelector(trigger.dataset.bsTarget || trigger.getAttribute('href')) : trigger
    if (target) {
      window.bootstrap[component].getInstance(target)?.hide()
    }

    return !list.some(window.a11yIsOpen)
  }, { trigger, list: fresh, component: COMPONENTS[kind] }, { polling: 100, timeout: 5000 }).catch(async () => {
    const left = await fresh.evaluate(list => list.filter(window.a11yIsOpen).map(element => element.outerHTML.slice(0, 120)))
    throw new Error(`${name} didn't close: ${left.join(', ')}`)
  })
}

// Opens each trigger, scans its overlay, visits the triggers inside it (once),
// then closes it. `found` collects one node per violating element.
async function visit(page, triggers, { found, silent }, depth = 0) {
  for (const trigger of triggers) {
    if (!await trigger.isVisible()) {
      continue
    }

    const kind = await trigger.getAttribute('data-bs-toggle')
    const name = await label(trigger, kind)
    await snapshot(page)
    await open(page, trigger, kind)
    const fresh = await opened(page)
    if (!fresh) {
      silent.push(name)
      continue
    }

    const violations = await page.evaluate(({ overlays, tags }) => window.axe.run({ include: overlays }, { runOnly: { type: 'tag', values: tags } }).then(({ violations }) => violations), { overlays: fresh, tags: TAGS })
    for (const node of toNodes(violations)) {
      const key = `${node.rule} ${node.selector}`
      if (!found.has(key)) {
        found.set(key, { ...node, trigger: name })
      }
    }

    if (depth === 0) {
      const inner = await page.evaluateHandle(({ overlays, selector }) => overlays.flatMap(overlay => [...overlay.querySelectorAll(selector)]), { overlays: fresh, selector: ENABLED_TRIGGERS })
      const handles = [...(await inner.getProperties()).values()].map(handle => handle.asElement()).filter(Boolean)
      await visit(page, handles, { found, silent }, depth + 1)
    }

    await close(page, trigger, name, kind, fresh)
  }
}

test.describe('open', () => {
  test.skip(!runs, `A11Y_CONFIGS leaves out the ${CONFIG} config`)

  for (const theme of THEMES) {
    test.describe(`${theme}-${CONFIG}`, () => {
      test.use({ colorScheme: theme, reducedMotion: 'reduce' })

      for (const url of urls) {
        test(url, async ({ page }, testInfo) => {
          const params = await load(page, url, theme, CONFIG)
          await page.waitForFunction(() => window.bootstrap)
          await page.addScriptTag({ content: axeSource })

          const found = new Map()
          const silent = []
          await visit(page, await page.$$(ENABLED_TRIGGERS), { found, silent })
          if (silent.length) {
            await testInfo.attach('opens-nothing', { body: silent.join('\n'), contentType: 'text/plain' })
          }

          const nodes = [...found.values()]
          const known = knownOn(url, theme, CONFIG, 'open')
          const entryOf = new Map(nodes.map(node => [node, known.find(entry => matches(entry, node))]))
          await report(testInfo, { config: CONFIG, theme, url, state: 'open' }, nodes.map(node => {
            const entry = entryOf.get(node)
            return { ...node, known: entry ? entry.issue ?? entry.reason : null }
          }))

          const unexpected = nodes.filter(node => !entryOf.get(node))
          const gone = known.filter(entry => expectedWith(entry, CONFIG) && !nodes.some(node => matches(entry, node)))

          expect(unexpected.map(node => `${describe(node)}, opened by ${node.trigger}: ${node.help}`), unexpectedMessage(`${url}?${params} with its overlays open`)).toEqual([])
          expect(gone.map(describeEntry), goneMessage).toEqual([])
        })
      }
    })
  }
})
