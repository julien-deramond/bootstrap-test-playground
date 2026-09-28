#!/usr/bin/env node
// Shows what changed between two Bootstrap commits.
// Usage: npm run diff-bootstrap -- <from> <to> [--no-screens] [--page=<filter>] [--serve]
//   <from> and <to> are commits (full or short), branches or tags of
//   twbs/bootstrap, like `npm run diff-bootstrap -- 624c7b9 v6-dev`.
//
// `--serve` skips the report: it serves the playground with <from> and, under
// /b/, with <to>, from one origin, so the compare view can put one commit in
// each pane. It prints the compare URL and runs until stopped.
//
// Fetches each commit into .cache/bootstrap/<sha>/ (shallow, reused on later
// runs), then compares:
//   - the upstream commits between them
//   - the default config's compiled CSS, normalized like check-dist, as a diff
//   - its `--bs-*` tokens: added, removed, and changed values
//   - the sizes check-size measures
//   - every kitchen sink example: screenshotted on a dev server per commit and
//     compared pixel by pixel (skip with --no-screens, narrow with --page=)
// Writes reports/diff/<from>-<to>/index.html, a browsable report, and
// summary.md, which the nightly canary adds to its pull request.

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import postcss from 'postcss'
import { createServer } from 'vite'
import { compileConfig } from './lib/compile.mjs'
import { root } from './lib/configs.mjs'
import { compareImages } from './lib/image-diff.mjs'
import { normalizeCss } from './lib/normalize-css.mjs'
import { collectPages } from './lib/pages.mjs'
import { measureSizes } from './lib/sizes.mjs'
import { fetchCommit, resolveRef, upstreamCommits } from './lib/upstream.mjs'

const [fromRef, toRef] = process.argv.slice(2).filter(arg => !arg.startsWith('--'))
if (!fromRef || !toRef) {
  console.error('Usage: npm run diff-bootstrap -- <from> <to> [--no-screens] [--page=<filter>]')
  process.exit(1)
}

const screens = !process.argv.includes('--no-screens')
const serve = process.argv.includes('--serve')
const pageFilter = process.argv.find(arg => arg.startsWith('--page='))?.slice('--page='.length)
const MIN_PIXELS = 10
const quiet = { warn() {}, debug() {} }
const run = (command, args, options = {}) => spawnSync(command, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...options })

const from = resolveRef(fromRef)
const to = resolveRef(toRef)
const short = sha => sha.slice(0, 7)
console.log(`Comparing ${short(from)} (${fromRef}) with ${short(to)} (${toRef})`)

const dirs = { from: fetchCommit(from), to: fetchCommit(to) }

// --- --serve: both commits in the compare view --------------------------------

if (serve) {
  const watch = { ignored: ['**/.cache/**'] }
  // vite.config.js reads BOOTSTRAP_PATH when a server is created. <to> goes
  // under /b/, and <from>'s server proxies /b/ to it, so both share an origin:
  // the compare view reads its panes and syncs their scrolling.
  process.env.BOOTSTRAP_PATH = dirs.to
  const b = await createServer({ root, base: '/b/', logLevel: 'warn', server: { port: 5199, strictPort: true, watch } })
  await b.listen()

  process.env.BOOTSTRAP_PATH = dirs.from
  // `bd0a4f6`, or `bd0a4f6 (v6-dev)` for a branch or a tag.
  const label = (sha, ref) => (/^[\da-f]{7,40}$/.test(ref) ? short(sha) : `${short(sha)} (${ref})`)
  process.env.VITE_BOOTSTRAP_A = label(from, fromRef)
  process.env.VITE_BOOTSTRAP_B = label(to, toRef)
  const a = await createServer({ root, logLevel: 'warn', server: { port: 5198, strictPort: true, watch, proxy: { '/b/': { target: 'http://localhost:5199', ws: true } } } })
  await a.listen()

  const params = new URLSearchParams({ page: '/kitchen-sink/components-button.html', a: 'bootstrap=a', b: 'bootstrap=b' })
  console.log(`\nA: ${short(from)} at http://localhost:5198/`)
  console.log(`B: ${short(to)} at http://localhost:5198/b/`)
  console.log(`Compare: http://localhost:5198/compare.html?${params}`)
  console.log('Stop with Ctrl+C.')
  await new Promise(() => {})
}
const reportDir = path.join(root, 'reports/diff', `${short(from)}-${short(to)}`)
fs.rmSync(reportDir, { recursive: true, force: true })
fs.mkdirSync(path.join(reportDir, 'images'), { recursive: true })

const commits = upstreamCommits(from, to)

// --- CSS and tokens ---------------------------------------------------------

const css = {}
for (const side of ['from', 'to']) {
  const { css: compiled } = await compileConfig(path.join(root, 'configs/default/main.scss'), { bootstrapDir: dirs[side], logger: quiet })
  css[side] = compiled
  fs.writeFileSync(path.join(reportDir, `${side}.css`), normalizeCss(compiled))
}

const diff = run('git', ['diff', '--no-index', '--no-color', '-U3', '--', 'from.css', 'to.css'], { cwd: reportDir }).stdout
fs.writeFileSync(path.join(reportDir, 'default-css.diff'), diff)
const added = diff.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++')).length
const removed = diff.split('\n').filter(line => line.startsWith('-') && !line.startsWith('---')).length

// `selector › --bs-name` → value, for every custom property.
function tokens(source) {
  const map = new Map()
  postcss.parse(source).walkDecls(/^--bs-/, decl => {
    const selector = decl.parent.type === 'rule' ? decl.parent.selector.replace(/\s+/g, ' ') : `@${decl.parent.name}`
    map.set(`${decl.prop} on ${selector}`, decl.value.replace(/\s+/g, ' '))
  })
  return map
}

const before = tokens(css.from)
const after = tokens(css.to)
const tokenChanges = {
  added: [...after.keys()].filter(key => !before.has(key)).map(key => ({ key, value: after.get(key) })),
  removed: [...before.keys()].filter(key => !after.has(key)).map(key => ({ key, value: before.get(key) })),
  changed: [...after.keys()].filter(key => before.has(key) && before.get(key) !== after.get(key)).map(key => ({ key, from: before.get(key), to: after.get(key) }))
}

// --- Sizes ------------------------------------------------------------------

const sizes = { from: await measureSizes(dirs.from), to: await measureSizes(dirs.to) }
const kb = bytes => `${(bytes / 1024).toFixed(1)} KB`
const change = (now, then) => {
  if (then === undefined) {
    return 'new'
  }

  const diffBytes = now - then
  const sign = diffBytes > 0 ? '+' : '−'
  return diffBytes === 0 ? '±0' : `${sign}${kb(Math.abs(diffBytes))} (${sign}${Math.abs((diffBytes / then) * 100).toFixed(1)}%)`
}

const sizeRows = Object.keys(sizes.to).map(file => ({
  file,
  min: `${kb(sizes.to[file].min)} ${change(sizes.to[file].min, sizes.from[file]?.min)}`,
  brotli: `${kb(sizes.to[file].brotli)} ${change(sizes.to[file].brotli, sizes.from[file]?.brotli)}`
}))

// --- Screenshots --------------------------------------------------------------

const shots = []
if (screens) {
  const pages = collectPages('/').find(({ dir }) => dir === 'kitchen-sink').pages.filter(({ url }) => !pageFilter || url.includes(pageFilter))
  const servers = {}
  // vite.config.js reads BOOTSTRAP_PATH when a server is created.
  for (const [side, port] of [['from', 5196], ['to', 5197]]) {
    process.env.BOOTSTRAP_PATH = dirs[side]
    servers[side] = await createServer({ root, logLevel: 'silent', server: { port, strictPort: true, watch: { ignored: ['**/.cache/**'] } } })
    await servers[side].listen()
  }

  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, timezoneId: 'UTC', locale: 'en-US' })
  const origins = Object.values(servers).map(server => new URL(server.resolvedUrls.local[0]).origin)
  await context.route(target => !origins.includes(target.origin), route => route.abort())
  const views = { from: await context.newPage(), to: await context.newPage() }
  const canvas = await context.newPage()

  try {
    for (const [index, { url, title, sections }] of pages.entries()) {
      if (process.stdout.isTTY) {
        process.stdout.write(`\r[${index + 1}/${pages.length}] ${url}`.padEnd(80))
      }

      await Promise.all(Object.entries(views).map(async ([side, page]) => {
        await page.goto(`${servers[side].resolvedUrls.local[0].replace(/\/$/, '')}${url}?config=default&chrome=0&freeze&theme=light`)
        await page.waitForFunction(() => !document.getElementById('playground-config-pending') && window.bootstrap)
        await page.evaluate(() => document.fonts.ready)
      }))

      for (const { id, title: example } of sections) {
        const selector = `.bd-kitchen-sink-section[aria-labelledby="${id}"]`
        const images = await Promise.all(Object.values(views).map(async page => {
          const section = page.locator(selector)
          return (await section.count()) && (await section.isVisible()) ? (await section.screenshot({ animations: 'disabled', caret: 'hide', scale: 'css' })).toString('base64') : null
        }))
        if (images.includes(null)) {
          continue
        }

        const result = await canvas.evaluate(compareImages, [...images.map(image => `data:image/png;base64,${image}`), false])
        if (result.pixels >= MIN_PIXELS) {
          const name = `${path.basename(url, '.html')}--${id}`
          fs.writeFileSync(path.join(reportDir, 'images', `${name}.png`), Buffer.from(result.image, 'base64'))
          shots.push({ url, page: title, id, example, name, pixels: result.pixels, resized: result.resized })
        }
      }
    }
  } finally {
    if (process.stdout.isTTY) {
      process.stdout.write('\r'.padEnd(81) + '\r')
    }

    await browser.close()
    await Promise.all(Object.values(servers).map(server => server.close()))
  }

  shots.sort((a, b) => b.pixels - a.pixels)
}

// --- Report -----------------------------------------------------------------

const escapeHtml = value => String(value).replace(/[&<>"]/g, char => `&#${char.charCodeAt(0)};`)
const commitUrl = sha => `https://github.com/twbs/bootstrap/commit/${sha}`
const rangeUrl = `https://github.com/twbs/bootstrap/compare/${from}...${to}`
const tokenCount = tokenChanges.added.length + tokenChanges.removed.length + tokenChanges.changed.length
const list = (items, render) => (items.length ? `<ul>${items.map(item => `<li>${render(item)}</li>`).join('')}</ul>` : '<p>None.</p>')

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bootstrap ${short(from)}…${short(to)}</title>
<style>
  body { max-width: 1200px; margin: 2rem auto; padding: 0 1rem; font: 15px/1.5 system-ui, sans-serif; color: #1f2328; }
  h1 { font-size: 1.6rem; } h2 { margin-top: 2.5rem; border-bottom: 1px solid #d0d7de; padding-bottom: .3rem; }
  code, pre { font: 13px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; }
  pre { overflow: auto; max-height: 40rem; padding: 1rem; background: #f6f8fa; border-radius: 6px; }
  table { border-collapse: collapse; } td, th { padding: .3rem .8rem; border-bottom: 1px solid #d0d7de; text-align: left; }
  .add { color: #1a7f37; } .del { color: #cf222e; }
  figure { margin: 1.5rem 0; } figure img { max-width: 100%; border: 1px solid #d0d7de; }
  figcaption { font-weight: 600; margin-bottom: .3rem; }
</style>
</head>
<body>
<h1>Bootstrap <a href="${commitUrl(from)}"><code>${short(from)}</code></a> → <a href="${commitUrl(to)}"><code>${short(to)}</code></a></h1>
<p>${commits ? `${commits.length} upstream commits` : `<a href="${rangeUrl}">Upstream commits</a>`} · CSS diff <span class="add">+${added}</span> <span class="del">−${removed}</span> lines · ${tokenCount} token changes · ${screens ? `${shots.length} kitchen sink examples render differently` : 'screenshots skipped'}</p>

<h2>Upstream commits</h2>
${commits ? list(commits, ({ sha, subject }) => `<a href="${commitUrl(sha)}"><code>${short(sha)}</code></a> ${escapeHtml(subject)}`) : `<p><a href="${rangeUrl}">${rangeUrl}</a></p>`}

<h2>Sizes</h2>
<table><thead><tr><th>File</th><th>Minified</th><th>Brotli</th></tr></thead><tbody>
${sizeRows.map(row => `<tr><td><code>${row.file}</code></td><td>${row.min}</td><td>${row.brotli}</td></tr>`).join('\n')}
</tbody></table>

<h2>Tokens (configs/default)</h2>
<details${tokenCount && tokenCount < 50 ? ' open' : ''}><summary>${tokenChanges.added.length} added, ${tokenChanges.removed.length} removed, ${tokenChanges.changed.length} changed</summary>
<h3>Added</h3>${list(tokenChanges.added, ({ key, value }) => `<code>${escapeHtml(key)}</code>: <code>${escapeHtml(value)}</code>`)}
<h3>Removed</h3>${list(tokenChanges.removed, ({ key, value }) => `<code>${escapeHtml(key)}</code>: <code>${escapeHtml(value)}</code>`)}
<h3>Changed</h3>${list(tokenChanges.changed, ({ key, from: then, to: now }) => `<code>${escapeHtml(key)}</code>: <code class="del">${escapeHtml(then)}</code> → <code class="add">${escapeHtml(now)}</code>`)}
</details>

<h2>CSS (configs/default, normalized)</h2>
<p><a href="default-css.diff">default-css.diff</a> · <a href="from.css">from.css</a> · <a href="to.css">to.css</a></p>
${diff ? `<pre>${escapeHtml(diff.split('\n').slice(0, 800).join('\n'))}${diff.split('\n').length > 800 ? '\n…' : ''}</pre>` : '<p>Identical.</p>'}

<h2>Kitchen sink</h2>
${screens ? (shots.length ? `<p>Each image: ${short(from)}, ${short(to)}, and their difference in magenta.</p>${shots.map(shot => `<figure><figcaption>${escapeHtml(shot.page)}: ${escapeHtml(shot.example)} · ${shot.pixels} px${shot.resized ? ' (size differs)' : ''}</figcaption><img src="images/${shot.name}.png" alt="" loading="lazy"></figure>`).join('\n')}` : '<p>Every example renders the same.</p>') : '<p>Skipped (<code>--no-screens</code>).</p>'}
</body>
</html>
`
fs.writeFileSync(path.join(reportDir, 'index.html'), html)

const summary = [
  `**Diff \`${short(from)}\` → \`${short(to)}\`:** CSS diff +${added} −${removed} lines, ${tokenCount} token changes, ${screens ? `${shots.length} kitchen sink examples render differently` : 'screenshots skipped'}.`,
  ...(shots.length ? ['', 'Most changed examples:', ...shots.slice(0, 10).map(shot => `- ${shot.page}: ${shot.example} (${shot.pixels} px)`)] : [])
].join('\n')
fs.writeFileSync(path.join(reportDir, 'summary.md'), `${summary}\n`)

console.log(`\n${commits ? `${commits.length} upstream commits. ` : ''}CSS diff +${added} −${removed} lines. Tokens: ${tokenChanges.added.length} added, ${tokenChanges.removed.length} removed, ${tokenChanges.changed.length} changed.`)
for (const row of sizeRows.filter(row => !row.brotli.endsWith('±0'))) {
  console.log(`  ${row.file}: ${row.brotli} brotli`)
}

if (screens) {
  console.log(`${shots.length} kitchen sink examples render differently${shots.length ? ':' : '.'}`)
  for (const shot of shots.slice(0, 15)) {
    console.log(`  ${String(shot.pixels).padStart(7)} px  ${shot.url}#${shot.id}`)
  }
}

console.log(`\nReport: ${path.relative(root, path.join(reportDir, 'index.html'))}`)
