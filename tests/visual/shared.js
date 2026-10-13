// What the visual specs share: the matrix of variants and the pages to open
// from the environment, how a page is loaded for a screenshot, and the list
// of the baselines a run compares with.
//   VISUAL_THEMES=light,dark   (default: light,dark)
//   VISUAL_DIRS=ltr,rtl        (default: ltr)
//   VISUAL_CONFIGS=working,shadcn, or `all` for every config (default: working)
//   VISUAL_SCOPE, which `npm run test-scope` prints: only the pages a pull
//     request changes (default: every page)
//   VISUAL_BASELINES_USED=reports/baselines-used.txt: where to list them, for
//     `node scripts/prune-baselines.mjs` (default: no list)
import fs from 'node:fs'
import path from 'node:path'
import { test } from '@playwright/test'
import { listConfigs, root } from '../../scripts/lib/configs.mjs'

const list = (name, fallback) => (process.env[name] || fallback).split(',').map(value => value.trim()).filter(Boolean)

const THEMES = list('VISUAL_THEMES', 'light,dark')
const DIRS = list('VISUAL_DIRS', 'ltr')
const CONFIGS = process.env.VISUAL_CONFIGS === 'all' ?
  ['working', ...listConfigs().map(({ name }) => name)] :
  list('VISUAL_CONFIGS', 'working')

// Every combination, named like the baselines' first folder: light-ltr-working.
export const VARIANTS = THEMES.flatMap(theme => DIRS.flatMap(dir => CONFIGS.map(config => ({ theme, dir, config, name: `${theme}-${dir}-${config}` }))))

// The visual suite only screenshots the working copy, so its scope is pages.
const scope = process.env.VISUAL_SCOPE ? JSON.parse(process.env.VISUAL_SCOPE) : { full: true }
export const inScope = url => scope.full || scope.urls.includes(url)

// Takes a baseline's name, as toHaveScreenshot() and toMatchSnapshot() do, and
// adds its path to the VISUAL_BASELINES_USED list, one per line. Every test
// lists the baselines it compares with, passing or not, so after a run of
// every page the baselines left out of the list are the ones no test uses
// any more.
const usedList = process.env.VISUAL_BASELINES_USED && path.resolve(root, process.env.VISUAL_BASELINES_USED)
export function baseline(name, kind = 'screenshot') {
  if (usedList) {
    fs.mkdirSync(path.dirname(usedList), { recursive: true })
    fs.appendFileSync(usedList, `${test.info().snapshotPath(...name, { kind })}\n`)
  }

  return name
}

// Stand-in for remote images (the docs examples use https://github.com/mdo.png
// as an avatar), so a changed or unreachable image never shows up as a diff.
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
  <rect width="256" height="256" fill="#6f42c1"/><circle cx="128" cy="100" r="48" fill="#e9d8fd"/>
  <rect x="48" y="164" width="160" height="92" rx="46" fill="#e9d8fd"/></svg>`

// Loads a page with `?chrome=0&freeze`, so only Bootstrap markup shows and it
// renders the same way every time, and waits until it's ready to screenshot.
export async function openPage(page, url, { theme, dir, config }) {
  await page.route(target => target.hostname !== 'localhost', route =>
    route.request().resourceType() === 'image' ?
      route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }) :
      route.continue())

  const params = new URLSearchParams({ theme, dir, config, chrome: '0', freeze: '' })
  await page.goto(`${url}?${params}`)
  // A non-default config hides the page until its styles are swapped in.
  await page.waitForFunction(() => !document.getElementById('playground-config-pending'))
  await page.evaluate(() => document.fonts.ready)
  // Pages that are still working after they load, like check pages
  // (markers drawn after `load`) or pages/color-modes.html (overlays,
  // color modes), mark <html> until they're done.
  await page.waitForFunction(() => !('playgroundBusy' in document.documentElement.dataset), null, { timeout: 30_000 })

  // WebKit draws today's date, from the system clock that `page.clock` doesn't
  // reach, in an empty date or time input, so its baseline would only match
  // on the day it was recorded. Hide the empty fields' text.
  if (page.context().browser()?.browserType().name() === 'webkit') {
    await page.addStyleTag({ content: `
      input:is([type="date"], [type="datetime-local"], [type="month"], [type="time"], [type="week"]):not([data-pg-filled])::-webkit-datetime-edit { visibility: hidden; }
    ` })
    await page.evaluate(() => {
      for (const input of document.querySelectorAll('input[type="date"], input[type="datetime-local"], input[type="month"], input[type="time"], input[type="week"]')) {
        if (input.value) input.dataset.pgFilled = ''
      }
    })
  }
}

// `issues/pg-1/` → issues/pg-1, `kitchen-sink/forms-radio.html` → kitchen-sink/forms-radio
export const snapshotPath = url => url.replace(/^\/|\/$|\.html$/g, '').split('/')
