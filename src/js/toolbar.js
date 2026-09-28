// Floating playground toolbar: color mode, direction, primary hue, styles
// config and Bootstrap source (compiled from source, or the prebuilt dist)
// switchers. It renders in a shadow root with its own styles, so it
// neither inherits from nor leaks into the Bootstrap page under test.
// Preferences are applied by public/playground-prefs.js, which runs in <head>
// before first paint.
//
// Keyboard shortcuts (Alt+Shift, Option+Shift on macOS):
//   T  cycle color mode (auto, light, dark, then the config's own modes)
//   D  toggle direction (LTR, RTL)
// Ctrl+K (⌘K on macOS) opens the page switcher, see palette.js.

import { mountPalette, paletteShortcut } from './palette.js'
import { siblings } from './page-index.js'

const HUES = ['default', 'indigo', 'violet', 'purple', 'pink', 'red', 'orange', 'amber', 'lime', 'green', 'teal', 'cyan', 'brown', 'gray']
const COLOR_MODES = ['auto', 'light', 'dark']
const COLLAPSED_KEY = 'bootstrap-playground-toolbar-collapsed'

const styles = `
  :host { all: initial; }
  .bar {
    position: fixed;
    inset-block-end: 12px;
    inset-inline-end: 12px;
    z-index: 2147483000;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    max-inline-size: calc(100vw - 24px);
    padding: 6px 8px;
    font: 12px/1.3 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #e6e6e6;
    background: rgb(24 24 27 / .92);
    border: 1px solid rgb(255 255 255 / .12);
    border-radius: 10px;
    box-shadow: 0 6px 24px rgb(0 0 0 / .25);
    backdrop-filter: blur(6px);
  }
  .bar[data-collapsed] > :not(.toggle, .origin) { display: none; }
  a { color: inherit; font-weight: 600; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .group { display: inline-flex; border: 1px solid rgb(255 255 255 / .18); border-radius: 6px; overflow: hidden; }
  button, select {
    font: inherit;
    color: inherit;
    background: transparent;
    border: 0;
    padding: 3px 8px;
    cursor: pointer;
  }
  select:disabled { cursor: not-allowed; opacity: .5; }
  .group button + button { border-inline-start: 1px solid rgb(255 255 255 / .18); }
  button[aria-pressed="true"] { color: #111; background: #e6e6e6; }
  button:focus-visible, select:focus-visible, a:focus-visible { outline: 2px solid #7aa7ff; outline-offset: 1px; }
  select { max-inline-size: 16em; border: 1px solid rgb(255 255 255 / .18); border-radius: 6px; }
  option { color: #111; }
  .source { opacity: .65; font-size: 11px; }
  .origin { font-size: 11px; }
  .origin a { text-decoration: underline; text-underline-offset: 2px; }
  .toggle { padding: 3px 6px; border-radius: 6px; }
  .toggle:hover, .reset:hover, .search:hover { background: rgb(255 255 255 / .1); }
  .search { display: inline-flex; gap: 6px; align-items: center; border: 1px solid rgb(255 255 255 / .18); border-radius: 6px; }
  .search kbd { font: inherit; font-size: 10px; opacity: .6; }
  .pager { display: inline-flex; gap: 2px; }
  .pager a { display: inline-grid; place-items: center; min-inline-size: 20px; padding: 2px 4px; border-radius: 6px; }
  .pager a:hover { text-decoration: none; background: rgb(255 255 255 / .1); }
  .pager [aria-disabled] { opacity: .3; pointer-events: none; }
`

const escapeHtml = value => String(value).replace(/[&<>"]/g, char => `&#${char.charCodeAt(0)};`)

export function mountToolbar({ source, configs, swappable }) {
  const prefs = window.playgroundPrefs
  if (!prefs) {
    console.warn('[playground] playground-prefs.js is not loaded on this page; the toolbar is disabled.')
    return
  }

  // Auto, Light and Dark, the custom color modes of the current config
  // (configs/color-modes-custom/), and the current one if it's another, set
  // with ?theme=.
  const colorModes = current => [...new Set([
    ...COLOR_MODES,
    ...(configs.find(({ name }) => name === current.config)?.colorModes ?? []),
    current.colorMode
  ])]

  // Keyboard shortcuts work even when the toolbar is hidden or embedded.
  document.addEventListener('keydown', event => {
    if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) {
      return
    }

    const current = prefs.effective()
    if (event.code === 'KeyT') {
      const modes = colorModes(current)
      render(prefs.save({ colorMode: modes[(modes.indexOf(current.colorMode) + 1) % modes.length] }))
    } else if (event.code === 'KeyD') {
      render(prefs.save({ dir: current.dir === 'rtl' ? 'ltr' : 'rtl' }))
    } else {
      return
    }

    event.preventDefault()
  })

  // Keep tabs in sync.
  window.addEventListener('storage', () => {
    prefs.apply(prefs.effective())
    render(prefs.effective())
  })

  // And the page, like the home page's configs, when it saves a preference.
  window.addEventListener('playground-prefs', () => render(prefs.effective()))

  let render = () => {}
  if (prefs.embedded) {
    return
  }

  const host = document.createElement('div')
  host.id = 'playground-toolbar'
  const shadow = host.attachShadow({ mode: 'open' })

  const buttons = (name, options) => options.map(([value, text]) => `<button type="button" data-pref="${name}" value="${escapeHtml(value)}">${escapeHtml(text)}</button>`).join('')
  const segmented = (name, label, options) => `
    <span class="group" role="group" aria-label="${label}" data-group="${name}">
      ${buttons(name, options)}
    </span>`
  const modeOption = mode => [mode, mode.charAt(0).toUpperCase() + mode.slice(1)]

  const configOptions = [
    ['working', 'Styles: src/styles (working)', 'The working copy in src/styles/'],
    ...configs.map(({ name, description }) => [name, `Styles: ${name}`, description || `configs/${name}/`])
  ]

  const compareUrl = `${import.meta.env.BASE_URL}compare.html?page=${encodeURIComponent(location.pathname)}`
  const palette = mountPalette()

  // Previous and next pages in the same folder, to flip through a group.
  const { group, previous, next } = siblings(location.pathname)
  const pagerLink = (page, label, arrow) => page ?
    `<a href="${escapeHtml(page.url)}" title="${label}: ${escapeHtml(page.title)}" aria-label="${label}: ${escapeHtml(page.title)}">${arrow}</a>` :
    `<a aria-disabled="true" aria-label="${label}">${arrow}</a>`
  const pagerHtml = group ? `
      <span class="pager" role="group" aria-label="${escapeHtml(group.label)}">${pagerLink(previous, 'Previous', '&#x2039;')}${pagerLink(next, 'Next', '&#x203A;')}</span>` : ''

  // Pages adapted from elsewhere credit their source with
  // <meta name="playground-source" content="Label" data-url="…" data-license="…">.
  // The credit stays visible when the toolbar is collapsed.
  const origin = document.querySelector('meta[name="playground-source"]')
  const originHtml = origin ? `
      <span class="origin">Adapted from <a href="${escapeHtml(origin.dataset.url)}" target="_blank" rel="noopener">${escapeHtml(origin.content)}</a>${origin.dataset.license ? ` (${escapeHtml(origin.dataset.license)})` : ''}</span>` : ''

  shadow.innerHTML = `
    <style>${styles}</style>
    <div class="bar" role="toolbar" aria-label="Playground settings">
      <a href="${import.meta.env.BASE_URL}" title="All pages">Playground</a>${pagerHtml}
      <button type="button" class="search" title="Go to another page">Search <kbd>${paletteShortcut}</kbd></button>
      ${segmented('colorMode', 'Color mode (Alt+Shift+T)', COLOR_MODES.map(modeOption))}
      ${segmented('dir', 'Direction (Alt+Shift+D)', [['ltr', 'LTR'], ['rtl', 'RTL']])}
      <select data-pref="primary" aria-label="Primary color" title="Remaps the --bs-primary-* tokens at runtime">
        ${HUES.map(hue => `<option value="${hue}">Primary: ${hue}</option>`).join('')}
      </select>
      <span title="Source compiles Bootstrap from scss/ and js/src/. Dist loads the prebuilt dist/css/bootstrap.css and js/dist/ the package ships.">${segmented('source', 'Bootstrap source', [['src', 'Source'], ['dist', 'Dist']])}</span>
      <select data-pref="config" aria-label="Styles config" ${swappable ? 'title="Swap src/styles/ for a saved config from configs/"' : 'disabled title="This page compiles its own styles"'}>
        ${configOptions.map(([value, label, description]) => `<option value="${escapeHtml(value)}" title="${escapeHtml(description)}">${escapeHtml(label)}</option>`).join('')}
      </select>
      <a href="${compareUrl}" title="Compare this page side by side">Compare</a>
      <button type="button" class="reset" title="Back to Bootstrap defaults">Reset</button>
      <span class="source" title="Bootstrap source">${escapeHtml(source)}</span>${originHtml}
      <button type="button" class="toggle" aria-expanded="true" title="Hide toolbar">&#x2715;</button>
    </div>`

  const bar = shadow.querySelector('.bar')
  const modeGroup = shadow.querySelector('[data-group="colorMode"]')
  const toggle = shadow.querySelector('.toggle')

  // The Source switch sets `css` and `js` together. Mixed URL overrides
  // (?css=dist alone) leave both buttons unpressed.
  const valueOf = (current, pref) => (pref === 'source' ? (current.css === current.js ? current.css : null) : current[pref])

  // Loaded JavaScript can't be swapped: reload when its source changes.
  const saveAndReload = (before, next) => {
    if (next.js !== before.js) {
      location.reload()
    }

    return next
  }

  render = current => {
    // The config's own color modes come and go with the config.
    const modes = colorModes(current)
    if (modeGroup.dataset.modes !== modes.join()) {
      modeGroup.innerHTML = buttons('colorMode', modes.map(modeOption))
      modeGroup.dataset.modes = modes.join()
    }

    for (const button of shadow.querySelectorAll('button[data-pref]')) {
      button.setAttribute('aria-pressed', String(valueOf(current, button.dataset.pref) === button.value))
    }

    for (const select of shadow.querySelectorAll('select[data-pref]')) {
      select.value = current[select.dataset.pref]
      if (select.selectedIndex === -1) {
        select.selectedIndex = 0
      }
    }
  }

  const setCollapsed = collapsed => {
    bar.toggleAttribute('data-collapsed', collapsed)
    toggle.setAttribute('aria-expanded', String(!collapsed))
    toggle.innerHTML = collapsed ? '&#x2699;' : '&#x2715;'
    toggle.title = collapsed ? 'Show playground toolbar' : 'Hide toolbar'
    try {
      sessionStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '')
    } catch {}
  }

  shadow.addEventListener('click', event => {
    const button = event.target.closest('button')
    if (!button) {
      return
    }

    if (button.dataset.pref === 'source') {
      render(saveAndReload(prefs.effective(), prefs.save({ css: button.value, js: button.value })))
    } else if (button.dataset.pref) {
      render(prefs.save({ [button.dataset.pref]: button.value }))
    } else if (button.classList.contains('reset')) {
      render(saveAndReload(prefs.effective(), prefs.reset()))
    } else if (button.classList.contains('search')) {
      palette.open()
    } else if (button === toggle) {
      setCollapsed(!bar.hasAttribute('data-collapsed'))
    }
  })

  shadow.addEventListener('change', event => {
    render(prefs.save({ [event.target.dataset.pref]: event.target.value }))
  })

  render(prefs.effective())
  let collapsed = false
  try {
    collapsed = sessionStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {}

  setCollapsed(collapsed)
  document.body.append(host)
}
