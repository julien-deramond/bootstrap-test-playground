// Fixed when each theme's `contrast` is readable on its `base` (4.5:1) in both
// color modes, as the theme docs describe it. Probes sit in a `color-scheme`
// wrapper so both modes are measured from the one copy of the page.
const themes = ['inverse', 'secondary']
const modes = ['light', 'dark']

const rgb = (color) => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  ctx.fillStyle = '#000'
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3))
}
const luminance = (channels) => {
  const [r, g, b] = channels.map((value) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export async function assert() {
  const host = document.querySelector('[data-playground-repro]')
  const results = []
  for (const mode of modes) {
    const wrapper = document.createElement('div')
    wrapper.style.colorScheme = mode
    host.append(wrapper)
    for (const theme of themes) {
      const probe = document.createElement('div')
      probe.className = `theme-${theme}`
      probe.style.cssText = 'background: var(--bs-theme-base); color: var(--bs-theme-contrast)'
      wrapper.append(probe)
      const style = getComputedStyle(probe)
      results.push({ theme, mode, ratio: ratio(rgb(style.color), rgb(style.backgroundColor)) })
    }
    wrapper.remove()
  }
  return {
    pass: results.every((result) => result.ratio >= 4.5),
    details: results.map((result) => `${result.theme} ${result.mode} ${result.ratio.toFixed(2)}:1`).join(', ')
  }
}
