// Walks every page with the Tab key, the way a keyboard user reaches its
// controls: from the top of the document until focus leaves it, then back from
// the end with Shift+Tab, in light and dark, in LTR and RTL, with the default
// config. axe reads the DOM, so it can't see that Tab gets stuck in a widget
// (WCAG 2.1.2), stops on something invisible or covered (2.4.3, 2.4.11), never
// reaches a control, or lands on one that shows no focus indicator (2.4.7).
//
// The walk starts from a `tabindex="-1"` sentinel prepended to <body> (and
// appended for Shift+Tab), so page scripts that focused something on load
// don't move the starting point. Chromium stops on each field of a native
// date or time input, so consecutive presses on the same element count as one
// stop, and the trap limit counts distinct stops: the page's predicted stops
// plus 20, with a cap on presses. Focus coming back to an earlier stop is a
// trap too, and so is an element that keeps focus through 40 presses.
//
// `tabOrder()` from src/js/tab-order.js, which draws the toolbar's "Show tab
// order" overlay, predicts the stops the HTML spec gives. A predicted stop Tab
// never reaches is a `skipped-stop`; a stop Tab visits that it didn't predict
// is an extra, listed in the attached walk and never a failure, since Chromium
// also stops on scroll containers without a focusable child and on the
// controls of a popup that focus opened. A visited stop that is zero-sized,
// hidden, inert, outside the viewport once focused or covered at its center is
// a `hidden-stop`, judged by rendering: a <dialog> without `open` can render
// its content inline, as the responsive drawers do.
//
// Focus visibility stays at WCAG 2.4.7, something visibly changes: the ring's
// contrast is focus.spec.js's job, on pages/focus.html. Each stop's outline,
// box-shadow, border, background and color, and those of its three nearest
// ancestors (so `:focus-within` wrappers count) and their ::before and
// ::after, are compared focused against unfocused. A stop where nothing
// changes gets a second look once the walk is over: a screenshot of a padded
// clip, focused against unfocused, since some controls draw the ring on a
// sibling, like the OTP input's active slot. No pixel change either is a
// `focus-not-visible`.
//
// Shift+Tab from the end must visit the same predicted stops in reverse, or
// the page gets a `reverse-order`; the extras don't count, since the controls
// of a popup that focus opens are on the way forward only, by design. Two
// consecutive stops where focus goes back up the
// page by more than a row and toward the inline start (left in LTR, right in
// RTL) are a `focus-order` warning: a column break reads fine, so they go in
// the report and never fail the test.
//
// Runs with the default config, when A11Y_CONFIGS includes it (`all` does),
// in Chromium only: at the end of the document, Firefox keeps focus on the
// last element instead of leaving it. On pull requests, A11Y_SCOPE limits the
// walk to the changed pages; a shared change walks everything. Known findings
// are the entries of known-issues.js with one of the rules above, `target`
// matched against the stop's selector and `dirs` to limit one to `ltr` or
// `rtl`. Each page's findings and warnings go to
// reports/a11y/default/<theme>/tab[-rtl]/<page>.json, and the stops of both
// walks are attached to the test as walk.json.
import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { root } from '../../scripts/lib/configs.mjs'
import { DIRS, PAGES, TAB_RULES, THEMES, describe, describeEntry, expectedWith, goneMessage, knownOn, load, matches, report, unexpectedMessage } from './shared.js'

const CONFIG = 'default'
const runs = process.env.A11Y_CONFIGS === 'all' || (process.env.A11Y_CONFIGS || CONFIG).split(',').map(value => value.trim()).includes(CONFIG)

const scope = process.env.A11Y_SCOPE ? JSON.parse(process.env.A11Y_SCOPE) : { full: true }
const urls = PAGES.filter(url => scope.full || scope.urls.includes(url))

// How many distinct stops past the predicted ones before a walk is a trap,
// how many presses per allowed stop, and how many presses on one element
// before it's a trap: a datetime-local input takes up to six.
const EXTRA_STOPS = 20
const PRESSES_PER_STOP = 8
const PRESSES_ON_ONE_STOP = 40

// Room around a stop for its ring in the pixel check, like focus.js.
const PADDING = 8
// A pixel changed when one of its channels moved at least this much (0-255).
const PIXEL_STEP = 3
// Stops with fewer changed pixels show nothing.
const MIN_PIXELS = 4

// The computed properties a focus indicator changes, read as what shows: an
// outline or a border that isn't drawn (`none`, or 0 wide) is `none` whatever
// its color or offset, since `.menu-item.active` moves `outline-offset` while
// keeping `outline: 0`.
const INDICATOR_PROPERTIES = ['box-shadow', 'background-color', 'background-image', 'color', 'opacity', 'filter']

// The playground's own UI, when a page mounts it anyway: focus entering it
// ends the walk like leaving the document does.
const PLAYGROUND_HOSTS = ['playground-toolbar', 'playground-palette', 'playground-tab-order']

const HELP = {
  'keyboard-trap': 'Focus must be able to leave every component with the keyboard (WCAG 2.1.2)',
  'hidden-stop': 'Every Tab stop must be visible and not covered once focused (WCAG 2.4.3, 2.4.11)',
  'skipped-stop': 'Every focusable control must be reachable with the Tab key (WCAG 2.1.1)',
  'focus-not-visible': 'A focused control must show a visible focus indicator (WCAG 2.4.7)',
  'reverse-order': 'Shift+Tab must visit the same stops as Tab, in reverse (WCAG 2.4.3)',
  'focus-order': 'Focus went back up the page and toward the inline start: check that the order follows the visual order (WCAG 2.4.3)'
}

// tabOrder() runs in the page: its module, with the function put on window.
const tabOrderSource = `${fs.readFileSync(path.join(root, 'src/js/tab-order.js'), 'utf8')}\nwindow.a11yTabOrder = tabOrder\n`

// Runs in the browser, once per page. Installs `window.a11yWalk`: the
// predicted stops with their unfocused styles, the sentinels, and the methods
// the walk calls between key presses.
function install({ properties, extraStops, pressesOnOne, hosts }) {
  // Nothing focused while the unfocused styles are read: pages/color-modes.html
  // focuses a control on load.
  document.activeElement?.blur()
  const predicted = window.a11yTabOrder()

  // A selector a person can read and a known-issues.js `target` can match:
  // from the nearest ancestor with a unique id, or as deep as it takes to be
  // unique, tag and classes with :nth-child where siblings look alike.
  const selectorOf = element => {
    if (!(element instanceof Element)) {
      return String(element)
    }

    const segment = node => {
      const own = `${node.localName}${[...node.classList].map(name => `.${CSS.escape(name)}`).join('')}`
      const alike = node.parentElement ? [...node.parentElement.children].filter(sibling => sibling.localName === node.localName && sibling.className === node.className) : []
      return alike.length > 1 ? `${own}:nth-child(${[...node.parentElement.children].indexOf(node) + 1})` : own
    }

    const parts = []
    for (let node = element; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
      if (node.id && document.querySelectorAll(`#${CSS.escape(node.id)}`).length === 1) {
        parts.unshift(`#${CSS.escape(node.id)}`)
        break
      }

      parts.unshift(segment(node))
      if (document.querySelectorAll(parts.join(' > ')).length === 1) {
        break
      }
    }

    return parts.join(' > ')
  }

  // The indicator properties of an element and its three nearest ancestors,
  // with their ::before and ::after, as one string to compare.
  const drawn = (style, prefix) => {
    const kind = style.getPropertyValue(`${prefix}-style`)
    return kind === 'none' || Number.parseFloat(style.getPropertyValue(`${prefix}-width`)) === 0 ? 'none' : `${kind} ${style.getPropertyValue(`${prefix}-width`)} ${style.getPropertyValue(`${prefix}-color`)}`
  }

  const indicatorOf = style => [
    ...properties.map(property => style.getPropertyValue(property)),
    drawn(style, 'outline') === 'none' ? 'none' : `${drawn(style, 'outline')} ${style.getPropertyValue('outline-offset')}`,
    ...['top', 'right', 'bottom', 'left'].map(side => drawn(style, `border-${side}`)),
    style.getPropertyValue('text-decoration-line') === 'none' ? 'none' : `${style.getPropertyValue('text-decoration-line')} ${style.getPropertyValue('text-decoration-color')}`
  ].join(';')

  const stylesOf = element => {
    const nodes = []
    for (let node = element; node && node !== document.body && node !== document.documentElement && nodes.length < 4; node = node.parentElement) {
      nodes.push(node)
    }

    return nodes.flatMap(node => [null, '::before', '::after'].map(pseudo => indicatorOf(getComputedStyle(node, pseudo)))).join('|')
  }

  const rendered = element => element.isConnected && element.checkVisibility({ visibilityProperty: true, opacityProperty: true })

  const text = element => (element.getAttribute('aria-label') ?? element.value ?? element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60)

  const box = element => {
    const { x, y, width, height } = element.getBoundingClientRect()
    return { x: Math.round(x + window.scrollX), y: Math.round(y + window.scrollY), width: Math.round(width), height: Math.round(height) }
  }

  // What makes a visited stop hidden: no size, not rendered, inert, outside
  // the viewport once the browser scrolled it into view, or covered at the
  // center of its visible part. A stop that ignores the pointer, like the
  // visually hidden input of a button check, can't be hit, so it isn't tested
  // for cover; one hit through its own label or an ancestor isn't covered.
  const problemsOf = element => {
    const problems = []
    const rect = element.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      problems.push('zero size')
    }

    if (!element.checkVisibility({ visibilityProperty: true, opacityProperty: true })) {
      problems.push('not rendered or hidden')
    }

    if (element.closest('[inert]')) {
      problems.push('inert')
    }

    const width = document.documentElement.clientWidth
    const height = document.documentElement.clientHeight
    if (rect.bottom <= 0 || rect.top >= height || rect.right <= 0 || rect.left >= width) {
      problems.push('outside the viewport')
    } else if (rect.width > 0 && rect.height > 0 && getComputedStyle(element).pointerEvents !== 'none') {
      const x = (Math.max(rect.left, 0) + Math.min(rect.right, width)) / 2
      const y = (Math.max(rect.top, 0) + Math.min(rect.bottom, height)) / 2
      const hit = document.elementFromPoint(x, y)
      const labels = [...(element.labels ?? [])]
      const related = hit && (hit === element || element.contains(hit) || hit.contains(element) || labels.some(label => label === hit || label.contains(hit) || hit.contains(label)))
      if (hit && !related) {
        problems.push(`covered by ${selectorOf(hit)}`)
      }
    }

    return problems
  }

  const scroller = element => {
    const { overflowX, overflowY } = getComputedStyle(element)
    return ['auto', 'scroll'].includes(overflowX) || ['auto', 'scroll'].includes(overflowY)
  }

  const sentinel = () => {
    const span = document.createElement('span')
    span.tabIndex = -1
    span.dataset.a11ySentinel = ''
    span.style.position = 'absolute'
    return span
  }

  const start = sentinel()
  const end = sentinel()
  document.body.prepend(start)
  document.body.append(end)

  const before = new Map(predicted.map(element => [element, stylesOf(element)]))
  const limit = predicted.length + extraStops
  const walks = {}
  let current

  // A stop whose unfocused styles weren't snapshotted (it wasn't predicted)
  // is compared once focus has moved on, while it's still rendered.
  const settle = stop => {
    if (stop.indicator === 'pending') {
      stop.indicator = rendered(stop.element) ? (stylesOf(stop.element) === stop.focused ? 'none' : 'style') : 'unchecked'
    }
  }

  const view = ({ element, focused, ...stop }) => stop

  window.a11yWalk = {
    predicted: predicted.map(element => ({ selector: selectorOf(element), text: text(element) })),
    limit,

    // Focuses the sentinel the walk starts from, and resets its state.
    start(key) {
      document.activeElement?.blur()
      current = { key, stops: [], presses: 0 }
      walks[key] = current
      ;(key === 'Tab' ? start : end).focus({ preventScroll: true })
      return document.activeElement === (key === 'Tab' ? start : end)
    },

    // After a key press: records where focus is. `done` when it left the
    // document, `same` when it stayed on the same element, `trap` when it
    // came back or the limit is passed. Starts with a macrotask, so what the
    // press scheduled has run: the datepicker's popup shows from a timer, and
    // the next Tab enters it only once it has.
    async step() {
      await new Promise(resolve => setTimeout(resolve, 0))
      current.presses++
      const element = document.activeElement
      const last = current.stops.at(-1)
      if (last && last.element !== element) {
        settle(last)
      }

      if (!element || element === document.body || element === document.documentElement || 'a11ySentinel' in element.dataset || hosts.some(id => element.closest(`#${id}`))) {
        return { done: true }
      }

      if (last && last.element === element) {
        last.presses++
        return last.presses > pressesOnOne ? { trap: `${last.presses} presses on ${last.selector} without leaving it` } : { same: true }
      }

      const seen = current.stops.findIndex(stop => stop.element === element)
      if (seen !== -1) {
        return { trap: `focus came back to stop ${seen + 1}, ${current.stops[seen].selector}, after ${current.stops.length} distinct stops` }
      }

      const focused = stylesOf(element)
      const snapshot = before.get(element)
      const stop = {
        element,
        focused,
        index: current.stops.length + 1,
        selector: selectorOf(element),
        text: text(element),
        box: box(element),
        predicted: predicted.indexOf(element) + 1 || null,
        scroller: scroller(element),
        focusVisible: element.matches(':focus-visible'),
        problems: problemsOf(element),
        indicator: snapshot === undefined ? 'pending' : (snapshot === focused ? 'none' : 'style'),
        presses: 1
      }
      current.stops.push(stop)
      if (current.stops.length > limit) {
        return { trap: `${current.stops.length} distinct stops, more than the ${predicted.length} the page has plus ${extraStops}` }
      }

      return { stop: view(stop) }
    },

    // The walk's stops, for the test.
    stops(key) {
      const stops = walks[key].stops
      if (stops.length > 0) {
        settle(stops.at(-1))
      }

      return { presses: walks[key].presses, stops: stops.map(view) }
    },

    // For the pixel check of a stop: scrolls it into view, blurs, and returns
    // the padded clip around it in viewport coordinates, or null when it's no
    // longer rendered.
    clip(key, index, padding) {
      const { element } = walks[key].stops[index - 1]
      document.activeElement?.blur()
      if (!rendered(element)) {
        return null
      }

      element.scrollIntoView({ block: 'center', inline: 'nearest' })
      const rect = element.getBoundingClientRect()
      const width = document.documentElement.clientWidth
      const height = document.documentElement.clientHeight
      const x = Math.max(0, Math.floor(rect.left - padding))
      const y = Math.max(0, Math.floor(rect.top - padding))
      const clip = { x, y, width: Math.min(width, Math.ceil(rect.right + padding)) - x, height: Math.min(height, Math.ceil(rect.bottom + padding)) - y }
      return clip.width > 0 && clip.height > 0 ? clip : null
    },

    // Focuses a stop for its pixel check and says whether it took focus.
    focus(key, index) {
      const { element } = walks[key].stops[index - 1]
      element.focus({ focusVisible: true, preventScroll: true })
      return document.activeElement === element
    }
  }

  return { predicted: predicted.length, limit }
}

// Runs in the browser. Counts the pixels that differ between two screenshots
// of the same clip, as base64 PNGs.
async function countChanges({ before, after, step }) {
  const pixels = async source => {
    const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${source}`)).blob())
    const context = new OffscreenCanvas(image.width, image.height).getContext('2d', { willReadFrequently: true })
    context.drawImage(image, 0, 0)
    return context.getImageData(0, 0, image.width, image.height).data
  }

  const [a, b] = await Promise.all([pixels(before), pixels(after)])
  let changed = 0
  for (let i = 0; i < Math.min(a.length, b.length); i += 4) {
    if (Math.abs(a[i] - b[i]) >= step || Math.abs(a[i + 1] - b[i + 1]) >= step || Math.abs(a[i + 2] - b[i + 2]) >= step) {
      changed++
    }
  }

  return changed
}

// Presses `key` from the sentinel until focus leaves the document, a trap
// shows, or the presses run out. Returns the stops and what ended the walk.
async function walk(page, key, limit) {
  const started = await page.evaluate(key => window.a11yWalk.start(key), key)
  if (!started) {
    throw new Error(`The ${key} walk couldn't focus its sentinel`)
  }

  const cap = limit * PRESSES_PER_STOP
  let trap = null
  for (let presses = 0; presses < cap; presses++) {
    await page.keyboard.press(key)
    const result = await page.evaluate(() => window.a11yWalk.step())
    if (result.done) {
      break
    }

    if (result.trap) {
      trap = result.trap
      break
    }

    if (presses === cap - 1) {
      trap = `${cap} presses without leaving the document`
    }
  }

  const { presses, stops } = await page.evaluate(key => window.a11yWalk.stops(key), key)
  return { key, presses, stops, trap }
}

// Screenshots each stop unfocused, then focused, and counts the pixels that
// change. Returns the counts by stop index, null when the stop couldn't be
// shot.
async function pixelCheck(page, key, indexes) {
  const counts = new Map()
  for (const index of indexes) {
    const clip = await page.evaluate(([key, index, padding]) => window.a11yWalk.clip(key, index, padding), [key, index, PADDING])
    if (!clip) {
      counts.set(index, null)
      continue
    }

    const before = await page.screenshot({ clip, scale: 'css', timeout: 10_000 })
    const focused = await page.evaluate(([key, index]) => window.a11yWalk.focus(key, index), [key, index])
    if (!focused) {
      counts.set(index, null)
      continue
    }

    const after = await page.screenshot({ clip, scale: 'css', timeout: 10_000 })
    counts.set(index, await page.evaluate(countChanges, { before: before.toString('base64'), after: after.toString('base64'), step: PIXEL_STEP }))
  }

  return counts
}

// Consecutive forward stops where focus goes back up the page by more than a
// row and toward the inline start, or straight up.
function orderWarnings(stops, dir) {
  const warnings = []
  for (let i = 1; i < stops.length; i++) {
    const from = stops[i - 1].box
    const to = stops[i].box
    const up = from.y - to.y
    const inlineStart = dir === 'rtl' ? (to.x + to.width) - (from.x + from.width) : from.x - to.x
    if (up > Math.max(from.height, 24) && inlineStart >= 0) {
      warnings.push({
        rule: 'focus-order',
        warning: true,
        selector: stops[i].selector,
        help: HELP['focus-order'],
        summary: `stop ${stops[i].index} is ${up}px above stop ${stops[i - 1].index} (${stops[i - 1].selector})${inlineStart > 0 ? ` and ${inlineStart}px toward the inline start` : ''}`,
        known: null
      })
    }
  }

  return warnings
}

const node = (rule, selector, summary) => ({ rule, selector, help: HELP[rule], summary })

// Loads the page, walks it both ways, checks the pixels of the stops whose
// styles don't change, and returns the findings, the warnings and both walks.
async function check(page, url, theme, dir) {
  const params = await load(page, url, theme, CONFIG, { dir })
  await page.waitForFunction(() => window.bootstrap, null, { timeout: 30_000 })
  await page.addScriptTag({ type: 'module', content: tabOrderSource })
  await page.waitForFunction(() => window.a11yTabOrder, null, { timeout: 30_000 })
  const { limit } = await page.evaluate(install, { properties: INDICATOR_PROPERTIES, extraStops: EXTRA_STOPS, pressesOnOne: PRESSES_ON_ONE_STOP, hosts: PLAYGROUND_HOSTS })
  const predicted = await page.evaluate(() => window.a11yWalk.predicted)

  const forward = await walk(page, 'Tab', limit)
  const backward = await walk(page, 'Shift+Tab', limit)

  // The second look at focus visibility: stops where no style changed, once
  // each. A backward stop Tab already visited takes the forward result.
  const checked = new Map()
  for (const current of [forward, backward]) {
    const pending = current.stops.filter(stop => stop.indicator === 'none' && !checked.has(stop.selector))
    const counts = await pixelCheck(page, current.key, pending.map(stop => stop.index))
    for (const stop of pending) {
      const count = counts.get(stop.index)
      stop.pixels = count
      stop.indicator = count === null ? 'unchecked' : count >= MIN_PIXELS ? 'pixels' : 'none'
      checked.set(stop.selector, stop)
    }

    for (const stop of current.stops.filter(stop => stop.indicator === 'none' && checked.get(stop.selector) !== stop)) {
      const { pixels, indicator } = checked.get(stop.selector)
      Object.assign(stop, { pixels, indicator })
    }
  }

  const nodes = []
  const seen = new Set()
  const add = finding => {
    const key = `${finding.rule} ${finding.selector}`
    if (!seen.has(key)) {
      seen.add(key)
      nodes.push(finding)
    }
  }

  for (const current of [forward, backward]) {
    const way = current.key === 'Tab' ? 'Tab' : 'Shift+Tab'
    if (current.trap) {
      add(node('keyboard-trap', current.stops.at(-1)?.selector ?? 'body', `${way}: ${current.trap}`))
    }

    for (const stop of current.stops) {
      if (stop.problems.length > 0) {
        add(node('hidden-stop', stop.selector, `${way} stop ${stop.index}: ${stop.problems.join(', ')}`))
      }

      if (stop.indicator === 'none') {
        add(node('focus-not-visible', stop.selector, `${way} stop ${stop.index}: nothing changes on it, its three nearest ancestors or their pixels when focused${stop.focusVisible ? '' : ', and it doesn\'t match :focus-visible'}`))
      }
    }
  }

  if (!forward.trap) {
    const reached = new Set(forward.stops.map(stop => stop.predicted))
    for (const [index, stop] of predicted.entries()) {
      if (!reached.has(index + 1)) {
        add(node('skipped-stop', stop.selector, `predicted stop ${index + 1} of ${predicted.length}${stop.text ? ` ("${stop.text}")` : ''}, never reached by Tab`))
      }
    }
  }

  // The predicted stops only: the controls of a popup that focus opens are
  // on the way forward and not back, by design.
  if (!forward.trap && !backward.trap) {
    const ahead = forward.stops.filter(stop => stop.predicted)
    const back = backward.stops.filter(stop => stop.predicted).reverse()
    const length = Math.max(ahead.length, back.length)
    const at = [...Array(length).keys()].find(i => ahead[i]?.selector !== back[i]?.selector)
    if (at !== undefined) {
      const selector = ahead[at]?.selector ?? back[at]?.selector
      add(node('reverse-order', selector, `Tab visited ${ahead.length} of the ${predicted.length} predicted stops and Shift+Tab ${back.length}; they part at the ${at + 1}${['st', 'nd', 'rd'][at] ?? 'th'} one: ${ahead[at]?.selector ?? 'nothing'} forward, ${back[at]?.selector ?? 'nothing'} backward`))
    }
  }

  return { params, nodes, warnings: orderWarnings(forward.stops, dir), walks: { predicted, forward, backward } }
}

test.describe('tab', () => {
  test.skip(!runs, `A11Y_CONFIGS leaves out the ${CONFIG} config`)

  for (const theme of THEMES) {
    test.describe(`${theme}-${CONFIG}`, () => {
      test.use({ colorScheme: theme, reducedMotion: 'reduce' })

      for (const dir of DIRS) {
        for (const url of urls) {
          test(`${url} ${dir}`, async ({ page }, testInfo) => {
            test.setTimeout(120_000)
            const { params, nodes, warnings, walks } = await check(page, url, theme, dir)
            await testInfo.attach('walk.json', { body: JSON.stringify(walks, null, 2), contentType: 'application/json' })

            const known = knownOn(url, theme, CONFIG, 'tab', dir)
            const entryOf = new Map(nodes.map(node => [node, known.find(entry => matches(entry, node))]))
            await report(testInfo, { config: CONFIG, theme, url, state: dir === 'rtl' ? 'tab-rtl' : 'tab' }, [
              ...nodes.map(node => {
                const entry = entryOf.get(node)
                return { ...node, known: entry ? entry.issue ?? entry.reason : null }
              }),
              ...warnings
            ])

            const unexpected = nodes.filter(node => !entryOf.get(node))
            const gone = known.filter(entry => expectedWith(entry, CONFIG) && !nodes.some(node => matches(entry, node)))

            expect(nodes.every(node => TAB_RULES.includes(node.rule))).toBe(true)
            expect(unexpected.map(node => `${describe(node)}: ${node.summary}`), unexpectedMessage(`${url}?${params} walked with Tab and Shift+Tab${dir === 'rtl' ? ' in RTL' : ''}`)).toEqual([])
            expect(gone.map(describeEntry), goneMessage).toEqual([])
          })
        }
      }
    })
  }
})
