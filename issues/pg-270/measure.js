// Contrast of the primary focus ring against each surface, in the light copy
// of the reproduction and in its dark clone.
const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })

// Any CSS color (oklch included) to sRGB, through a 1px canvas.
function toRgb(color) {
  context.clearRect(0, 0, 1, 1)
  context.fillStyle = '#000'
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  return Array.from(context.getImageData(0, 0, 1, 1).data.slice(0, 3))
}

function luminance([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map(value => {
    const channel = value / 255
    return channel <= 0.039_28 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return (0.2126 * lr) + (0.7152 * lg) + (0.0722 * lb)
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

export function measureRings() {
  const blocks = document.querySelectorAll('[data-playground-repro]')
  const results = []
  for (const [index, block] of [...blocks].entries()) {
    const mode = index === 0 ? 'light' : 'dark'
    for (const surface of block.querySelectorAll('[data-surface]')) {
      const button = surface.querySelector('button')
      // `outline-color` of the focused button is `var(--focus-ring-color)`,
      // which resolves to the theme's ring; read the same token here.
      const probe = document.createElement('span')
      probe.style.color = 'var(--bs-primary-focus-ring)'
      surface.append(probe)
      const ring = toRgb(getComputedStyle(probe).color)
      probe.remove()
      const background = toRgb(getComputedStyle(surface).backgroundColor)
      results.push({ mode, surface: surface.dataset.surface, ratio: contrast(ring, background), button })
    }
  }

  return results
}

export function format(results) {
  return results.map(({ mode, surface, ratio }) => `${mode} ${surface} ${ratio.toFixed(2)}:1`).join(', ')
}
