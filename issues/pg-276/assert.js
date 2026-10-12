// Fixed when `inverse`'s `fg-emphasis` is readable on its `bg-muted` (4.5:1) in
// both color modes, as the theme docs pair them. Probes sit in a `color-scheme`
// wrapper so both modes are measured from the one copy of the page.
const pairings = ['fg-emphasis', 'fg']
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
    for (const pairing of pairings) {
      const probe = document.createElement('div')
      probe.className = 'theme-inverse'
      probe.style.cssText = `background: var(--bs-theme-bg-muted); color: var(--bs-theme-${pairing})`
      wrapper.append(probe)
      const style = getComputedStyle(probe)
      results.push({ pairing, mode, ratio: ratio(rgb(style.color), rgb(style.backgroundColor)) })
    }
    wrapper.remove()
  }
  // Only `fg-emphasis` is documented as the pairing for `muted`; `fg` is reported as context.
  const documented = results.filter((result) => result.pairing === 'fg-emphasis')
  return {
    pass: documented.every((result) => result.ratio >= 4.5),
    details: results.map((result) => `inverse ${result.pairing} on bg-muted ${result.mode} ${result.ratio.toFixed(2)}:1`).join(', ')
  }
}
