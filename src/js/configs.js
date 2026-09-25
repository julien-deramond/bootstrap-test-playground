// Swaps the page's shared stylesheets (the <link data-playground-styles> tags
// pointing at src/styles/) for a saved config from configs/. Pages without
// those links, like issue reproductions, keep their own styles.
import configs from 'virtual:playground-configs'

export { configs }

export function initConfigs(prefs) {
  let links = Object.fromEntries(
    [...document.querySelectorAll('link[data-playground-styles]')].map(link => [link.dataset.playgroundStyles, link])
  )
  const swappable = 'main' in links
  const working = Object.fromEntries(Object.entries(links).map(([key, link]) => [key, link.href]))
  let current = 'working'

  const swap = (key, href) => {
    const link = links[key]
    if (!link || link.href === href) {
      return Promise.resolve()
    }

    // Load the new stylesheet next to the old one and only then remove the
    // old one, so switching doesn't flash unstyled content.
    const next = link.cloneNode()
    next.href = href
    return new Promise(resolve => {
      next.addEventListener('load', resolve, { once: true })
      next.addEventListener('error', resolve, { once: true })
      link.after(next)
      links = { ...links, [key]: next }
    }).then(() => link.remove())
  }

  prefs.setConfigHandler(name => {
    const pending = document.getElementById('playground-config-pending')
    if (!swappable || name === current) {
      pending?.remove()
      return
    }

    const config = configs.find(item => item.name === name)
    current = config ? name : 'working'
    const target = config ? { main: config.main, tokens: config.tokens } : working

    Promise.all(Object.keys(links).map(key => swap(key, new URL(target[key], location.href).href)))
      .then(() => pending?.remove())
  })

  return { swappable }
}
