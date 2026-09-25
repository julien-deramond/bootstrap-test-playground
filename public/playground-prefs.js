// Applies the playground preferences (color mode, direction, primary hue and
// styles config) before first paint. Loaded as a classic, render-blocking
// script in the <head> of every page. The toolbar in src/js/toolbar.js drives it.
//
// Saved preferences live in localStorage. URL parameters override them for the
// current view only, without saving: ?theme=dark&dir=rtl&primary=teal&config=name
// (`embed` hides the toolbar, as used by /compare.html).
(() => {
  'use strict'

  const STORAGE_KEY = 'bootstrap-playground'
  const DEFAULTS = { colorMode: 'auto', dir: 'ltr', primary: 'default', config: 'working' }
  const URL_PARAMS = { theme: 'colorMode', dir: 'dir', primary: 'primary', config: 'config' }

  const params = new URLSearchParams(location.search)
  const overrides = {}
  for (const [param, key] of Object.entries(URL_PARAMS)) {
    if (params.has(param)) {
      overrides[key] = params.get(param)
    }
  }

  // Sub-keys of a `$theme-colors` entry, mapped like Bootstrap's own `primary`.
  const themeTokens = hue => ({
    base: `var(--bs-${hue}-500)`,
    fg: `light-dark(var(--bs-${hue}-600), var(--bs-${hue}-400))`,
    'fg-emphasis': `light-dark(var(--bs-${hue}-800), var(--bs-${hue}-200))`,
    bg: `var(--bs-${hue}-500)`,
    'bg-subtle': `light-dark(var(--bs-${hue}-100), var(--bs-${hue}-900))`,
    'bg-muted': `light-dark(var(--bs-${hue}-200), var(--bs-${hue}-800))`,
    border: `light-dark(var(--bs-${hue}-300), var(--bs-${hue}-600))`,
    'focus-ring': `light-dark(color-mix(in oklch, var(--bs-${hue}-500) 50%, var(--bs-bg-body)), color-mix(in oklch, var(--bs-${hue}-500) 75%, var(--bs-bg-body)))`,
    contrast: 'var(--bs-white)'
  })

  const read = () => {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) }
    } catch {
      return { ...DEFAULTS }
    }
  }

  const effective = () => ({ ...read(), ...overrides })

  // Swapping the stylesheets needs the list of configs, which only the module
  // script (src/js/configs.js) has. It registers itself here.
  let configHandler = null

  const apply = prefs => {
    const html = document.documentElement

    if (prefs.colorMode === 'auto') {
      html.removeAttribute('data-bs-theme')
    } else {
      html.setAttribute('data-bs-theme', prefs.colorMode)
    }

    html.setAttribute('dir', prefs.dir)

    for (const key of Object.keys(themeTokens('blue'))) {
      html.style.removeProperty(`--bs-primary-${key}`)
    }

    if (prefs.primary !== 'default') {
      for (const [key, value] of Object.entries(themeTokens(prefs.primary))) {
        html.style.setProperty(`--bs-primary-${key}`, value)
      }
    }

    configHandler?.(prefs.config)
  }

  // Saving a key drops its URL override, so the toolbar always wins.
  const save = changes => {
    const prefs = { ...read(), ...changes }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    } catch {}

    const url = new URL(location.href)
    for (const [param, key] of Object.entries(URL_PARAMS)) {
      if (key in changes) {
        delete overrides[key]
        url.searchParams.delete(param)
      }
    }

    history.replaceState(history.state, '', url)
    apply(effective())
    return effective()
  }

  const reset = () => save({ ...DEFAULTS })

  const setConfigHandler = handler => {
    configHandler = handler
    handler(effective().config)
  }

  // Hide the page until a non-default config's stylesheets are swapped in, so it
  // doesn't flash with the working styles first. Failsafe after 3 seconds.
  if (effective().config !== 'working') {
    const style = document.createElement('style')
    style.id = 'playground-config-pending'
    style.textContent = 'html { visibility: hidden !important; }'
    document.head.append(style)
    setTimeout(() => style.remove(), 3000)
  }

  window.playgroundPrefs = {
    DEFAULTS,
    embedded: params.has('embed'),
    read,
    effective,
    save,
    reset,
    apply,
    setConfigHandler
  }

  apply(effective())
})()
