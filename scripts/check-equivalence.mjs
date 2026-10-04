#!/usr/bin/env node
// Checks that the same customization renders the same through both paths the
// docs offer: at compile time, with `@use "bootstrap/scss/bootstrap" with (…)`,
// and at runtime, with CSS custom properties in tokens.css.
// Usage: npm run check-equivalence [-- --pair=<names>] [--page=<filter>] [--static]
//
// The pairs are in scripts/equivalence-pairs.mjs. For each one:
//   1. Static: compiles Bootstrap with the Sass side and compares the CSS with
//      Bootstrap's defaults. Each change is either one the tokens side makes
//      too, or one only Sass makes: a value computed or consumed at compile
//      time (a scale derived from `$spacer`, a utility's literal value, a
//      declaration a `null` key removed). It also lists the tokens the Sass
//      side never changes, and the rules that declare the same tokens again.
//      These are the likely reasons when the two paths render differently.
//   2. Render (skipped with --static): starts a dev server and opens every
//      kitchen sink page three times, with Bootstrap's defaults, with the Sass
//      side, and with the defaults plus the tokens side. It screenshots each
//      example in light mode and compares the two sides pixel by pixel, and
//      for the most different examples lists the computed styles that differ.
//
// Writes reports/equivalence/report.md, with an image of each example that
// differs: Sass, tokens.css and their difference in magenta. A pair whose two
// paths render differently is listed in scripts/known-equivalence.mjs with
// its tracking issue, or the reason it's intended. Exits non-zero on a pair
// that diverges without an entry, and on an entry whose pair no longer
// diverges. Honors BOOTSTRAP_PATH.

import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { createServer, loadEnv } from 'vite'
import { bootstrapSource } from './lib/bootstrap.mjs'
import { compileSource, processCss } from './lib/compile.mjs'
import { root } from './lib/configs.mjs'
import { compareStatic, declarations, groupChanges } from './lib/equivalence.mjs'
import { compareImages, PLACEHOLDER_IMAGE } from './lib/image-diff.mjs'
import { collectPages } from './lib/pages.mjs'
import allPairs from './equivalence-pairs.mjs'
import known from './known-equivalence.mjs'

// Bugs are tracked, intended findings explained: see "Upstream issue tracking" in CLAUDE.md.
for (const entry of known) {
  if (Boolean(entry.issue) === Boolean(entry.reason)) {
    throw new Error(`scripts/known-equivalence.mjs: ${entry.pair} needs either an \`issue\` or a \`reason\``)
  }

  if (!allPairs.some(pair => pair.name === entry.pair)) {
    throw new Error(`scripts/known-equivalence.mjs: no pair named ${entry.pair} in scripts/equivalence-pairs.mjs`)
  }
}

const option = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
const pairFilter = option('pair')?.split(',')
const pageFilter = option('page')
const staticOnly = process.argv.includes('--static')
// Differing pixels from which an example counts, like the RTL render and
// diff-bootstrap: below that, it's anti-aliasing.
const MIN_PIXELS = 10
// Examples per pair whose computed styles the report details.
const DETAILED = 3
// Time for one kitchen sink page and all its pairs, a few seconds normally.
const PAGE_TIMEOUT = 120_000
// Pages that failed twice, left out of the verdicts.
const skipped = []
const quiet = { warn() {}, debug() {} }

const pairs = allPairs.filter(pair => !pairFilter || pairFilter.includes(pair.name))
if (pairs.length === 0) {
  console.error(`No pair matches --pair=${pairFilter}. Pairs: ${allPairs.map(pair => pair.name).join(', ')}`)
  process.exit(1)
}

const bootstrap = bootstrapSource(loadEnv('production', root, ''))
const bootstrapDir = bootstrap.dir ?? path.join(root, 'node_modules/bootstrap')
console.log(`Bootstrap: ${bootstrap.label}\n`)

const reportDir = path.join(root, 'reports/equivalence')
fs.rmSync(reportDir, { recursive: true, force: true })
fs.mkdirSync(path.join(reportDir, 'images'), { recursive: true })

// --- Static -----------------------------------------------------------------

const compiledDefaults = await compileSource('@use "bootstrap/scss/bootstrap";', { bootstrapDir, logger: quiet })
const defaultCss = compiledDefaults.css
const defaults = declarations(compiledDefaults.root)

for (const pair of pairs) {
  let sass
  try {
    sass = await compileSource(`@use "bootstrap/scss/bootstrap" with (${pair.sass});`, { bootstrapDir, logger: quiet })
  } catch (error) {
    console.error(`✗ ${pair.name}: the Sass side doesn't compile: ${error.message.split('\n')[0]}`)
    process.exit(1)
  }

  const tokens = await processCss(pair.tokens)
  pair.sassCss = sass.css
  pair.tokensCss = tokens.css
  pair.static = compareStatic({ defaults, sass: declarations(sass.root), tokens: declarations(tokens.root) })
}

// --- Render -----------------------------------------------------------------

async function render() {
  const kitchenSink = collectPages('/').find(({ dir }) => dir === 'kitchen-sink').pages
  const pages = kitchenSink.filter(({ url }) => !pageFilter || url.includes(pageFilter))
  const pairsOf = url => pairs.filter(pair => !pair.pages || url.includes(pair.pages))
  for (const pair of pairs) {
    Object.assign(pair, { examples: 0, sassEffect: 0, tokensEffect: 0, differ: [] })
  }

  // Served from memory. The working copy's stylesheets (src/styles/) answer
  // with Bootstrap's defaults, so the pages start the same whatever it holds.
  const styles = new Map([['default', defaultCss], ['empty', '']])
  for (const pair of pairs) {
    styles.set(`${pair.name}-sass`, pair.sassCss)
    styles.set(`${pair.name}-tokens`, pair.tokensCss)
  }

  // No HMR: editing a page or a config README during the run would reload the
  // pages, and their stylesheets with them.
  const server = await createServer({ root, logLevel: 'silent', server: { port: 5195, hmr: false } })
  await server.listen()
  const base = server.resolvedUrls.local[0].replace(/\/$/, '')
  const origin = new URL(base).origin

  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, timezoneId: 'UTC', locale: 'en-US' })
  await context.route(target => target.origin !== origin, route =>
    route.request().resourceType() === 'image' ?
      route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }) :
      route.abort())
  const fulfill = (route, name) => route.fulfill({ contentType: 'text/css', headers: { 'cache-control': 'max-age=3600' }, body: styles.get(name) })
  await context.route(target => target.pathname === '/src/styles/main.scss', route => fulfill(route, 'default'))
  await context.route(target => target.pathname === '/src/styles/tokens.css', route => fulfill(route, 'empty'))
  await context.route(target => target.pathname.startsWith('/__equivalence/'), route =>
    fulfill(route, decodeURIComponent(new URL(route.request().url()).pathname.slice('/__equivalence/'.length).replace(/\.css$/, ''))))

  // A page is given PAGE_TIMEOUT for every pair. Under load, a headless tab
  // sometimes stalls for minutes; then its tabs are replaced and the page is
  // tried once more, and skipped after that.
  let defaultPage, sassPage, tokensPage, canvasPage
  const openTabs = async () => {
    await Promise.all([defaultPage, sassPage, tokensPage, canvasPage].map(tab => tab?.close().catch(() => {})))
    ;[defaultPage, sassPage, tokensPage, canvasPage] = await Promise.all(Array.from({ length: 4 }, () => context.newPage()))
  }

  // Swaps a shared stylesheet, like the toolbar's config switch: the new one
  // loads next to the old one, then the old one goes.
  const use = (page, styleSet) => page.evaluate(async entries => {
    await Promise.all(Object.entries(entries).map(([key, href]) => new Promise(resolve => {
      const link = document.querySelector(`link[data-playground-styles="${key}"]`)
      const next = link.cloneNode()
      next.href = href
      next.addEventListener('load', () => {
        link.remove()
        resolve()
      }, { once: true })
      next.addEventListener('error', resolve, { once: true })
      link.after(next)
    })))
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  }, Object.fromEntries(Object.entries(styleSet).map(([key, name]) => [key, `/__equivalence/${encodeURIComponent(name)}.css`])))

  // Identical screenshots are common, and cheap to tell; otherwise count the
  // pixels, so anti-aliasing doesn't count as a change.
  const dataUrl = image => `data:image/png;base64,${image.toString('base64')}`
  const differs = async (a, b) => !a.equals(b) &&
    (await canvasPage.evaluate(compareImages, [dataUrl(a), dataUrl(b), false, false])).pixels >= MIN_PIXELS

  const shoot = async (page, selector) => {
    const section = page.locator(selector)
    return (await section.count()) && (await section.isVisible()) ?
      section.screenshot({ animations: 'disabled', caret: 'hide', scale: 'css' }) :
      null
  }

  // Renders one page for each of its pairs. Returns the counts and the
  // differing examples per pair, merged only once the whole page went through.
  async function renderPage({ url, title, sections }, pagePairs) {
    await Promise.all([defaultPage, sassPage, tokensPage].map(async page => {
      await page.goto(`${base}${url}?chrome=0&freeze&theme=light`)
      await page.waitForFunction(() => !document.getElementById('playground-config-pending') && window.bootstrap)
      // Images too, or one tab may shoot a logo the others don't have yet.
      await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map(image => image.decode().catch(() => {}))]))
    }))

    const reference = new Map()
    for (const { id } of sections) {
      reference.set(id, await shoot(defaultPage, `.bd-kitchen-sink-section[aria-labelledby="${id}"]`))
    }

    const results = new Map()
    for (const pair of pagePairs) {
      const result = { examples: 0, sassEffect: 0, tokensEffect: 0, differ: [] }
      results.set(pair, result)
      await Promise.all([use(sassPage, { main: `${pair.name}-sass` }), use(tokensPage, { tokens: `${pair.name}-tokens` })])
      for (const { id, title: example } of sections) {
        const selector = `.bd-kitchen-sink-section[aria-labelledby="${id}"]`
        const [sass, tokens] = await Promise.all([shoot(sassPage, selector), shoot(tokensPage, selector)])
        const before = reference.get(id)
        if (!sass || !tokens || !before) {
          continue
        }

        result.examples++
        result.sassEffect += await differs(sass, before) ? 1 : 0
        result.tokensEffect += await differs(tokens, before) ? 1 : 0
        if (sass.equals(tokens)) {
          continue
        }

        const comparison = await canvasPage.evaluate(compareImages, [dataUrl(sass), dataUrl(tokens), false])
        if (comparison.pixels < MIN_PIXELS) {
          continue
        }

        const name = `${pair.name}--${path.basename(url, '.html')}--${id}`
        fs.writeFileSync(path.join(reportDir, 'images', `${name}.png`), Buffer.from(comparison.image, 'base64'))
        const entry = { url, page: title, id, example, name, pixels: comparison.pixels, resized: comparison.resized }
        result.differ.push(entry)
        // Computed styles, for the first few: the screenshots say where,
        // these say which property.
        if (pair.differ.length + result.differ.length <= DETAILED) {
          const [a, b] = await Promise.all([sassPage, tokensPage].map(page => page.evaluate(computedStyles, selector)))
          entry.styles = diffStyles(a, b)
        }
      }
    }

    return results
  }

  try {
    await openTabs()
    for (const [index, page] of pages.entries()) {
      const pagePairs = pairsOf(page.url)
      if (pagePairs.length === 0) {
        continue
      }

      if (process.stdout.isTTY) {
        process.stdout.write(`\r[${index + 1}/${pages.length}] ${page.url}`.padEnd(80))
      }

      let results
      for (let attempt = 1; !results && attempt <= 2; attempt++) {
        let timer
        // Once timed out, it fails when its tabs close: nothing to report.
        const run = renderPage(page, pagePairs)
        run.catch(() => {})
        try {
          results = await Promise.race([
            run,
            new Promise((resolve, reject) => {
              timer = setTimeout(() => reject(new Error(`no result after ${PAGE_TIMEOUT / 1000}s`)), PAGE_TIMEOUT)
            })
          ])
        } catch (error) {
          // Closing the tabs also ends what is still running in them.
          await openTabs()
          if (attempt === 2) {
            skipped.push({ url: page.url, error: error.message.split('\n')[0] })
          }
        } finally {
          clearTimeout(timer)
        }
      }

      for (const [pair, result] of results ?? []) {
        pair.examples += result.examples
        pair.sassEffect += result.sassEffect
        pair.tokensEffect += result.tokensEffect
        pair.differ.push(...result.differ)
      }
    }
  } finally {
    if (process.stdout.isTTY) {
      process.stdout.write('\r'.padEnd(81) + '\r')
    }

    await browser.close()
    await server.close()
  }

  for (const pair of pairs) {
    pair.differ.sort((a, b) => b.pixels - a.pixels)
  }
}

// Runs in the page: every element of the example, with its ::before and
// ::after, and their computed styles.
function computedStyles(selector) {
  const section = document.querySelector(selector)
  const describe = element => `${element.localName}${[...element.classList].slice(0, 3).map(name => `.${name}`).join('')}`
  return [...section.querySelectorAll('*')].flatMap(element => [null, '::before', '::after'].map(pseudo => {
    const style = getComputedStyle(element, pseudo)
    if (pseudo && style.content === 'none') {
      return null
    }

    return { element: `${describe(element)}${pseudo ?? ''}`, style: Object.fromEntries([...style].filter(name => !name.startsWith('--')).map(name => [name, style.getPropertyValue(name)])) }
  }).filter(Boolean))
}

// Sizes and origins follow from other properties, and physical longhands
// repeat their logical ones: listed only when nothing else differs.
const DERIVED = /^(width|height|inline-size|block-size|perspective-origin|transform-origin)$|(^|-)(top|right|bottom|left)(-|$)/

// The properties that differ, element by element, at most 8, causes first.
function diffStyles(a, b) {
  const all = []
  for (const [index, left] of a.entries()) {
    const right = b[index]
    if (!right || right.element !== left.element) {
      break
    }

    for (const [name, value] of Object.entries(left.style)) {
      if (right.style[name] !== value) {
        all.push({ element: left.element, name, sass: value, tokens: right.style[name] })
      }
    }
  }

  // Sibling elements alike differ alike: one line each, with a count.
  const causes = all.filter(diff => !DERIVED.test(diff.name))
  const unique = new Map()
  for (const diff of causes.length ? causes : all) {
    const key = `${diff.element}|${diff.name}|${diff.sass}|${diff.tokens}`
    unique.set(key, { ...diff, count: (unique.get(key)?.count ?? 0) + 1 })
  }

  return [...unique.values()].slice(0, 8)
}

if (!staticOnly) {
  await render()
}

// --- Verdicts ---------------------------------------------------------------

// With --page, or pages skipped, an example that diverges may not have been
// rendered.
const partial = Boolean(pageFilter) || skipped.length > 0
for (const pair of pairs) {
  const { compileTime, unreached } = pair.static
  pair.known = known.find(entry => entry.pair === pair.name)
  if (staticOnly) {
    pair.verdict = compileTime.length || unreached.length ? 'differs in the CSS' : 'same CSS changes'
    pair.failed = false
  } else if (pair.differ.length) {
    pair.verdict = 'diverges'
    pair.failed = !pair.known
  } else {
    pair.verdict = pair.sassEffect || pair.tokensEffect ? 'equivalent' : 'no visible effect'
    pair.failed = Boolean(pair.known) && !partial
  }
}

// --- Report -----------------------------------------------------------------

const code = value => `\`${String(value).replace(/`/g, '\\`')}\``
const short = (value, length = 60) => (value.length > length ? `${value.slice(0, length - 1)}…` : value)

// One line per group of compile-time changes.
function describeGroup({ layer, kind, prop, list }) {
  const selectors = [...new Set(list.map(change => change.selector))]
  const example = list[0]
  const value = kind === 'removed' ? `removed (was ${code(short(example.from, 40))})` :
    kind === 'added' ? `added: ${code(short(example.value, 40))}` :
      `${code(short(example.from, 30))} → ${code(short(example.value, 30))}`
  return `${code(prop)} on ${selectors.slice(0, 2).map(selector => code(short(selector, 50))).join(', ')}${selectors.length > 2 ? ` and ${selectors.length - 2} more` : ''} (${layer}): ${value}${list.length > 1 ? `, ${list.length} declarations` : ''}`
}

function reasons(pair) {
  const { compileTime, unreached, redeclared } = pair.static
  const lines = []
  for (const token of unreached) {
    lines.push(`The Sass side never changes ${code(token.prop)}: it keeps its default value everywhere.`)
  }

  if (compileTime.length) {
    lines.push(`Only the Sass side changes ${compileTime.length} declaration${compileTime.length > 1 ? 's' : ''}, computed or consumed at compile time:`)
    lines.push(...groupChanges(compileTime).slice(0, 8).map(group => `  - ${describeGroup(group)}`))
    const groups = groupChanges(compileTime).length
    if (groups > 8) {
      lines.push(`  - and ${groups - 8} more groups`)
    }
  }

  const tokens = [...new Set(redeclared.map(entry => entry.token))]
  for (const token of tokens) {
    const rules = redeclared.filter(entry => entry.token === token)
    lines.push(`${code(token)} is also declared on ${rules.slice(0, 3).map(entry => code(short(entry.selector, 40))).join(', ')}${rules.length > 3 ? ` and ${rules.length - 3} more rules` : ''}: the tokens.css override, in a later layer, replaces those values on the elements both match; the Sass override leaves them as they are.`)
  }

  return lines
}

const lines = [
  '# Sass `with (…)` against tokens.css',
  '',
  `Bootstrap: ${bootstrap.label}. ${staticOnly ? 'Static comparison only (`--static`).' : `Kitchen sink examples in light mode${pageFilter ? `, pages matching ${code(pageFilter)}` : ''}.`}`,
  '',
  ...(skipped.length ? [`Skipped, after two attempts: ${skipped.map(({ url, error }) => `${code(url)} (${error})`).join(', ')}. Known entries aren't checked for staleness.`, ''] : []),
  'Each pair makes the same customization twice: at compile time with `@use "bootstrap/scss/bootstrap" with (…)`, and at runtime in tokens.css (see `scripts/equivalence-pairs.mjs`). *Sass* and *tokens.css* count the examples each side changes from Bootstrap\'s defaults, *Differ* those where the two sides render differently.',
  '',
  ...(staticOnly ?
    ['| Pair | Verdict | Compile time only | Never reached by Sass | Known |', '| --- | --- | --- | --- | --- |'] :
    ['| Pair | Verdict | Examples | Sass | tokens.css | Differ | Known |', '| --- | --- | --- | --- | --- | --- | --- |']),
  ...pairs.map(pair => {
    const known = pair.known ? (pair.known.issue ? `[#${pair.known.issue}](https://github.com/julien-deramond/bootstrap-test-playground/issues/${pair.known.issue})` : pair.known.reason) : '–'
    return staticOnly ?
      `| [${pair.name}](#${pair.name}) | ${pair.verdict} | ${pair.static.compileTime.length} | ${pair.static.unreached.length} | ${known} |` :
      `| [${pair.name}](#${pair.name}) | ${pair.verdict} | ${pair.examples} | ${pair.sassEffect} | ${pair.tokensEffect} | ${pair.differ.length} | ${known} |`
  }),
  ''
]

for (const pair of pairs) {
  lines.push(`## ${pair.name}`, '', `${pair.description}. **${pair.verdict}**.`, '')
  lines.push('```scss', `@use "bootstrap/scss/bootstrap" with (${pair.sass.replace(/\n {4}/g, '\n')});`, '```', '', '```css', pair.tokens, '```', '')
  const why = reasons(pair)
  lines.push(...(why.length ? why : ['Both sides make the same changes to the CSS.']), '')
  if (!staticOnly && pair.differ.length) {
    for (const entry of pair.differ.filter(item => item.styles?.length)) {
      lines.push(`Computed styles in [${entry.page}: ${entry.example}](${entry.url}#${entry.id}), Sass → tokens.css:`, '')
      lines.push(...entry.styles.map(({ element, name, sass, tokens, count }) => `- ${code(element)}${count > 1 ? ` (${count} elements)` : ''} ${code(name)}: ${code(short(sass, 50))} → ${code(short(tokens, 50))}`), '')
    }

    lines.push('| Example | Pixels | Image |', '| --- | --- | --- |')
    lines.push(...pair.differ.map(({ url, id, page, example, name, pixels, resized }) =>
      `| [${page}: ${example}](${url}#${id}) | ${pixels}${resized ? ' (size differs)' : ''} | [${name}.png](images/${name}.png) |`), '')
  }
}

const reportFile = path.join(reportDir, 'report.md')
fs.writeFileSync(reportFile, `${lines.join('\n')}\n`)

// --- Console ----------------------------------------------------------------

for (const pair of pairs) {
  const mark = pair.failed ? '✗' : pair.verdict === 'diverges' || pair.verdict === 'differs in the CSS' ? '!' : '✓'
  const counts = staticOnly ? '' : `: ${pair.differ.length} of ${pair.examples} examples differ (Sass changes ${pair.sassEffect}, tokens.css ${pair.tokensEffect})`
  const note = pair.known ? `  (${pair.known.issue ? `#${pair.known.issue}` : pair.known.reason})` : ''
  console.log(`${mark} ${pair.name}: ${pair.verdict}${counts}${note}`)
  if (pair.verdict === 'diverges' || pair.verdict === 'differs in the CSS') {
    for (const line of reasons(pair)) {
      console.log(`    ${line.replace(/`/g, '')}`)
    }
  }
}

const fresh = pairs.filter(pair => pair.failed && pair.verdict === 'diverges')
const stale = pairs.filter(pair => pair.failed && pair.verdict !== 'diverges')
for (const pair of stale) {
  console.log(`\n✗ ${pair.name} no longer diverges: remove it from scripts/known-equivalence.mjs.`)
  if (pair.known.issue) {
    console.log(`  If Bootstrap fixed it, mark #${pair.known.issue} \`upstream-fixed\` and close it (step 3 of "Upstream issue tracking" in CLAUDE.md).`)
  }
}

if (fresh.length) {
  console.log('\nFor each new divergence, read the report: the static lines say what only one side changes.')
  console.log('If it’s a Bootstrap bug or a docs gap, open a tracking issue in this repository labeled `upstream`')
  console.log('(see "Upstream issue tracking" in CLAUDE.md), then add the pair to scripts/known-equivalence.mjs with `issue: <n>`.')
  console.log('If the two paths are meant to differ, add it with a `reason`.')
}

if (skipped.length) {
  console.log(`\n! Skipped after two attempts, so known entries aren't checked for staleness:`)
  for (const { url, error } of skipped) {
    console.log(`    ${url}: ${error}`)
  }
}

console.log(`\nFull report: ${path.relative(root, reportFile)}`)
process.exitCode = fresh.length || stale.length ? 1 : 0
