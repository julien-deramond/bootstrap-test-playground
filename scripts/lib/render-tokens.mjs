// `npm run audit-tokens -- --render`: checks that overriding each component
// token changes the rendering. The static audit finds tokens nothing reads;
// this finds tokens that are read but shadowed, like a hard-coded value next
// to them or a later declaration that wins.
//
// For each token defined on component selectors in configs/default, it looks
// for an element matching one of those selectors on the playground's pages
// (kitchen sink first), overrides the token there with a series of sentinel
// values (a color, a length, a keyword…) and compares the computed styles of
// that element, its descendants and their ::before and ::after, then
// screenshots of it. The first value that changes anything makes the token
// "effective".
//
// Writes reports/tokens/render.md with one line per token.
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'
import { root } from './configs.mjs'
import { collectPages } from './pages.mjs'

// Tried in this order until one changes the rendering.
const SENTINELS = [
  'rgb(255, 0, 255)', '37px', '37%', '.37', '3', '900', 'italic', 'uppercase', 'none',
  'inset 0 0 0 7px rgb(255, 0, 255)', 'scale(3)', 'grid', '7s', 'linear', 'steps(3)', 'url("data:image/gif;base64,R0lGODlhAQABAAAAACw=")'
]

// Tokens that may only apply in a state the page doesn't show (hover, focus…).
const STATE = /hover|active|focus|checked|disabled|invalid|valid|open|show|selected|pressed|expanded|current|indeterminate|visited/

// A token that has no effect on one page may have one on another, with other
// markup (without a utility that overrides it, say): try it on at most this
// many pages.
const MAX_PAGES = 8

const STATUS = {
  effective: 'Effective',
  none: 'No visible effect',
  state: 'No visible effect in the states shown (may need hover, focus…)',
  vendor: 'No visible effect, read only in vendor pseudo-elements (`::-webkit-…`) that only screenshots see',
  noreader: 'No example of the element or state that reads it (a closed menu, a collapse mid-transition…)',
  unmatched: 'No example: no page has an element matching its selectors',
  unread: 'Not read (see the static audit)'
}

// Installed in every page as `window.tokenProbe`.
function installProbe() {
  const STATE_PSEUDO = /::[\w-]+(\([^)]*\))?|:(hover|focus|focus-visible|focus-within|active|visited|checked|disabled|enabled|invalid|valid|indeterminate|placeholder-shown|user-invalid|user-valid|read-only|popover-open|open|target|-webkit-autofill|autofill)\b/g
  let targets = []
  let readers = []
  let pseudos = []
  let style
  let properties

  const query = selector => {
    for (const candidate of [selector, selector.replace(STATE_PSEUDO, '')]) {
      try {
        const found = [...document.querySelectorAll(candidate)].filter(element => !element.closest('[data-playground-chrome]'))
        if (found.length) {
          return found
        }
      } catch {}
    }

    return []
  }

  // Transitions jump to their end value; endless animations (spinners) hold
  // still, so they never look like a change.
  const settle = () => {
    for (const animation of document.getAnimations()) {
      try {
        if (animation.effect?.getComputedTiming().iterations === Infinity) {
          animation.pause()
          animation.currentTime = 0
        } else {
          animation.finish()
        }
      } catch {}
    }
  }

  const snapshot = () => {
    settle()
    return readers.flatMap(element => [null, ...pseudos].map(pseudo => {
      const computed = getComputedStyle(element, pseudo)
      return properties.map(property => computed.getPropertyValue(property)).join(';')
    })).join('\n')
  }

  const set = (name, value) => {
    style.textContent = value === undefined ? '' : `[data-token-probe] { ${name}: ${value} !important; }`
    settle()
  }

  window.tokenProbe = {
    // Marks elements the token is defined on that are, or contain, an
    // element reading it. 'unmatched' when no element defines it, 'unread'
    // when none of those holds a reader, like a closed datepicker.
    mark(selectors, readSelectors) {
      style ??= document.head.appendChild(document.createElement('style'))
      properties ??= [...getComputedStyle(document.documentElement)].filter(property => !property.startsWith('--'))
      for (const target of targets) {
        target.removeAttribute('data-token-probe')
      }

      const definers = [...new Set(selectors.flatMap(query))]
      if (!definers.length) {
        return 'unmatched'
      }

      const all = new Set(readSelectors.flatMap(query))
      targets = definers.filter(definer => [...all].some(reader => definer.contains(reader))).slice(0, 20)
      readers = [...all].filter(reader => targets.some(target => target.contains(reader))).slice(0, 60)
      // `::before`, `::after`, and whatever the readers style: `::backdrop`,
      // `::file-selector-button`… (not the vendor ones, which only show in
      // screenshots).
      pseudos = [...new Set(['::before', '::after', ...readSelectors.flatMap(selector => selector.match(/::[a-z][\w-]*/g) ?? [])])]
        .filter(pseudo => !pseudo.startsWith('::-'))
      for (const target of targets) {
        target.setAttribute('data-token-probe', '')
      }

      return targets.length ? 'marked' : 'unread'
    },
    set,
    // The first sentinel that changes a computed style, if any.
    computed(name, sentinels) {
      set(name)
      const before = snapshot()
      const value = sentinels.find(sentinel => {
        set(name, sentinel)
        return snapshot() !== before
      })
      set(name)
      return value
    }
  }
}

// Computed styles miss what only shows in vendor pseudo-elements, such as
// `::-webkit-slider-thumb`, so compare screenshots of the first target too.
async function screenshotProbe(page, name) {
  const target = page.locator('[data-token-probe]').first()
  const shoot = () => target.screenshot({ animations: 'disabled', timeout: 2000 })
  try {
    if (!await target.isVisible()) {
      return undefined
    }

    const before = await shoot()
    for (const sentinel of SENTINELS) {
      await page.evaluate(([n, v]) => window.tokenProbe.set(n, v), [name, sentinel])
      if (!before.equals(await shoot())) {
        return sentinel
      }
    }
  } catch {
    // Hidden or zero-size element: nothing to see.
  } finally {
    await page.evaluate(n => window.tokenProbe.set(n), name)
  }

  return undefined
}

export async function renderTokens({ defined, reads, unused, isGlobal }) {
  const component = [...defined]
    .filter(([, list]) => !list.some(definition => isGlobal(definition.selector)))
    .map(([token, list]) => ({
      token,
      selectors: [...new Set(list.map(({ selector }) => selector).filter(selector => selector && !selector.startsWith('@')))],
      readSelectors: [...new Set((reads.get(token) ?? []).map(({ selector }) => selector).filter(selector => selector && !selector.startsWith('@')))],
      where: list[0].where
    }))
    .sort((a, b) => a.token.localeCompare(b.token))

  const results = new Map(component.filter(({ token }) => unused.has(token)).map(({ token }) => [token, { status: 'unread' }]))
  const pending = component.filter(({ token }) => !unused.has(token))
  const tries = new Map()

  const order = { 'kitchen-sink': 0, pages: 1, screens: 2 }
  const urls = collectPages('/')
    .filter(({ dir }) => dir in order)
    .sort((a, b) => order[a.dir] - order[b.dir])
    .flatMap(({ pages }) => pages.map(({ url }) => url))

  // Silent: Vite would forward the pages' console output, which the console
  // crawl already covers.
  const server = await createServer({ root, logLevel: 'silent', server: { port: 5190 } })
  await server.listen()
  const base = server.resolvedUrls.local[0].replace(/\/$/, '')
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.addInitScript(installProbe)

  try {
    for (const [index, url] of urls.entries()) {
      const todo = pending.filter(({ token }) => results.get(token)?.status !== 'effective' && (tries.get(token) ?? 0) < MAX_PAGES)
      if (!todo.length) {
        break
      }

      if (process.stdout.isTTY) {
        process.stdout.write(`\r[${index + 1}/${urls.length}] ${url}`.padEnd(80))
      }

      // Not `?freeze`: it turns animations and transitions off, which would
      // hide every animation and transition token.
      await page.goto(`${base}${url}?config=default&chrome=0`)
      await page.waitForFunction(() => !document.getElementById('playground-config-pending'))
      await page.evaluate(() => document.fonts.ready)

      for (const { token, selectors, readSelectors } of todo) {
        const name = `--bs-${token.slice(2)}`
        const marked = await page.evaluate(([list, readList]) => window.tokenProbe.mark(list, readList), [selectors, readSelectors])
        if (marked !== 'marked') {
          if (marked === 'unread' && !results.has(token)) {
            results.set(token, { status: 'noreader', url })
          }

          continue
        }

        const value = await page.evaluate(([n, list]) => window.tokenProbe.computed(n, list), [name, SENTINELS]) ??
          await screenshotProbe(page, name)
        const result = value ? { status: 'effective', value } : { status: 'none' }

        tries.set(token, (tries.get(token) ?? 0) + 1)
        if (result.status === 'effective' || !results.has(token)) {
          results.set(token, { ...result, url })
        }
      }
    }
  } finally {
    if (process.stdout.isTTY) {
      process.stdout.write('\r'.padEnd(81) + '\r')
    }

    await browser.close()
    await server.close()
  }

  for (const { token, readSelectors } of pending) {
    const result = results.get(token)
    if (!result) {
      results.set(token, { status: 'unmatched' })
    } else if (['none', 'noreader'].includes(result.status) && STATE.test(token)) {
      result.status = 'state'
    } else if (result.status === 'none' && readSelectors.length && readSelectors.every(selector => selector.includes('::-'))) {
      result.status = 'vendor'
    }
  }

  const rows = component.map(({ token, selectors, where }) => ({ token, selectors, where, ...results.get(token) }))
  const counts = Object.keys(STATUS).map(status => [status, rows.filter(row => row.status === status)])

  const reportFile = path.join(root, 'reports/tokens/render.md')
  fs.mkdirSync(path.dirname(reportFile), { recursive: true })
  fs.writeFileSync(reportFile, [
    '# Component tokens: rendered check',
    '',
    `${rows.length} tokens defined on component selectors in configs/default. Global tokens (\`:root\`, themes) are not checked.`,
    '',
    'A token with no visible effect on a page may be masked there by a utility or the page’s own CSS (`.gap-4` on a `.grid`), or need a viewport or state the page doesn’t show. Check the page before filing it upstream.',
    '',
    ...counts.map(([status, list]) => `- ${STATUS[status]}: ${list.length}`),
    '',
    '| Token | Result | Details | Declared |',
    '| --- | --- | --- | --- |',
    ...rows.map(({ token, status, value, url, selectors, where }) =>
      `| \`${token}\` | ${STATUS[status]} | ${status === 'effective' ? `\`${value}\` on ${url}` : url ?? `\`${selectors.join(', ').replace(/\|/g, '\\|')}\``} | ${where ?? ''} |`),
    ''
  ].join('\n'))

  console.log(`${rows.length} component tokens in configs/default:`)
  for (const [status, list] of counts) {
    console.log(`  ${STATUS[status]}: ${list.length}`)
  }

  const none = counts.find(([status]) => status === 'none')[1]
  if (none.length) {
    console.log(`\n${STATUS.none}:`)
    for (const { token, url, where } of none) {
      console.log(`    ${token}  on ${url}${where ? `  (${where})` : ''}`)
    }
  }

  console.log(`\nFull report: ${path.relative(root, reportFile)}`)
  return 0
}
