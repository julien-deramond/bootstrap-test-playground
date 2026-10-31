// Fixed when a link inside a tooltip is readable (4.5:1) against the tooltip's
// own background, in light and in dark mode (WCAG 1.4.3). The tooltip inverts
// the body colors but leaves links with the page's link color. A tooltip is
// opened in a `color-scheme` wrapper per mode, so both are measured from the
// one copy of the page.
const modes = ['light', 'dark']

const rgb = color => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  ctx.fillStyle = '#000'
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)]
}

const luminance = channels => {
  const [r, g, b] = channels.map(value => {
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
    wrapper.innerHTML = '<button type="button" class="btn-solid theme-primary">Probe</button>'
    host.append(wrapper)
    const trigger = wrapper.querySelector('button')
    const tooltip = new window.bootstrap.Tooltip(trigger, {
      html: true,
      title: 'Read the <a href=\'#\'>full docs</a> for more.',
      trigger: 'manual',
      animation: false,
      container: wrapper
    })
    tooltip.show()
    await new Promise(resolve => {setTimeout(resolve, 100)})
    const inner = wrapper.querySelector('.tooltip-inner')
    const link = inner?.querySelector('a')
    if (!link) {
      return { pass: false, details: `no tooltip link in ${mode} mode` }
    }

    const fg = getComputedStyle(link).color
    const bg = getComputedStyle(inner).backgroundColor
    results.push({
      mode, fg, bg, ratio: ratio(rgb(fg), rgb(bg))
    })
    tooltip.dispose()
    wrapper.remove()
  }

  return {
    pass: results.every(result => result.ratio >= 4.5),
    details: results.map(result => `${result.mode} ${result.fg} on ${result.bg} ${result.ratio.toFixed(2)}:1`).join(', ')
  }
}
