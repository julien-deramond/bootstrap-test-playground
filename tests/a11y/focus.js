// Focuses the components of pages/focus.html one at a time and screenshots
// each one focused, for the ring check (focus.spec.js) and the visual suite
// (tests/visual/focus.spec.js). The page fills each surface
// ([data-focus-surface]) with components ([data-focus]) from its templates.
//
// The viewport grows to the whole page first, so nothing scrolls between the
// unfocused screenshot of a surface and the focused screenshots of its
// components, and each component's pixels line up in both.
import fs from 'node:fs'
import path from 'node:path'
import { root } from '../../scripts/lib/configs.mjs'

export const FOCUS_URL = '/pages/focus.html'

// Room around a component for its ring: `--focus-ring-width` and
// `--focus-ring-offset` are 3px and 1px by default. The page keeps 1rem
// between components, so a clip never reaches a neighbor.
const PADDING = 8

// The surfaces, in page order, from the page's markup, so tests can be listed
// before any page loads.
export const SURFACES = [...fs.readFileSync(path.join(root, FOCUS_URL), 'utf8').matchAll(/data-focus-surface="([^"]+)"/g)].map(([, name]) => name)

// The surface's rectangle, and its components' clips and the area their
// indicators must cover, focusing none of them. The area is the component's,
// or the sub-component's that its `data-focus-area` selector names, like the
// OTP input's first slot.
function layout([surface, padding]) {
  const round = ({ x, y, width, height }) => {
    const left = Math.floor(x)
    const top = Math.floor(y)
    return { x: left, y: top, width: Math.ceil(x + width) - left, height: Math.ceil(y + height) - top }
  }

  // The area of a 2px band along the inside of the component's edge, the
  // perimeter WCAG 2.4.13 measures, rounded corners included: 2px times the
  // edge's length, where each corner trades 2r of straight edge for a quarter
  // circle, less the band's overlap at the corners (4px² square, π px² round).
  const band = (element, { width, height }) => {
    const style = getComputedStyle(element)
    const corners = ['top-left', 'top-right', 'bottom-right', 'bottom-left'].map(corner => {
      const value = style.getPropertyValue(`border-${corner}-radius`).split(' ')[0]
      const radius = value.endsWith('%') ? Number.parseFloat(value) / 100 * width : Number.parseFloat(value) || 0
      return Math.min(radius, width / 2, height / 2)
    })
    const length = 2 * (width + height) + corners.reduce((sum, radius) => sum + radius * (Math.PI / 2 - 2), 0)
    const overlap = corners.reduce((sum, radius) => sum + 4 - (4 - Math.PI) * Math.min(radius, 2) / 2, 0)
    return Math.round(2 * length - overlap)
  }

  const container = document.querySelector(`[data-focus-surface="${surface}"]`)
  const rect = round(container.getBoundingClientRect())
  const items = [...container.querySelectorAll('[data-focus]')].map(component => {
    const box = component.getBoundingClientRect()
    const measured = component.dataset.focusArea ? component.querySelector(component.dataset.focusArea) : component
    const x = Math.max(rect.x, Math.floor(box.x - padding))
    const y = Math.max(rect.y, Math.floor(box.y - padding))
    return {
      name: component.dataset.focus,
      required: band(measured, measured.getBoundingClientRect()),
      clip: {
        x,
        y,
        width: Math.min(rect.x + rect.width, Math.ceil(box.right + padding)) - x,
        height: Math.min(rect.y + rect.height, Math.ceil(box.bottom + padding)) - y
      }
    }
  })

  return { rect, items }
}

// Focuses the surface's `index`th component: its [data-focus-target]
// descendant, the component itself when it's focusable, or else its first
// focusable descendant. Returns whether it then matches :focus-visible.
function focusComponent([surface, index]) {
  const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'
  const component = document.querySelectorAll(`[data-focus-surface="${surface}"] [data-focus]`)[index]
  const target = component.querySelector('[data-focus-target]') ?? (component.matches(FOCUSABLE) ? component : component.querySelector(FOCUSABLE))
  target.focus({ focusVisible: true })
  return document.activeElement === target && target.matches(':focus-visible')
}

// Screenshots the surface with nothing focused, then each component focused.
// `unfocused` covers `rect`, and each item's `focused` covers its `clip`.
export async function captureSurface(page, surface) {
  const width = page.viewportSize().width
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  if (page.viewportSize().height !== height) {
    await page.setViewportSize({ width, height })
  }

  // A key press puts the page in keyboard modality, where focus() shows rings.
  await page.keyboard.press('Shift')
  await page.evaluate(() => document.activeElement?.blur())

  const shot = clip => page.screenshot({ clip, animations: 'disabled', caret: 'hide', scale: 'css' })
  const { rect, items } = await page.evaluate(layout, [surface, PADDING])
  const unfocused = await shot(rect)

  for (const [index, item] of items.entries()) {
    item.focusVisible = await page.evaluate(focusComponent, [surface, index])
    item.focused = await shot(item.clip)
  }

  await page.evaluate(() => document.activeElement?.blur())
  return { rect, unfocused, items }
}

// Runs in the browser. Measures each component's focus indicator the way WCAG
// 2.4.13 does: the pixels whose focused and unfocused colors contrast at least
// 3:1 must cover at least a 2px band along the component's edge. `colors` is
// the most common change, focused color on unfocused color, and `contrast` its
// ratio.
export async function measureRings({ rect, unfocused, items }) {
  const load = async src => createImageBitmap(await (await fetch(src)).blob())
  const pixels = (image, { x, y, width, height }) => {
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.drawImage(image, x, y, width, height, 0, 0, width, height)
    return context.getImageData(0, 0, width, height).data
  }

  const channel = value => {
    const c = value / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }

  const luminance = (data, i) => 0.2126 * channel(data[i]) + 0.7152 * channel(data[i + 1]) + 0.0722 * channel(data[i + 2])
  const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  const hex = (data, i) => `#${[data[i], data[i + 1], data[i + 2]].map(value => value.toString(16).padStart(2, '0')).join('')}`

  const base = await load(`data:image/png;base64,${unfocused}`)
  return Promise.all(items.map(async ({ clip, required, focused }) => {
    const before = pixels(base, { ...clip, x: clip.x - rect.x, y: clip.y - rect.y })
    const after = pixels(await load(`data:image/png;base64,${focused}`), { x: 0, y: 0, width: clip.width, height: clip.height })
    const changes = new Map()
    for (let i = 0; i < after.length; i += 4) {
      const contrast = ratio(luminance(after, i), luminance(before, i))
      if (contrast > 1) {
        const key = `${hex(after, i)} on ${hex(before, i)}`
        changes.set(key, { count: (changes.get(key)?.count ?? 0) + 1, contrast, ring: after.slice(i, i + 3) })
      }
    }

    const [colors, { contrast, ring } = { contrast: 1 }] = [...changes].sort(([, a], [, b]) => b.count - a.count)[0] ?? []

    // A pixel at 3:1 counts in full. An anti-aliased edge of the indicator,
    // partly covered by its most common color, counts for the part covered
    // when that color contrasts 3:1 with what was there, so a 2px ring with
    // rounded corners covers its 2px perimeter. The part covered is read on
    // the channel that color changes most, since edges blend in sRGB.
    let covered = 0
    for (let i = 0; i < after.length; i += 4) {
      if (ratio(luminance(after, i), luminance(before, i)) >= 3) {
        covered++
      } else if (ring && ratio(luminance(ring, 0), luminance(before, i)) >= 3) {
        const channel = [0, 1, 2].reduce((best, c) => Math.abs(ring[c] - before[i + c]) > Math.abs(ring[best] - before[i + best]) ? c : best)
        covered += Math.min(1, Math.max(0, (after[i + channel] - before[i + channel]) / (ring[channel] - before[i + channel])))
      }
    }

    return { covered: Math.round(covered), required, colors, contrast: Math.round(contrast * 100) / 100 }
  }))
}

// Runs in the browser. Pastes the pixels each component changes when focused
// onto the unfocused surface, so one image shows every component focused.
// Returns it as a base64 PNG.
export async function compositeRings({ rect, unfocused, items }) {
  const load = async src => createImageBitmap(await (await fetch(src)).blob())
  const canvas = new OffscreenCanvas(rect.width, rect.height)
  const context = canvas.getContext('2d', { willReadFrequently: true })
  context.drawImage(await load(`data:image/png;base64,${unfocused}`), 0, 0)
  const base = context.getImageData(0, 0, rect.width, rect.height)
  const result = new ImageData(new Uint8ClampedArray(base.data), rect.width, rect.height)

  for (const { clip, focused } of items) {
    const scratch = new OffscreenCanvas(clip.width, clip.height).getContext('2d', { willReadFrequently: true })
    scratch.drawImage(await load(`data:image/png;base64,${focused}`), 0, 0)
    const after = scratch.getImageData(0, 0, clip.width, clip.height).data
    for (let y = 0; y < clip.height; y++) {
      for (let x = 0; x < clip.width; x++) {
        const from = (y * clip.width + x) * 4
        const to = ((clip.y - rect.y + y) * rect.width + clip.x - rect.x + x) * 4
        if (after[from] !== base.data[to] || after[from + 1] !== base.data[to + 1] || after[from + 2] !== base.data[to + 2]) {
          result.data.set(after.subarray(from, from + 4), to)
        }
      }
    }
  }

  context.putImageData(result, 0, 0)
  const bytes = new Uint8Array(await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer())
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

// The capture, with its images as base64 for the functions above.
export const toBase64 = ({ rect, unfocused, items }) => ({
  rect,
  unfocused: unfocused.toString('base64'),
  items: items.map(item => ({ ...item, focused: item.focused.toString('base64') }))
})
