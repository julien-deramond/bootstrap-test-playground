// Passes once Tooltip and Popover merge `data-bs-config` like every other component:
// below their data-bs-* attributes, which sit below the JavaScript options.
const CONFIG = '{"customClass":"from-config","placement":"bottom"}'

function probe(Component, attributes, options) {
  const button = document.createElement('button')
  button.setAttribute('data-bs-config', CONFIG)
  for (const [name, value] of Object.entries(attributes)) {
    button.setAttribute(name, value)
  }

  document.body.append(button)
  const instance = new Component(button, { title: 'Tip', ...options })
  const { customClass, placement } = instance._config
  instance.dispose()
  button.remove()
  return { customClass, placement }
}

export async function assert() {
  const { Tooltip, Popover } = window.bootstrap
  const failures = []
  const seen = []

  for (const [name, Component] of [['Tooltip', Tooltip], ['Popover', Popover]]) {
    const fromConfig = probe(Component, {}, {})
    const attributeWins = probe(Component, { 'data-bs-placement': 'left' }, {})
    const optionWins = probe(Component, { 'data-bs-placement': 'left' }, { placement: 'right' })

    seen.push(`${name} ${fromConfig.customClass || '\'\''}/${fromConfig.placement}`)

    if (fromConfig.customClass !== 'from-config' || fromConfig.placement !== 'bottom') {
      failures.push(`${name} ignores data-bs-config`)
    }

    if (attributeWins.placement !== 'left') {
      failures.push(`${name}: data-bs-placement doesn't beat data-bs-config (${attributeWins.placement})`)
    }

    if (optionWins.placement !== 'right') {
      failures.push(`${name}: a JavaScript option doesn't beat both (${optionWins.placement})`)
    }
  }

  return {
    pass: failures.length === 0,
    details: failures.length ? `${failures.join('; ')} (${seen.join(', ')})` : `data-bs-config applied (${seen.join(', ')})`
  }
}
