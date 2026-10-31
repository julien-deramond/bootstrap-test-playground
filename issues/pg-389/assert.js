// Fixed when, in light mode, the translucent menu's active item has a text
// contrast at least equal to the plain menu's, or at least 4.5:1. Never 4.5:1
// alone: the plain menu's active item is under it too (#183), and a check
// stricter than the upstream fix never passes. The translucent fill is
// composited over the page background (--bs-bg-body) to get what is seen.
export const environment = { viewport: { width: 1280, height: 800 }, colorScheme: 'light' }

const ready = () => new Promise(resolve => {
  const check = () => (window.bootstrap && document.readyState === 'complete' ? resolve() : setTimeout(check, 50))
  check()
})

// A 1x1 canvas resolves any CSS color, color-mix() included, and composites alpha.
const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
const paint = (css, over) => {
  context.clearRect(0, 0, 1, 1)
  if (!CSS.supports('color', css) || (over && !CSS.supports('color', over))) {throw new Error(`Unreadable color: ${css}`)}
  for (const color of over ? [over, css] : [css]) {
    context.fillStyle = color
    context.fillRect(0, 0, 1, 1)
  }

  const [r, g, b] = context.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}

const luminance = rgb => {
  const [r, g, b] = rgb.map(value => {
    const channel = value / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return (0.2126 * r) + (0.7152 * g) + (0.0722 * b)
}

const ratio = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

const hex = rgb => `#${rgb.map(value => value.toString(16).padStart(2, '0')).join('')}`

const contrastOf = menu => {
  const item = menu.querySelector('.menu-item.active')
  const style = getComputedStyle(item)
  // --bs-bg-body may be a light-dark() value: a probe resolves it to a color.
  const probe = document.createElement('div')
  probe.style.backgroundColor = 'var(--bs-bg-body)'
  menu.after(probe)
  const body = getComputedStyle(probe).backgroundColor
  probe.remove()
  const page = paint(body)
  const fill = paint(style.backgroundColor, body)
  const text = paint(style.color)
  return {
    ratio: ratio(text, fill), text: hex(text), fill: hex(fill), page: hex(page)
  }
}

export async function measure() {
  await ready()
  const translucent = contrastOf(document.getElementById('translucent'))
  const plain = contrastOf(document.getElementById('plain'))
  const format = (name, value) => `${name} ${value.text} on ${value.fill} (${value.ratio.toFixed(2)}:1)`
  return {
    translucent,
    plain,
    details: `${format('translucent', translucent)}; ${format('plain', plain)}`
  }
}

export async function assert() {
  const { translucent, plain, details } = await measure()
  // Round to 2 decimals as the reports do, so equal ratios compare equal.
  const round = value => Math.round(value * 100) / 100
  return { pass: round(translucent.ratio) >= round(plain.ratio) || translucent.ratio >= 4.5, details }
}
