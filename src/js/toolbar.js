// Floating playground toolbar: color mode, direction, primary hue and styles
// config switchers. It renders in a shadow root with its own styles, so it
// neither inherits from nor leaks into the Bootstrap page under test.
// Preferences are applied by public/playground-prefs.js, which runs in <head>
// before first paint.
//
// Keyboard shortcuts (Alt+Shift, Option+Shift on macOS):
//   T  cycle color mode (auto, light, dark)
//   D  toggle direction (LTR, RTL)

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
  .bar[data-collapsed] > :not(.toggle) { display: none; }
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
  .toggle { padding: 3px 6px; border-radius: 6px; }
  .toggle:hover, .reset:hover { background: rgb(255 255 255 / .1); }
`

const escapeHtml = value => String(value).replace(/[&<>"]/g, char => `&#${char.charCodeAt(0)};`)

export function mountToolbar({ source, configs, swappable }) {
  const prefs = window.playgroundPrefs
  if (!prefs) {
    console.warn('[playground] playground-prefs.js is not loaded on this page; the toolbar is disabled.')
    return
  }

  // Keyboard shortcuts work even when the toolbar is hidden or embedded.
  document.addEventListener('keydown', event => {
    if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) {
      return
    }

    const current = prefs.effective()
    if (event.code === 'KeyT') {
      render(prefs.save({ colorMode: COLOR_MODES[(COLOR_MODES.indexOf(current.colorMode) + 1) % COLOR_MODES.length] }))
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

  let render = () => {}
  if (prefs.embedded) {
    return
  }

  const host = document.createElement('div')
  host.id = 'playground-toolbar'
  const shadow = host.attachShadow({ mode: 'open' })

  const segmented = (name, label, options) => `
    <span class="group" role="group" aria-label="${label}">
      ${options.map(([value, text]) => `<button type="button" data-pref="${name}" value="${value}">${text}</button>`).join('')}
    </span>`

  const configOptions = [
    ['working', 'Styles: src/styles (working)', 'The working copy in src/styles/'],
    ...configs.map(({ name, description }) => [name, `Styles: ${name}`, description || `configs/${name}/`])
  ]

  const compareUrl = `/compare.html?page=${encodeURIComponent(location.pathname)}`

  shadow.innerHTML = `
    <style>${styles}</style>
    <div class="bar" role="toolbar" aria-label="Playground settings">
      <a href="/" title="All pages">Playground</a>
      ${segmented('colorMode', 'Color mode (Alt+Shift+T)', [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']])}
      ${segmented('dir', 'Direction (Alt+Shift+D)', [['ltr', 'LTR'], ['rtl', 'RTL']])}
      <select data-pref="primary" aria-label="Primary color" title="Remaps the --bs-primary-* tokens at runtime">
        ${HUES.map(hue => `<option value="${hue}">Primary: ${hue}</option>`).join('')}
      </select>
      <select data-pref="config" aria-label="Styles config" ${swappable ? 'title="Swap src/styles/ for a saved config from configs/"' : 'disabled title="This page compiles its own styles"'}>
        ${configOptions.map(([value, label, description]) => `<option value="${escapeHtml(value)}" title="${escapeHtml(description)}">${escapeHtml(label)}</option>`).join('')}
      </select>
      <a href="${compareUrl}" title="Compare this page side by side">Compare</a>
      <button type="button" class="reset" title="Back to Bootstrap defaults">Reset</button>
      <span class="source" title="Bootstrap source">${escapeHtml(source)}</span>
      <button type="button" class="toggle" aria-expanded="true" title="Hide toolbar">&#x2715;</button>
    </div>`

  const bar = shadow.querySelector('.bar')
  const toggle = shadow.querySelector('.toggle')

  render = current => {
    for (const button of shadow.querySelectorAll('button[data-pref]')) {
      button.setAttribute('aria-pressed', String(current[button.dataset.pref] === button.value))
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

    if (button.dataset.pref) {
      render(prefs.save({ [button.dataset.pref]: button.value }))
    } else if (button.classList.contains('reset')) {
      render(prefs.reset())
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
