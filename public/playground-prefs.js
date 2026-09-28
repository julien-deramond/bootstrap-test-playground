// Applies the playground preferences (color mode, direction, primary hue,
// styles config and Bootstrap source) before first paint. Every page's <head>
// loads it first, as a classic script that vite.config.js inlines (see #240).
// The toolbar in src/js/toolbar.js drives it.
//
// Saved preferences live in localStorage. URL parameters override them for the
// current view only, without saving: ?theme=dark&dir=rtl&primary=teal&config=name
//
// `css` and `js` pick where Bootstrap comes from: `src`, compiled from its Sass
// and TypeScript (the default), or `dist`, the prebuilt files the package ships
// (dist/css/bootstrap.css, js/dist/). ?css=dist&js=dist tests what users get.
//
// A page marked `<html data-playground-fixed>`, like the home page, keeps
// Bootstrap's defaults: none of the preferences apply to it, but it can still
// read and save them for the example pages.
//
// View flags, for screenshots and embeds:
// - `embed` hides the toolbar, as used by /compare.html
// - `chrome=0` also hides the page's own playground UI, marked with
//   `data-playground-chrome` (kitchen sink header, navigation, headings)
// - `frame=0` removes the kitchen sink's `.bd-example` frame
// - `section=<id>` shows one kitchen sink example only
// - `freeze` makes the page render the same way every time: no animations,
//   transitions or caret, carousels don't autoplay, a fixed date and a seeded
//   Math.random
(() => {
  'use strict'

  const STORAGE_KEY = 'bootstrap-playground'
  const DEFAULTS = { colorMode: 'auto', dir: 'ltr', primary: 'default', config: 'working', css: 'src', js: 'src' }
  const URL_PARAMS = { theme: 'colorMode', dir: 'dir', primary: 'primary', config: 'config', css: 'css', js: 'js' }

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

  const fixed = document.documentElement.hasAttribute('data-playground-fixed')

  // Swapping the stylesheets needs the list of configs and the dist stylesheet's
  // URL, which only the module script (src/js/configs.js) has. It registers
  // itself here, and gets the whole preferences (`config` and `css`).
  let configHandler = null

  const apply = prefs => {
    if (fixed) {
      return
    }

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

    configHandler?.(prefs)
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
    // The toolbar and the home page's configs follow saves made by the other.
    window.dispatchEvent(new Event('playground-prefs'))
    return effective()
  }

  const reset = () => save({ ...DEFAULTS })

  const setConfigHandler = handler => {
    configHandler = handler
    handler(effective())
  }

  const addStyle = (id, css) => {
    const style = document.createElement('style')
    style.id = id
    style.textContent = css
    document.head.append(style)
    return style
  }

  // Hide the page until a non-default config's stylesheets, or the dist
  // stylesheet, are swapped in, so it doesn't flash with the working styles
  // first. Failsafe after 3 seconds.
  if (!fixed && (effective().config !== 'working' || effective().css === 'dist')) {
    const style = addStyle('playground-config-pending', 'html { visibility: hidden !important; }')
    setTimeout(() => style.remove(), 3000)
  }

  const chromeless = params.get('chrome') === '0'
  const frozen = params.has('freeze') && !['0', 'false'].includes(params.get('freeze'))
  const section = params.get('section')

  // Unlayered, so these win over the pages' `@layer custom` rules.
  const viewRules = []
  if (chromeless) {
    viewRules.push('[data-playground-chrome] { display: none !important; }')
  }

  if (params.get('frame') === '0') {
    viewRules.push('.bd-example { --bd-example-padding: 0px; background-color: transparent; border: 0; border-radius: 0; }')
  }

  if (section) {
    viewRules.push(`.bd-kitchen-sink-section:not([aria-labelledby="${CSS.escape(section)}"]) { display: none !important; }`)
  }

  if (frozen) {
    viewRules.push(
      'html { scroll-behavior: auto !important; }',
      '*, ::before, ::after { animation: none !important; transition: none !important; caret-color: transparent !important; }'
    )

    // A fixed "today" (the datepicker's month, relative dates) that still
    // ticks, so code measuring elapsed time keeps working. Noon UTC is the
    // same calendar day in nearly every time zone.
    const RealDate = Date
    const start = RealDate.UTC(2026, 0, 15, 12)
    const now = () => start + Math.floor(performance.now())
    window.Date = new Proxy(RealDate, {
      construct: (target, args, newTarget) => Reflect.construct(target, args.length > 0 ? args : [now()], newTarget),
      apply: () => new RealDate(now()).toString(),
      get: (target, key, receiver) => (key === 'now' ? now : Reflect.get(target, key, receiver))
    })

    // Seeded Math.random (mulberry32), for generated ids and demo data.
    let seed = 0x2F6B_3A91
    Math.random = () => {
      seed = (seed + 0x6D2B_79F5) | 0
      let value = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
      return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
    }
  }

  if (viewRules.length > 0) {
    addStyle('playground-view', viewRules.join('\n'))
  }

  window.playgroundPrefs = {
    DEFAULTS,
    URL_PARAMS,
    embedded: params.has('embed') || chromeless,
    fixed,
    frozen,
    read,
    effective,
    save,
    reset,
    apply,
    setConfigHandler
  }

  apply(effective())
})()
