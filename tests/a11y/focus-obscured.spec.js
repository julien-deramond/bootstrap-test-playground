// WCAG 2.4.11 (Focus Not Obscured, AA): a focused element must not be entirely
// hidden by author-created content such as a sticky header, a fixed footer or
// a drawer. On every page where some element is `position: sticky` or `fixed`
// (decided at runtime from the computed styles, since the kitchen sink only
// mentions `.sticky-top` in examples it forces back to `static`), this scan
// presses Tab through the whole page, at 1280px and at 320px. After each focus
// it samples the element's centre and four corners with `elementFromPoint`: if
// the topmost element at every sampled point inside the viewport is part of a
// sticky or fixed element, and neither the focused element nor one of its
// descendants, it's a `focus-obscured`
// violation. Only some points covered is 2.4.12 (AAA): it goes in the report,
// without failing. The browser scrolls to each focused element, nothing else
// does, so a missing `scroll-padding-top` is what fails.
//
// Runs with the default config, when A11Y_CONFIGS includes it (`all` does),
// in light only: colors don't matter here. Known violations are the
// `focus-obscured` entries of known-issues.js, whose `target` can pin a width
// (`^320px `), and the report goes to
// reports/a11y/default/light/obscured/<page>.json.
import { expect, test } from '@playwright/test'
import { collectPages } from '../../scripts/lib/pages.mjs'
import {
  OBSCURED_RULE, describe, describeEntry, expectedWith, goneMessage, knownOn, load, matches, report, unexpectedMessage
} from './shared.js'

const CONFIG = 'default'
const THEME = 'light'
const runs = process.env.A11Y_CONFIGS === 'all' || (process.env.A11Y_CONFIGS || CONFIG).split(',').map(value => value.trim()).includes(CONFIG)

const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 320, height: 640 }
]
// Tab presses per page, so a page that never cycles back can't run forever.
const MAX_STOPS = 400

const HELP = 'Focused element must not be entirely hidden by author-created content (WCAG 2.4.11)'

const urls = collectPages('/').filter(({ dir }) => dir !== 'issues').flatMap(({ pages }) => pages.map(({ url }) => url))

// Runs in the page. Is some element sticky or fixed, and shown?
const hasPinned = () => [...document.querySelectorAll('body *')].some(element => {
  const { position } = getComputedStyle(element)
  return (position === 'sticky' || position === 'fixed') && element.checkVisibility() && !element.closest('[data-playground-chrome]')
})

// Runs in the page. Presses nothing: reads where the focused element is and
// what is on top of it.
const probe = () => {
  const element = document.activeElement
  if (!element || element === document.body || element === document.documentElement || element.closest('[data-playground-chrome]')) {
    return null
  }

  const { left, top, right, bottom, width, height } = element.getBoundingClientRect()
  if (!width || !height) {
    return null
  }

  const label = element.tagName.toLowerCase() + (element.id ? `#${element.id}` : '') +
    [...element.classList].slice(0, 3).map(name => `.${name}`).join('') +
    (element.getAttribute('href') ? `[href="${element.getAttribute('href')}"]` : '') +
    (element.getAttribute('name') ? `[name="${element.getAttribute('name')}"]` : '')
  // The centre and the four corners, a pixel inside the box.
  const points = [[(left + right) / 2, (top + bottom) / 2], [left + 1, top + 1], [right - 1, top + 1], [left + 1, bottom - 1], [right - 1, bottom - 1]]
    .map(([x, y]) => [Math.min(Math.max(x, left), right - 0.01), Math.min(Math.max(y, top), bottom - 0.01)])
    .filter(([x, y]) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight)
  const covers = points.map(([x, y]) => {
    const top = document.elementFromPoint(x, y)
    if (!top || element.contains(top)) {
      return null
    }

    // Only pinned content counts: a sticky or fixed element, or what's inside
    // one. Something else on top is the page clipping or overlapping its own
    // content (a table scrolled sideways, a visually hidden checkbox under its
    // label), which this check isn't about.
    let pinned = top
    while (pinned && !['sticky', 'fixed'].includes(getComputedStyle(pinned).position)) {
      pinned = pinned.parentElement
    }

    if (!pinned) {
      return null
    }

    const name = node => `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}${[...node.classList].slice(0, 3).map(name => `.${name}`).join('')}`
    return `${name(pinned)} (${getComputedStyle(pinned).position})`
  })
  return { label, sampled: points.length, covers }
}

// Tabs through the page and returns the focus stops the browser scrolled to.
async function walk(page) {
  const stops = []
  const seen = new Set()
  await page.evaluate(() => document.activeElement?.blur())
  for (let index = 0; index < MAX_STOPS; index++) {
    await page.keyboard.press('Tab')
    // Let the scroll the focus caused settle.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const key = await page.evaluate(() => {
      const element = document.activeElement
      if (!element || element === document.body) {
        return null
      }

      const path = []
      for (let node = element; node && node !== document.body; node = node.parentElement) {
        path.push([...node.parentElement?.children ?? []].indexOf(node))
      }

      return path.join('/')
    })
    if (key === null || seen.has(key)) {
      break
    }

    seen.add(key)
    const result = await page.evaluate(probe)
    if (result) {
      stops.push(result)
    }
  }

  return stops
}

test.describe('focus obscured', () => {
  test.skip(!runs, `A11Y_CONFIGS leaves out the ${CONFIG} config`)

  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.width}px`, () => {
      test.use({ colorScheme: THEME, reducedMotion: 'reduce', viewport })

      for (const url of urls) {
        test(url, async ({ page }, testInfo) => {
          test.setTimeout(120_000)
          const params = await load(page, url, THEME, CONFIG)
          test.skip(!await page.evaluate(hasPinned), 'No sticky or fixed element on this page')

          const stops = await walk(page)
          const nodes = []
          const partly = []
          for (const { label, sampled, covers } of stops) {
            const covered = covers.filter(Boolean)
            if (sampled && covered.length === sampled) {
              nodes.push({
                rule: OBSCURED_RULE,
                selector: `${viewport.width}px ${label}`,
                help: HELP,
                summary: `Covered at all ${sampled} sampled points by ${[...new Set(covered)].join(', ')}`
              })
            } else if (covered.length) {
              partly.push({ selector: `${viewport.width}px ${label}`, summary: `Covered at ${covered.length} of ${sampled} points by ${[...new Set(covered)].join(', ')} (2.4.12, AAA)` })
            }
          }

          const known = knownOn(url, THEME, CONFIG, 'obscured')
          const entryOf = new Map(nodes.map(node => [node, known.find(entry => matches(entry, node))]))
          await testInfo.attach('partly-obscured.json', { body: JSON.stringify(partly, null, 2), contentType: 'application/json' })
          // One report per page and width.
          await report(testInfo, {
            config: CONFIG, theme: THEME, url: `${url.replace(/\.html$/, '')}-${viewport.width}px`, state: 'obscured'
          }, nodes.map(node => {
            const entry = entryOf.get(node)
            return { ...node, known: entry ? entry.issue ?? entry.reason : null }
          }))

          const unexpected = nodes.filter(node => !entryOf.get(node))
          // An entry is gone when it matches nothing at this width. One whose
          // target starts with the other width (`^320px `) is left alone here.
          const gone = known.filter(entry => expectedWith(entry, CONFIG) && nodes.every(node => !matches(entry, node)) &&
            (/^\^?(\d+)px/.exec(entry.target?.source)?.[1] ?? viewport.width) === String(viewport.width))

          expect(unexpected.map(node => `${describe(node)}: ${node.summary}`), unexpectedMessage(`${url}?${params} at ${viewport.width}px`)).toEqual([])
          expect(gone.map(describeEntry), goneMessage).toEqual([])
        })
      }
    })
  }
})
