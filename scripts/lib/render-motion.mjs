// `npm run audit-motion -- --render`: checks that motion really stops. The
// static audit reads the CSS; this watches what the browser animates,
// including motion started by Bootstrap's JavaScript.
//
// Two passes over every kitchen sink page:
//   - reduce: `prefers-reduced-motion: reduce` emulated, configs/default.
//     Nothing may move.
//   - no-transitions: no preference, configs/no-transitions. Nothing may
//     transition; animations are allowed.
// On each page it records what runs once loaded, then clicks every toggle
// (`data-bs-toggle`, `data-bs-slide`, `data-bs-dismiss`…) and focuses every
// field, recording what `document.getAnimations()` returns after each one.
// Escape closes what a toggle opened before the next one.
//
// Known motion is matched by the `runtime` pattern of scripts/known-motion.mjs
// entries, against descriptions like `animation spinner-border on
// span.spinner-border`. Writes reports/motion/render.md. Exits non-zero on
// motion no entry matches.
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'
import { root } from './configs.mjs'
import { collectPages } from './pages.mjs'

const PASSES = [
  { name: 'reduce', config: 'default', reducedMotion: 'reduce', description: 'prefers-reduced-motion: reduce, configs/default: nothing may move' },
  { name: 'no-transitions', config: 'no-transitions', reducedMotion: 'no-preference', description: 'configs/no-transitions: nothing may transition', only: 'transition' }
]

const TRIGGERS = '[data-bs-toggle], [data-bs-slide], [data-bs-slide-to], [data-bs-dismiss], [data-bs-target]:is(button, a)'
const FIELDS = 'input:not([type=hidden]), select, textarea'

// Installed in every page as `window.motionProbe`.
function installProbe() {
  const describe = animation => {
    const target = animation.effect?.target
    const pseudo = animation.effect?.pseudoElement ?? ''
    const element = target ? `${target.localName}${[...target.classList].slice(0, 2).map(name => `.${name}`).join('')}${pseudo}` : 'unknown'
    if (animation instanceof CSSTransition) {
      return { type: 'transition', text: `transition ${animation.transitionProperty} on ${element}` }
    }

    if (animation instanceof CSSAnimation) {
      return { type: 'animation', text: `animation ${animation.animationName} on ${element}` }
    }

    return { type: 'script', text: `script animation on ${element}` }
  }

  const frames = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

  window.motionProbe = {
    triggers(selector) {
      return [...document.querySelectorAll(selector)]
        .filter(element => !element.closest('[data-playground-chrome]') && element.checkVisibility())
        .map((element, index) => {
          element.dataset.motionProbe = index
          return { index, label: `${element.localName}[data-bs-${Object.keys(element.dataset).find(key => key.startsWith('bs'))?.slice(2).toLowerCase() ?? 'target'}] ${element.textContent.trim().replace(/\s+/g, ' ').slice(0, 30)}` }
        })
    },
    async running() {
      await frames()
      return document.getAnimations()
        .filter(animation => ['running', 'pending'].includes(animation.playState))
        .map(describe)
    },
    async act(index, action) {
      const element = document.querySelector(`[data-motion-probe="${index}"]`)
      if (!element?.isConnected || !element.checkVisibility()) {
        return false
      }

      element.scrollIntoView({ block: 'center' })
      element.focus()
      if (action === 'click') {
        element.click()
      }

      return true
    }
  }
}

async function crawl(page, base, url, pass) {
  const seen = []
  const record = (moment, list) => {
    for (const motion of list) {
      if (!pass.only || motion.type === pass.only) {
        seen.push({ ...motion, moment })
      }
    }
  }

  // Not `?freeze`: it turns animations and transitions off.
  await page.goto(`${base}${url}?config=${pass.config}&chrome=0`)
  await page.waitForFunction(() => !document.getElementById('playground-config-pending'))
  await page.evaluate(() => document.fonts.ready)
  // A config's stylesheet is swapped in after load, so transitions from the
  // styles it replaces may still be running. They aren't this config's.
  await page.evaluate(() => document.getAnimations().forEach(animation => animation instanceof CSSTransition && animation.finish()))
  record('on load', await page.evaluate(() => window.motionProbe.running()))

  for (const [selector, action] of [[TRIGGERS, 'click'], [FIELDS, 'focus']]) {
    const targets = await page.evaluate(list => window.motionProbe.triggers(list), selector)
    for (const { index, label } of targets) {
      // Only the motion this step starts: what already ran is recorded.
      const before = new Set((await page.evaluate(() => window.motionProbe.running())).map(({ text }) => text))
      if (!await page.evaluate(([i, a]) => window.motionProbe.act(i, a), [index, action])) {
        continue
      }

      record(`${action} ${label}`, (await page.evaluate(() => window.motionProbe.running())).filter(({ text }) => !before.has(text)))
      await page.keyboard.press('Escape')
      await page.evaluate(() => document.activeElement?.blur())
    }
  }

  return seen
}

export async function renderMotion(known) {
  const pages = collectPages('/').find(({ dir }) => dir === 'kitchen-sink').pages
  const filter = process.argv.find(arg => arg.startsWith('--page='))?.slice('--page='.length)
  const selected = pages.filter(({ url }) => !filter || url.includes(filter))

  const server = await createServer({ root, logLevel: 'silent', server: { port: 5193 } })
  await server.listen()
  const base = server.resolvedUrls.local[0].replace(/\/$/, '')
  const browser = await chromium.launch()
  const results = []

  try {
    for (const pass of PASSES) {
      const context = await browser.newContext({ reducedMotion: pass.reducedMotion, viewport: { width: 1280, height: 900 } })
      await context.route(target => target.origin !== new URL(base).origin, route => route.abort())
      await context.addInitScript(installProbe)
      const page = await context.newPage()
      page.on('dialog', dialog => dialog.dismiss())

      for (const [index, { url }] of selected.entries()) {
        if (process.stdout.isTTY) {
          process.stdout.write(`\r${pass.name} [${index + 1}/${selected.length}] ${url}`.padEnd(80))
        }

        for (const motion of await crawl(page, base, url, pass)) {
          results.push({ pass: pass.name, url, ...motion })
        }
      }

      await context.close()
    }
  } finally {
    if (process.stdout.isTTY) {
      process.stdout.write('\r'.padEnd(81) + '\r')
    }

    await browser.close()
    await server.close()
  }

  const entryOf = motion => known.find(entry => entry.runtime?.test(motion.text))
  const reportFile = path.join(root, 'reports/motion/render.md')
  const lines = ['# Motion: rendered check', '']
  let problems = 0

  for (const pass of PASSES) {
    // One row per motion, with the pages and steps that start it.
    const groups = new Map()
    for (const motion of results.filter(result => result.pass === pass.name)) {
      const group = groups.get(motion.text) ?? { text: motion.text, places: [] }
      group.places.push(`${motion.url} (${motion.moment})`)
      groups.set(motion.text, group)
    }

    const list = [...groups.values()]
    const fresh = list.filter(group => !entryOf(group))
    problems += fresh.length

    console.log(`${fresh.length ? '✗' : '✓'} ${pass.description}: ${list.length - fresh.length} known, ${fresh.length} new`)
    for (const group of (process.argv.includes('--all') ? list : fresh)) {
      const entry = entryOf(group)
      console.log(`    ${group.text}${entry ? `  (${entry.issue ? `#${entry.issue}` : entry.reason})` : ''}`)
      console.log(`      ${group.places[0]}${group.places.length > 1 ? `  (+${group.places.length - 1} more)` : ''}`)
    }

    lines.push(`## ${pass.description}`, '', list.length ? '| Motion | Known | Where |' : 'Nothing moved.', ...(list.length ? ['| --- | --- | --- |'] : []),
      ...list.map(group => {
        const entry = entryOf(group)
        return `| \`${group.text}\` | ${entry ? (entry.issue ? `#${entry.issue}` : entry.reason) : '**new**'} | ${[...new Set(group.places)].slice(0, 5).join('<br>')}${group.places.length > 5 ? `<br>… ${group.places.length - 5} more` : ''} |`
      }), '')
  }

  fs.mkdirSync(path.dirname(reportFile), { recursive: true })
  fs.writeFileSync(reportFile, lines.join('\n'))
  console.log(`\n${selected.length} kitchen sink pages. Full report: ${path.relative(root, reportFile)}`)
  return problems ? 1 : 0
}
