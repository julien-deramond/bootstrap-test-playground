#!/usr/bin/env node
// Renders one page, or one kitchen sink example, under several configs and
// writes the grid as one image, like /matrix.html: columns are configs, rows
// are theme × direction. Each cell after the first column is compared with the
// first column of its row, pixel by pixel, and the image shows its difference
// ratio. With --diff, those cells show the difference in magenta instead.
// Usage: npm run matrix -- <page>[#<example id>] [--configs=default,square,pill]
//   [--themes=light,dark] [--dirs=ltr,rtl] [--width=600] [--diff]
// <page> is a kitchen sink page's name (`components-button`) or a path
// (`/pages/dashboard.html`). Writes reports/page-matrix/<page>[--<example>].png.

import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'
import { fail, listConfigs, root } from './lib/configs.mjs'
import { compareImages, PLACEHOLDER_IMAGE } from './lib/image-diff.mjs'
import { collectPages } from './lib/pages.mjs'

const USAGE = 'Usage: npm run matrix -- <page>[#<example id>] [--configs=a,b] [--themes=light,dark] [--dirs=ltr,rtl] [--width=600] [--diff]'

const option = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
const listOption = (name, fallback, allowed) => {
  const values = (option(name) ?? fallback).split(',').map(value => value.trim()).filter(Boolean)
  const unknown = values.filter(value => !allowed.includes(value))
  if (unknown.length > 0) {
    fail(`Unknown --${name}: ${unknown.join(', ')}. Pick from: ${allowed.join(', ')}`)
  }

  return values
}

const [target] = process.argv.slice(2).filter(arg => !arg.startsWith('--'))
if (!target) {
  fail(USAGE)
}

const configNames = ['working', ...listConfigs().map(({ name }) => name)]
const shapes = listConfigs().filter(({ category }) => category === 'shape').map(({ name }) => name)
const configs = listOption('configs', ['default', ...shapes].join(','), configNames)
const themes = listOption('themes', 'light,dark', ['light', 'dark'])
const dirs = listOption('dirs', 'ltr', ['ltr', 'rtl'])
const width = Number.parseInt(option('width') ?? '600', 10)
const showDiff = process.argv.includes('--diff')

const [pagePart, section = ''] = target.split('#')
const pages = collectPages('/').flatMap(({ dir, pages }) => pages.map(page => ({ ...page, dir })))
const page = pages.find(({ url }) => url === pagePart || url === `/${pagePart}`) ??
  pages.find(({ url, dir }) => dir === 'kitchen-sink' && path.basename(url, '.html') === pagePart)
if (!page) {
  fail(`No page matches \`${pagePart}\`. Use a kitchen sink page's name, like components-button, or a path, like /pages/dashboard.html`)
}

if (section && !page.sections.some(({ id }) => id === section)) {
  fail(`${page.url} has no example \`${section}\`. Pick one of: ${page.sections.map(({ id }) => id).join(', ')}`)
}

const rows = themes.flatMap(theme => dirs.map(dir => ({ theme, dir })))
const reportDir = path.join(root, 'reports/page-matrix')
fs.mkdirSync(reportDir, { recursive: true })
const output = path.join(reportDir, `${path.basename(page.url, '.html') || 'index'}${section ? `--${section}` : ''}.png`)

const server = await createServer({ root, logLevel: 'silent', server: { port: 5192 } })
await server.listen()
const base = server.resolvedUrls.local[0].replace(/\/$/, '')

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, timezoneId: 'UTC', locale: 'en-US' })
await context.route(request => request.origin !== new URL(base).origin, route =>
  route.request().resourceType() === 'image' ?
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }) :
    route.continue())

const shotPage = await context.newPage()
const canvasPage = await browser.newPage({ viewport: { width: 1280, height: 100 }, deviceScaleFactor: 1 })

async function screenshot(config, { theme, dir }) {
  const url = new URL(`${base}${page.url}`)
  url.search = new URLSearchParams({ config, theme, dir, embed: '', chrome: '0', freeze: '', ...(section ? { section, frame: '0' } : {}) })
  await shotPage.goto(url.href)
  await shotPage.waitForFunction(() => !document.getElementById('playground-config-pending'))
  await shotPage.evaluate(() => document.fonts.ready)
  // An example is clipped to its own height, across the whole viewport width,
  // so every cell of a column has the same width and shows the page's background.
  const box = section ? await shotPage.locator(`.bd-kitchen-sink-section[aria-labelledby="${section}"]`).boundingBox() : null
  const shot = await shotPage.screenshot({
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
    ...(box ? { clip: { x: 0, y: box.y, width, height: box.height } } : {})
  })
  return `data:image/png;base64,${shot.toString('base64')}`
}

const cells = []
try {
  for (const row of rows) {
    const shots = []
    for (const config of configs) {
      if (process.stdout.isTTY) {
        process.stdout.write(`\r${row.theme} · ${row.dir} · ${config}`.padEnd(60))
      }

      shots.push(await screenshot(config, row))
    }

    for (const [index, config] of configs.entries()) {
      const diff = index > 0 ? await canvasPage.evaluate(compareImages, [shots[0], shots[index], false]) : null
      cells.push({ row, config, image: shots[index], diff })
    }
  }

  if (process.stdout.isTTY) {
    process.stdout.write(`\r${' '.repeat(60)}\r`)
  }

  // The grid, drawn as HTML and screenshotted.
  const escapeHtml = value => String(value).replace(/[&<>"]/g, char => `&#${char.charCodeAt(0)};`)
  const percent = ratio => `${(ratio * 100).toFixed(ratio < .001 && ratio > 0 ? 3 : 1)}%`
  const cellHtml = ({ image, diff }) => {
    const showsDiff = showDiff && diff
    const src = showsDiff ? `data:image/png;base64,${diff.image}` : image
    return `<figure>
      <div class="frame"><img src="${src}" alt=""${showsDiff ? ' class="diff"' : ''}></div>
      <figcaption>${diff ? `${percent(diff.ratio)} of the pixels differ from the first column${diff.resized ? ', another size' : ''}` : 'Reference'}</figcaption>
    </figure>`
  }

  await canvasPage.setContent(`<!doctype html>
    <style>
      body { margin: 0; padding: 16px; font: 13px/1.4 system-ui, sans-serif; color: #212529; background: #fff; }
      h1 { margin: 0 0 12px; font-size: 16px; }
      .grid { display: grid; grid-template-columns: auto repeat(${configs.length}, ${width}px); gap: 12px; align-items: start; inline-size: max-content; }
      .head { font-weight: 600; }
      .row-head { font-weight: 600; white-space: nowrap; }
      figure { margin: 0; }
      .frame { inline-size: ${width}px; overflow: hidden; outline: 1px solid #dee2e6; }
      img { display: block; }
      img.diff { inline-size: ${(width * 3) + 16}px; margin-inline-start: -${(width * 2) + 16}px; }
      figcaption { margin-block-start: 4px; color: #6c757d; }
    </style>
    <h1>${escapeHtml(page.title)}${section ? ` · ${escapeHtml(page.sections.find(({ id }) => id === section).title)}` : ''} (${escapeHtml(page.url)})</h1>
    <div class="grid">
      <div></div>
      ${configs.map(config => `<div class="head">${escapeHtml(config)}</div>`).join('')}
      ${rows.map(row => `<div class="row-head">${row.theme} · ${row.dir}</div>
        ${cells.filter(cell => cell.row === row).map(cellHtml).join('')}`).join('')}
    </div>`)
  await canvasPage.evaluate(() => Promise.all([...document.images].map(image => image.decode())))
  await canvasPage.screenshot({ path: output, fullPage: true })

  console.log(`${page.url}${section ? `#${section}` : ''}, ${configs.length} configs × ${rows.length} rows\n`)
  for (const row of rows) {
    const diffs = cells.filter(cell => cell.row === row && cell.diff)
    console.log(`  ${row.theme} · ${row.dir}: ${diffs.map(({ config, diff }) => `${config} ${percent(diff.ratio)}`).join(', ') || 'one column only'}`)
  }

  console.log(`\nWrote ${path.relative(root, output)}`)
} finally {
  await browser.close()
  await server.close()
}
