// Swaps the page's shared stylesheets (the <link data-playground-styles> tags
// pointing at src/styles/) for a saved config from configs/, and with
// `css: 'dist'` the compiled main.scss for Bootstrap's dist/css/bootstrap.css,
// built from the same source (vite.config.js aliases it). The config's tokens.css still applies on top of
// dist; its Sass options can't. Pages without those links, like issue
// reproductions, keep their own styles.
import distCss from 'bootstrap/dist/css/bootstrap.css?url'
import configs, { categories } from 'virtual:playground-configs'

export { categories, configs }

// The categories that have configs, in order, each with its configs.
export function groupConfigs(items = configs) {
  return categories
    .map(category => ({ ...category, configs: items.filter(config => config.category === category.id) }))
    .filter(category => category.configs.length > 0)
}

export function initConfigs(prefs) {
  let links = Object.fromEntries(
    [...document.querySelectorAll('link[data-playground-styles]')].map(link => [link.dataset.playgroundStyles, link])
  )
  const swappable = 'main' in links
  const working = Object.fromEntries(Object.entries(links).map(([key, link]) => [key, link.href]))
  let current = 'working|src'

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

  prefs.setConfigHandler(({ config: name, css }) => {
    const pending = document.getElementById('playground-config-pending')
    const config = configs.find(item => item.name === name)
    const key = `${config ? name : 'working'}|${css === 'dist' ? 'dist' : 'src'}`
    if (!swappable || key === current) {
      pending?.remove()
      return
    }

    current = key
    const target = config ? { main: config.main, tokens: config.tokens } : { ...working }
    if (css === 'dist') {
      target.main = distCss
    }

    Promise.all(Object.keys(links).map(key => swap(key, new URL(target[key], location.href).href)))
      .then(() => pending?.remove())
  })

  return { swappable }
}
