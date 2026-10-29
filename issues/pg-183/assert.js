// Fixed when every default solid fill (a theme's `contrast` text on its `bg`)
// and every theme `fg` text on `--bg-body`, in light and dark mode, reaches the
// WCAG AA 4.5:1 for normal text. Only the pairings of the tracking issue are
// measured: a stricter check would never pass after an upstream fix.
const THEMES = ['primary', 'accent', 'success', 'danger', 'warning', 'info', 'inverse', 'secondary']
const MODES = ['light', 'dark']
const AA = 4.5

// A CSS color as sRGB channels (0-255), through a canvas, which resolves any
// syntax (oklch(), color-mix()…) and clips it to sRGB.
const canvas = document.createElement('canvas')
canvas.width = canvas.height = 1
const context = canvas.getContext('2d', { willReadFrequently: true })
const toRgb = color => {
  context.clearRect(0, 0, 1, 1)
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)]
}

const channel = value => {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
const ratio = (a, b) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

export async function assert() {
  // Probes live in their own wrappers, so the result doesn't depend on whether
  // the dark panel of the page is shown.
  const probes = document.createElement('div')
  probes.style.cssText = 'position: absolute; visibility: hidden; pointer-events: none'
  document.body.append(probes)

  const results = []
  for (const mode of MODES) {
    const wrapper = document.createElement('div')
    wrapper.dataset.bsTheme = mode
    wrapper.className = 'bg-body'
    probes.append(wrapper)

    for (const theme of THEMES) {
      const solid = document.createElement('button')
      solid.type = 'button'
      solid.className = `btn-solid theme-${theme}`
      const text = document.createElement('span')
      text.className = `fg-${theme}`
      wrapper.append(solid, text)

      const fill = getComputedStyle(solid)
      results.push({
        label: `${theme} contrast on bg, ${mode}`,
        ratio: ratio(toRgb(fill.color), toRgb(fill.backgroundColor))
      })
      results.push({
        label: `${theme} fg on bg-body, ${mode}`,
        ratio: ratio(toRgb(getComputedStyle(text).color), toRgb(getComputedStyle(wrapper).backgroundColor))
      })
    }
  }

  probes.remove()

  const failing = results.filter(({ ratio: value }) => value < AA)
  const pass = failing.length === 0
  const list = failing.map(({ label, ratio: value }) => `${label} ${value.toFixed(2)}`)
  return {
    pass,
    details: pass ? `all ${results.length} pairings reach ${AA}:1` : `${failing.length} of ${results.length} under ${AA}:1: ${list.join('; ')}`
  }
}
