// `npm run audit-rtl -- --render`: screenshots every kitchen sink example in
// LTR and in RTL, mirrors the RTL screenshot and compares it with the LTR one.
// Bootstrap has no RTL stylesheet, so a docs example should render as the
// mirror image of itself: what differs is a physical property that doesn't
// flip (a chevron on the wrong side, a divider on the outer edge…).
//
// Text is made transparent first, since glyphs don't mirror. Latin text in an
// RTL page keeps its width, so only the boxes around it count. Icons drawn
// with `currentColor` disappear with it; other images (a check mark, a
// directional SVG) can still differ on purpose, so read the list as leads,
// most different first, rather than as a verdict.
//
// Writes reports/rtl/render.md, and for each example that differs an image
// with the LTR screenshot, the mirrored RTL one and their difference.
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'
import { root } from './configs.mjs'
import { collectPages } from './pages.mjs'

// Differing pixels from which an example is listed: a count, not a share,
// since a 1px divider on the wrong edge of a wide example is a real bug.
// `--min-pixels=1` lists every example with any difference.
const MIN_PIXELS = Number(process.argv.find(arg => arg.startsWith('--min-pixels='))?.slice('--min-pixels='.length) ?? 10)

// Same stand-in as the visual suite, for remote images.
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
  <rect width="256" height="256" fill="#6f42c1"/><circle cx="128" cy="100" r="48" fill="#e9d8fd"/>
  <rect x="48" y="164" width="160" height="92" rx="46" fill="#e9d8fd"/></svg>`

const HIDE_TEXT = `
  *, *::before, *::after {
    color: transparent !important;
    -webkit-text-fill-color: transparent !important;
    text-shadow: none !important;
    caret-color: transparent !important;
  }
  ::placeholder { color: transparent !important; }
  svg text { fill: transparent !important; stroke: transparent !important; }
`

// Runs in the browser. Mirrors `rtl`, compares it with `ltr` pixel by pixel
// and draws the three side by side. A pixel only counts as different when no
// pixel within 1px in the other image is close to it, so anti-aliasing on a
// border that lands half a pixel away doesn't count.
async function compare([ltr, rtl]) {
  const load = src => new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
  const [a, b] = await Promise.all([load(ltr), load(rtl)])
  const width = Math.max(a.width, b.width)
  const height = Math.max(a.height, b.height)

  const pixels = (image, mirror) => {
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')
    if (mirror) {
      context.translate(width, 0)
      context.scale(-1, 1)
    }

    context.drawImage(image, 0, 0)
    return context.getImageData(0, 0, width, height).data
  }

  const left = pixels(a, false)
  const right = pixels(b, true)
  const TOLERANCE = 48
  const close = (x, y, data, i) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          continue
        }

        const j = ((ny * width) + nx) * 4
        if (Math.abs(data[j] - left[i]) <= TOLERANCE && Math.abs(data[j + 1] - left[i + 1]) <= TOLERANCE && Math.abs(data[j + 2] - left[i + 2]) <= TOLERANCE) {
          return true
        }
      }
    }

    return false
  }

  const canvas = new OffscreenCanvas((width * 3) + 16, height)
  const context = canvas.getContext('2d')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(a, 0, 0)
  context.putImageData(new ImageData(right, width, height), width + 8, 0)
  const diff = context.createImageData(width, height)

  let different = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = ((y * width) + x) * 4
      const differs = !close(x, y, right, i)
      if (differs) {
        different++
      }

      // Faded LTR screenshot, differences in magenta.
      const gray = 255 - ((255 - ((left[i] + left[i + 1] + left[i + 2]) / 3)) * 0.2)
      diff.data.set(differs ? [255, 0, 255, 255] : [gray, gray, gray, 255], i)
    }
  }

  context.putImageData(diff, (width * 2) + 16, 0)
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  const image = await new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.readAsDataURL(blob)
  })

  return { ratio: different / (width * height), pixels: different, resized: a.width !== b.width || a.height !== b.height, image }
}

export async function renderRtl() {
  const kitchenSink = collectPages('/').find(({ dir }) => dir === 'kitchen-sink').pages
  const filter = process.argv.find(arg => arg.startsWith('--page='))?.slice('--page='.length)
  const pages = kitchenSink.filter(({ url }) => !filter || url.includes(filter))

  const reportDir = path.join(root, 'reports/rtl')
  fs.rmSync(reportDir, { recursive: true, force: true })
  fs.mkdirSync(path.join(reportDir, 'images'), { recursive: true })

  const server = await createServer({ root, logLevel: 'silent', server: { port: 5191 } })
  await server.listen()
  const base = server.resolvedUrls.local[0].replace(/\/$/, '')

  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, timezoneId: 'UTC', locale: 'en-US' })
  await context.route(target => target.origin !== new URL(base).origin, route =>
    route.request().resourceType() === 'image' ?
      route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }) :
      route.continue())

  const [ltrPage, rtlPage, canvasPage] = await Promise.all([context.newPage(), context.newPage(), context.newPage()])
  const results = []

  try {
    for (const [index, { url, title, sections }] of pages.entries()) {
      if (process.stdout.isTTY) {
        process.stdout.write(`\r[${index + 1}/${pages.length}] ${url}`.padEnd(80))
      }

      await Promise.all([['ltr', ltrPage], ['rtl', rtlPage]].map(async ([dir, page]) => {
        await page.goto(`${base}${url}?config=default&chrome=0&freeze&theme=light&dir=${dir}`)
        await page.waitForFunction(() => !document.getElementById('playground-config-pending'))
        await page.evaluate(() => document.fonts.ready)
        await page.addStyleTag({ content: HIDE_TEXT })
      }))

      for (const { id, title: example } of sections) {
        const selector = `.bd-kitchen-sink-section[aria-labelledby="${id}"]`
        const shots = await Promise.all([ltrPage, rtlPage].map(async page => {
          const section = page.locator(selector)
          return (await section.count()) && (await section.isVisible()) ?
            (await section.screenshot({ animations: 'disabled', caret: 'hide', scale: 'css' })).toString('base64') :
            null
        }))
        if (shots.includes(null)) {
          continue
        }

        const result = await canvasPage.evaluate(compare, shots.map(shot => `data:image/png;base64,${shot}`))
        const name = `${path.basename(url, '.html')}--${id}`
        if (result.pixels >= MIN_PIXELS) {
          fs.writeFileSync(path.join(reportDir, 'images', `${name}.png`), Buffer.from(result.image, 'base64'))
        }

        results.push({ url, page: title, id, example, name, ratio: result.ratio, pixels: result.pixels, resized: result.resized })
      }
    }
  } finally {
    if (process.stdout.isTTY) {
      process.stdout.write('\r'.padEnd(81) + '\r')
    }

    await browser.close()
    await server.close()
  }

  const listed = results.filter(({ pixels }) => pixels >= MIN_PIXELS).sort((a, b) => b.pixels - a.pixels)
  const percent = ratio => `${(ratio * 100).toFixed(2)}%`
  const reportFile = path.join(reportDir, 'render.md')
  fs.writeFileSync(reportFile, [
    '# Kitchen sink: LTR against mirrored RTL',
    '',
    `${results.length} examples compared. ${listed.length} differ by at least ${MIN_PIXELS} pixels. Text is hidden, since glyphs don't mirror.`,
    '',
    'Each image shows the LTR screenshot, the mirrored RTL one and their difference in magenta. A difference is a lead: some images (a check mark, a directional icon) are meant not to mirror.',
    '',
    '| Example | Pixels | Share | Image |',
    '| --- | --- | --- | --- |',
    ...listed.map(({ url, id, page, example, name, pixels, ratio, resized }) =>
      `| [${page}: ${example}](${url}?dir=rtl#${id}) | ${pixels}${resized ? ' (size differs)' : ''} | ${percent(ratio)} | [${name}.png](images/${name}.png) |`),
    ''
  ].join('\n'))

  console.log(`${results.length} kitchen sink examples compared, ${listed.length} differ from their mirror image:`)
  for (const { url, id, pixels, resized } of listed) {
    console.log(`  ${String(pixels).padStart(7)} px  ${url}#${id}${resized ? '  (size differs)' : ''}`)
  }

  console.log(`\nFull report: ${path.relative(root, reportFile)}`)
  return 0
}
