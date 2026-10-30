// Fixed when, in RTL, the gap that `.popover-header::before` cuts in the
// header's border sits under the bottom arrow: its center is within 1px of the
// arrow's center. `getBoundingClientRect()` can't measure a pseudo-element, so
// the gap's box comes from its computed `left`, margin, width, `translate` and
// `transform`, relative to the padding box of its containing block (the header,
// or the popover when the header isn't positioned), so any fix that centers it
// passes: `translate`, a physical margin, or logical insets.
export const environment = { viewport: { width: 1280, height: 600 } }

const opened = (button) => new Promise((resolve) => {
  const popover = window.bootstrap.Popover.getOrCreateInstance(button)
  const tip = () => document.querySelector('#repro .popover.show')
  if (tip()) {
    resolve(tip())
    return
  }

  button.addEventListener('shown.bs.popover', () => resolve(tip()), { once: true })
  popover.show()
})

export async function assert() {
  const button = document.querySelector('#repro [data-bs-toggle="popover"]')
  if (!button || !window.bootstrap?.Popover) {
    return { pass: null, details: 'the popover button or Bootstrap is missing' }
  }

  const tip = await Promise.race([opened(button), new Promise((resolve) => setTimeout(resolve, 3000))])
  const header = tip?.querySelector('.popover-header')
  const arrow = tip?.querySelector('.popover-arrow')
  if (!header || !arrow) {
    return { pass: null, details: 'the popover did not open with a header and an arrow' }
  }

  // Popper positions the arrow once the popover is placed.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

  if (tip.dataset.bsPlacement !== 'bottom' || getComputedStyle(tip).direction !== 'rtl') {
    return { pass: null, details: 'the popover is not a bottom popover in RTL here' }
  }

  const notch = getComputedStyle(header, '::before')
  const container = getComputedStyle(header).position === 'static' ? tip : header
  const box = container.getBoundingClientRect()
  const border = parseFloat(getComputedStyle(container).borderLeftWidth)
  const shift = (value) => (value === 'none' ? 0 : new DOMMatrix(value).m41)
  // `translate` keeps a percentage as written: it's a share of the gap's own width.
  const [x = '0'] = notch.translate === 'none' ? [] : notch.translate.split(' ')
  const translate = x.endsWith('%') ? (parseFloat(x) / 100) * parseFloat(notch.width) : parseFloat(x)
  const left = box.left + border + parseFloat(notch.left) + parseFloat(notch.marginLeft) + translate + shift(notch.transform)
  const notchCenter = left + (parseFloat(notch.width) / 2)
  const arrowBox = arrow.getBoundingClientRect()
  const arrowCenter = arrowBox.left + (arrowBox.width / 2)
  const offset = notchCenter - arrowCenter

  return {
    pass: Math.abs(offset) <= 1,
    details: `arrow center ${(arrowCenter - box.left).toFixed(1)}px, notch center ${(notchCenter - box.left).toFixed(1)}px from the header's left (${offset.toFixed(1)}px off)`
  }
}
