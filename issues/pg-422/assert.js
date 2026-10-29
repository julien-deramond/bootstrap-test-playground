// Fixed when a static menu opens below its toggle with the gap of
// `--menu-spacer` (2px, within 1px of rounding) and its start edge lines up
// with the toggle's, in a block wrapper and in a flex row. The wrappers are
// positioned: the possible fix places the menu against the nearest positioned
// ancestor. Only the default bottom-start placement is checked. Today the gaps
// are 0px and -38px.
const ready = () => new Promise(resolve => {
  const check = () => (document.readyState === 'complete' ? resolve() : setTimeout(check, 50))
  check()
})

export async function assert() {
  await ready()
  // The token is `.125rem`: resolve it to pixels on a probe inside a menu.
  const menuProbe = document.querySelector('.menu')
  const probe = document.createElement('div')
  probe.style.width = 'var(--bs-menu-spacer)'
  menuProbe.append(probe)
  const expected = probe.getBoundingClientRect().width || 2
  probe.remove()

  const cases = [...document.querySelectorAll('[data-case^="static"]')].map(wrapper => {
    const toggle = wrapper.querySelector('[data-bs-toggle="menu"]')
    const menu = wrapper.querySelector('.menu')
    window.bootstrap.Menu.getOrCreateInstance(toggle).show()
    const toggleRect = toggle.getBoundingClientRect()
    const menuRect = menu.getBoundingClientRect()
    const gap = menuRect.top - toggleRect.bottom
    const offset = menuRect.left - toggleRect.left
    window.bootstrap.Menu.getOrCreateInstance(toggle).hide()
    return {
      name: wrapper.dataset.case,
      gap,
      offset,
      pass: Math.abs(gap - expected) <= 1 && Math.abs(offset) <= 1
    }
  })

  return {
    pass: cases.length === 2 && cases.every(item => item.pass),
    details: `expected gap ${expected}px: ${cases.map(item => `${item.name} gap ${Math.round(item.gap)}px, start offset ${Math.round(item.offset)}px`).join('; ')}`
  }
}
