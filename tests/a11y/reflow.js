// What reflow.spec.js runs in the page: finding what sticks out of the
// viewport, what cuts its content and which texts overlap, and injecting the
// styles of WCAG 1.4.12 (text spacing) and 1.4.4 (200% text). `install` runs
// once per load and puts everything on `window.playgroundReflow`, so the
// spec's `page.evaluate` calls share the helpers and the element references
// between a measurement before and after an injection.
export const REFLOW_WIDTH = 320
export const TEXT_WIDTH = 1280

// The four declarations of WCAG 1.4.12, as a user style sheet applies them.
export const TEXT_SPACING_CSS = `
  * { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; }
  p { margin-bottom: 2em !important; }
`
export const RESIZE_TEXT_CSS = 'html { font-size: 200% !important; }'

export function install() {
  const html = document.documentElement
  const style = element => getComputedStyle(element)
  const visible = element => element.checkVisibility()
  const clips = value => value === 'hidden' || value === 'clip'

  // The name a known-issues `target` matches: the nearest `id` (or the
  // section's `aria-labelledby`, which kitchen sink sections have on their
  // heading), then the element's tag and first classes:
  // `#with-icons svg.bi.flex-shrink-0`.
  const name = element => {
    let anchor = ''
    for (let node = element; node && node !== document.body; node = node.parentElement) {
      const id = node.id || node.getAttribute('aria-labelledby')?.split(' ')[0]
      if (id) {
        anchor = `#${id} `
        break
      }
    }

    return `${anchor}${element.localName}${[...element.classList].slice(0, 3).map(value => `.${value}`).join('')}`
  }

  // The outermost visible elements whose box passes the viewport's edge on the
  // side the page scrolls to, with the overflow in CSS pixels. What's inside a
  // scroll container can't widen the page, and a fixed element (a closed
  // drawer translated off screen) doesn't either. One exception: an absolutely
  // positioned element inside a scroll container that isn't positioned itself
  // (a `.visually-hidden` label in a scrolling table) is laid out against an
  // ancestor outside it, escapes its clipping and widens the page.
  const culprits = () => {
    const edge = html.clientWidth
    const rtl = style(html).direction === 'rtl'
    const found = []
    const walk = (element, clipper = null) => {
      if (!visible(element)) {
        return
      }

      const css = style(element)
      if (css.position === 'fixed') {
        return
      }

      const escapes = clipper && css.position === 'absolute' && !clipper.contains(element.offsetParent)
      const rect = element.getBoundingClientRect()
      const past = rtl ? -rect.left : rect.right - edge
      if (rect.width > 0 && past > 0.5 && (!clipper || escapes)) {
        found.push({ selector: name(element), summary: `${Math.round(past)}px past the ${rtl ? 'left' : 'right'} edge at ${edge}px wide${escapes ? ', positioned outside its scroll container' : ''}` })
        return
      }

      if (element.localName === 'svg' || (css.overflowX !== 'visible' && css.position !== 'static')) {
        return
      }

      if (css.overflowX !== 'visible') {
        for (const child of element.children) {
          walk(child, element)
        }

        return
      }

      if (clipper) {
        for (const child of element.children) {
          walk(child, clipper)
        }

        return
      }

      // A text run can pass the edge inside a box that doesn't (an unbreakable
      // word, `white-space: nowrap`): the box is the culprit then.
      const text = Math.max(0, ...[...element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE && node.data.trim()).flatMap(node => {
        const range = document.createRange()
        range.selectNodeContents(node)
        return [...range.getClientRects()].map(rect => rtl ? -rect.left : rect.right - edge)
      }))
      if (text > 0.5) {
        found.push({ selector: name(element), summary: `its text runs ${Math.round(text)}px past the ${rtl ? 'left' : 'right'} edge at ${edge}px wide` })
        return
      }

      for (const child of element.children) {
        walk(child)
      }
    }

    for (const child of document.body.children) {
      walk(child)
    }

    return { overflow: html.scrollWidth - html.clientWidth, found }
  }

  // Every visible text node of the page (SVG text is a drawing, not text to
  // space), with its line boxes (Range.getClientRects) and the nearest element
  // that clips or scrolls it, with that element's padding box.
  const textRuns = () => {
    const runs = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement
      if (!node.data.trim() || !element || element.namespaceURI !== 'http://www.w3.org/1999/xhtml' ||
        ['script', 'style', 'noscript', 'template', 'option'].includes(element.localName) ||
        !element.checkVisibility({ visibilityProperty: true, opacityProperty: true })) {
        continue
      }

      let container = null
      for (let ancestor = element; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
        const css = style(ancestor)
        if (css.overflowX !== 'visible' || css.overflowY !== 'visible') {
          const rect = ancestor.getBoundingClientRect()
          const left = rect.left + ancestor.clientLeft
          const top = rect.top + ancestor.clientTop
          container = {
            element: ancestor, css, left, top, right: left + ancestor.clientWidth, bottom: top + ancestor.clientHeight
          }
          break
        }
      }

      const range = document.createRange()
      range.selectNodeContents(node)
      runs.push({ element, rects: [...range.getClientRects()], container })
    }

    return runs
  }

  // The elements that cut text: `overflow` hidden or clip on an axis where a
  // text inside passes their padding box by more than 1px, with the most it
  // passes by. A scroll container reaches its text, so it doesn't count.
  const clipped = () => {
    const found = new Map()
    for (const { rects, container } of textRuns()) {
      if (!container) {
        continue
      }

      for (const rect of rects) {
        const x = clips(container.css.overflowX) ? Math.max(container.left - rect.left, rect.right - container.right) : 0
        const y = clips(container.css.overflowY) ? Math.max(container.top - rect.top, rect.bottom - container.bottom) : 0
        if (x > 1 || y > 1) {
          const cut = found.get(container.element) ?? { x: 0, y: 0 }
          found.set(container.element, { x: Math.max(cut.x, Math.round(x)), y: Math.max(cut.y, Math.round(y)) })
        }
      }
    }

    return found
  }

  // Every line box of text, cut to its clipping or scrolling container, so
  // text that's already cut or scrolled away can't overlap anything. Boxes of
  // 1px or less (.visually-hidden) are dropped.
  const textBoxes = () => {
    const boxes = []
    for (const { element, rects, container } of textRuns()) {
      for (const rect of rects) {
        const left = container ? Math.max(rect.left, container.left) : rect.left
        const top = container ? Math.max(rect.top, container.top) : rect.top
        const right = container ? Math.min(rect.right, container.right) : rect.right
        const bottom = container ? Math.min(rect.bottom, container.bottom) : rect.bottom
        if (right - left > 1 && bottom - top > 1) {
          boxes.push({
            element, left, top, right, bottom
          })
        }
      }
    }

    return boxes
  }

  // The pairs of elements whose text boxes intersect by more than 1px both
  // ways, when neither contains the other: a key per pair, in document order.
  const overlaps = () => {
    const boxes = textBoxes().sort((a, b) => a.top - b.top)
    const found = new Map()
    for (const [index, a] of boxes.entries()) {
      for (let next = index + 1; next < boxes.length && boxes[next].top < a.bottom - 1; next++) {
        const b = boxes[next]
        if (a.element === b.element || a.element.contains(b.element) || b.element.contains(a.element)) {
          continue
        }

        const width = Math.min(a.right, b.right) - Math.max(a.left, b.left)
        const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
        if (width > 1 && height > 1) {
          const [first, second] = a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? [a.element, b.element] : [b.element, a.element]
          const pairs = found.get(first) ?? new Map()
          pairs.set(second, { width: Math.round(width), height: Math.round(height) })
          found.set(first, pairs)
        }
      }
    }

    return found
  }

  // What the clipping and overlap checks compare: taken before an injection,
  // then again after it.
  const snapshot = () => ({ clipped: clipped(), overlaps: overlaps() })

  // What `after` has that `before` hadn't: the elements that now cut their
  // content, and the pairs of texts that now overlap.
  const diff = (before, after) => ({
    clipped: [...after.clipped].filter(([element]) => !before.clipped.has(element))
      .map(([element, { x, y }]) => ({ selector: name(element), summary: `cuts its text by ${[x > 1 && `${x}px wide`, y > 1 && `${y}px tall`].filter(Boolean).join(' and ')}` })),
    overlaps: [...after.overlaps].flatMap(([first, pairs]) => [...pairs].filter(([second]) => !before.overlaps.get(first)?.has(second))
      .map(([second, { width, height }]) => ({ selector: name(first), summary: `overlaps ${name(second)} by ${width}×${height}px` })))
  })

  const inject = css => {
    const sheet = document.createElement('style')
    sheet.dataset.playgroundReflow = ''
    sheet.textContent = css
    document.head.append(sheet)
  }

  const eject = () => {
    for (const sheet of document.querySelectorAll('style[data-playground-reflow]')) {
      sheet.remove()
    }
  }

  // The elements with text whose computed spacing isn't what TEXT_SPACING_CSS
  // asked: a layered `!important` beats an unlayered one, so a Bootstrap rule
  // could silently undo the injection one day.
  const spacingMisses = () => {
    const close = (actual, expected) => Math.abs(Number.parseFloat(actual) - expected) <= 0.6
    const misses = []
    const seen = new Set()
    for (const { element } of textBoxes()) {
      if (seen.has(element)) {
        continue
      }

      seen.add(element)
      const css = style(element)
      const size = Number.parseFloat(css.fontSize)
      const wrong = [
        !close(css.lineHeight, size * 1.5) && `line-height ${css.lineHeight}`,
        !close(css.letterSpacing, size * 0.12) && `letter-spacing ${css.letterSpacing}`,
        !close(css.wordSpacing, size * 0.16) && `word-spacing ${css.wordSpacing}`,
        element.localName === 'p' && !close(css.marginBottom, size * 2) && `margin-bottom ${css.marginBottom}`
      ].filter(Boolean)
      if (wrong.length) {
        misses.push(`${name(element)}: ${wrong.join(', ')}`)
      }
    }

    return misses
  }

  const fontSize = () => Number.parseFloat(style(html).fontSize)

  window.playgroundReflow = {
    culprits, snapshot, diff, inject, eject, spacingMisses, fontSize
  }
}
