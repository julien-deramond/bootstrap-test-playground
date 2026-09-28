// Floating playground configurator on example pages. A small pill sums up the
// current state (config, color mode, direction, hue, dist) and opens a panel
// with every customization axis: color mode, direction and where Bootstrap
// comes from, the primary hue, and the saved configs by category. It renders
// in a shadow root with its own styles, so it neither inherits from nor leaks
// into the Bootstrap page under test. Preferences are applied by
// public/playground-prefs.js, which runs in <head> before first paint.
//
// Keyboard shortcuts (Alt+Shift, Option+Shift on macOS):
//   P  open or close the panel
//   T  cycle color mode (auto, light, dark, then the config's own modes)
//   D  toggle direction (LTR, RTL)
// Ctrl+K (⌘K on macOS) opens the page switcher, see palette.js.
//
// The panel is a modal <dialog>: it traps focus, and closes on Escape and on
// a click outside it. Its sections leave room for more axes later.
//
// On a first visit, a hint above the pill says what it does. It goes away for
// good once the panel opens, a shortcut is used or it's dismissed, and never
// shows under automation, so tests and screenshots don't see it.

import { groupConfigs } from './configs.js'
import { mountPalette, paletteShortcut } from './palette.js'
import { siblings } from './page-index.js'

const HUES = ['default', 'indigo', 'violet', 'purple', 'pink', 'red', 'orange', 'amber', 'lime', 'green', 'teal', 'cyan', 'brown', 'gray']
const COLOR_MODES = ['auto', 'light', 'dark']
const OPEN_KEY = 'bootstrap-playground-toolbar-open'
const HINT_KEY = 'bootstrap-playground-toolbar-hint'
const REPOSITORY_URL = 'https://github.com/julien-deramond/bootstrap-test-playground'

// Lucide (ISC License), https://lucide.dev
const icon = paths => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
const ICONS = {
  home: icon('<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  search: icon('<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>'),
  sliders: icon('<path d="M10 5H3"/><path d="M12 19H3"/><path d="M14 3v4"/><path d="M16 17v4"/><path d="M21 12h-9"/><path d="M21 19h-5"/><path d="M21 5h-7"/><path d="M8 10v4"/><path d="M8 12H3"/>'),
  close: icon('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>')
}

const styles = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .dock, dialog {
    font: 12px/1.35 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #e6e6e6;
  }
  .dock {
    position: fixed;
    inset-block-end: 12px;
    inset-inline-end: 12px;
    z-index: 2147483000;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    max-inline-size: calc(100vw - 24px);
  }
  .pill, .origin {
    background: rgb(24 24 27 / .92);
    border: 1px solid rgb(255 255 255 / .12);
    box-shadow: 0 6px 24px rgb(0 0 0 / .25);
    backdrop-filter: blur(6px);
  }
  .pill { display: flex; align-items: center; gap: 2px; max-inline-size: 100%; padding: 3px; border-radius: 999px; }
  .origin { padding: 3px 10px; font-size: 11px; border-radius: 999px; }
  .origin a { text-decoration: underline; text-underline-offset: 2px; }
  a { color: inherit; font-weight: 600; text-decoration: none; }
  a:hover { text-decoration: underline; }
  button, input { font: inherit; color: inherit; }
  button { background: transparent; border: 0; cursor: pointer; }
  :is(button, a, input):focus-visible, label:has(> input:focus-visible) { outline: 2px solid #7aa7ff; outline-offset: 1px; }
  kbd { font: inherit; font-size: 10px; opacity: .6; }
  .icon { display: inline-grid; place-items: center; min-inline-size: 26px; block-size: 26px; padding: 0 6px; border-radius: 999px; }
  .icon:hover, .summary:hover, .pager a:hover { text-decoration: none; background: rgb(255 255 255 / .1); }
  .pager { display: inline-flex; }
  .pager a { display: inline-grid; place-items: center; min-inline-size: 22px; block-size: 26px; border-radius: 999px; }
  .pager [aria-disabled] { opacity: .3; pointer-events: none; }
  .summary {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    min-inline-size: 0;
    block-size: 26px;
    padding: 0 10px;
    font-weight: 600;
    border: 1px solid rgb(255 255 255 / .18);
    border-radius: 999px;
  }
  .summary-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .search { display: inline-flex; gap: 4px; align-items: center; }

  .hint {
    position: relative;
    display: flex;
    gap: 8px;
    align-items: flex-start;
    max-inline-size: 280px;
    padding: 10px 10px 10px 12px;
    background: rgb(24 24 27);
    border: 1px solid #7aa7ff;
    border-radius: 10px;
    box-shadow: 0 6px 24px rgb(0 0 0 / .3);
  }
  .hint p { margin: 0; }
  .hint strong { display: block; margin-block-end: 2px; }
  .hint kbd { font-size: 11px; opacity: .75; }
  .hint .dismiss { flex: none; margin: -4px -4px 0 0; }
  .summary[aria-describedby] { border-color: #7aa7ff; box-shadow: 0 0 0 2px rgb(122 167 255 / .35); }
  @media (prefers-reduced-motion: no-preference) {
    .hint { animation: hint-in .3s ease-out; }
    @keyframes hint-in { from { opacity: 0; transform: translateY(6px); } }
  }

  dialog {
    position: fixed;
    inset: auto;
    inset-block-end: 56px;
    inset-inline-end: 12px;
    inline-size: min(420px, calc(100vw - 24px));
    max-inline-size: none;
    max-block-size: calc(100dvh - 80px);
    padding: 0;
    margin: 0;
    overflow: auto;
    overscroll-behavior: contain;
    background: rgb(24 24 27);
    border: 1px solid rgb(255 255 255 / .14);
    border-radius: 12px;
    box-shadow: 0 12px 40px rgb(0 0 0 / .4);
    scrollbar-color: rgb(255 255 255 / .25) transparent;
  }
  dialog::backdrop { background: transparent; }
  /* The dock and the panel sit at the page's inline end, but their contents
     stay left to right: code in RTL descriptions would scramble otherwise. */
  .dock > *, dialog > * { direction: ltr; }
  @media (max-width: 575.98px) {
    dialog { inset-inline: 0; inset-block-end: 0; inline-size: 100%; max-block-size: 85dvh; border-radius: 12px 12px 0 0; }
  }
  header, footer { display: flex; gap: 8px; align-items: center; padding: 10px 14px; }
  header { position: sticky; inset-block-start: 0; z-index: 1; background: rgb(24 24 27); border-block-end: 1px solid rgb(255 255 255 / .1); }
  h2 { flex: 1; margin: 0; font-size: 13px; }
  h3 { margin: 0 0 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; opacity: .6; }
  section { padding: 12px 14px; border-block-end: 1px solid rgb(255 255 255 / .08); }
  fieldset { min-inline-size: 0; padding: 0; margin: 0; border: 0; }
  .row { display: grid; grid-template-columns: 7.5em 1fr; gap: 8px; align-items: center; }
  .row + .row { margin-block-start: 6px; }
  legend { float: inline-start; padding: 0; opacity: .8; }
  legend kbd { display: block; }

  .segmented { display: inline-flex; justify-self: start; flex-wrap: wrap; border: 1px solid rgb(255 255 255 / .18); border-radius: 6px; overflow: hidden; }
  .segmented label { position: relative; padding: 3px 9px; cursor: pointer; }
  .segmented label + label { border-inline-start: 1px solid rgb(255 255 255 / .18); }
  .segmented label:has(> input:checked) { color: #111; background: #e6e6e6; }
  .segmented label:has(> input:focus-visible) { outline-offset: -2px; }
  input[type="radio"] { position: absolute; inset: 0; margin: 0; opacity: 0; pointer-events: none; }

  .swatches { display: flex; flex-wrap: wrap; gap: 6px; }
  .swatch { position: relative; display: grid; place-items: center; inline-size: 22px; block-size: 22px; cursor: pointer; border-radius: 50%; box-shadow: inset 0 0 0 1px rgb(255 255 255 / .2); }
  .swatch.default { inline-size: auto; padding: 0 8px; border-radius: 999px; }
  .swatch:has(> input:checked) { box-shadow: 0 0 0 2px rgb(24 24 27), 0 0 0 4px #e6e6e6; }
  .swatch:has(> input:focus-visible) { outline-offset: 5px; }

  .filter { inline-size: 100%; padding: 5px 8px; margin-block-end: 4px; background: rgb(255 255 255 / .06); border: 1px solid rgb(255 255 255 / .18); border-radius: 6px; }
  .filter::placeholder { color: inherit; opacity: .5; }
  .category { margin-block-start: 10px; }
  .category legend { float: none; display: flex; gap: 6px; align-items: baseline; margin-block-end: 4px; font-weight: 600; opacity: 1; }
  .category legend span { font-weight: 400; opacity: .55; }
  .config { position: relative; display: grid; gap: 2px; padding: 6px 8px; border: 1px solid transparent; border-radius: 6px; }
  .config:hover { background: rgb(255 255 255 / .05); }
  .config:has(input:checked) { background: rgb(122 167 255 / .12); border-color: rgb(122 167 255 / .5); }
  .config:has(input:focus-visible) { outline: 2px solid #7aa7ff; outline-offset: 1px; }
  .config label { display: grid; gap: 2px; cursor: pointer; }
  .config label::after { position: absolute; inset: 0; content: ""; }
  .config-name { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 600; }
  .config-description { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; opacity: .7; }
  .config-description code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; }
  .config-meta { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-self: start; font-size: 11px; }
  .config-meta a { font-weight: 400; color: #9ab8ff; }
  .badge { padding: 0 6px; border: 1px solid rgb(255 255 255 / .25); border-radius: 999px; opacity: .8; }
  .note { margin: 8px 0 0; padding: 6px 8px; font-size: 11px; background: rgb(255 200 80 / .1); border-radius: 6px; }
  .empty { padding: 12px; text-align: center; opacity: .6; }
  [hidden] { display: none !important; }

  footer { flex-wrap: wrap; }
  .action { padding: 4px 10px; font-weight: 600; border: 1px solid rgb(255 255 255 / .18); border-radius: 6px; }
  .action:hover { text-decoration: none; background: rgb(255 255 255 / .1); }
  .source { flex-basis: 100%; font-size: 11px; opacity: .55; overflow-wrap: anywhere; }
`

const escapeHtml = value => String(value).replace(/[&<>"]/g, char => `&#${char.charCodeAt(0)};`)
// READMEs write code in backticks.
const inlineCode = text => escapeHtml(text).replace(/`([^`]+)`/g, '<code>$1</code>')
const capitalize = text => text.charAt(0).toUpperCase() + text.slice(1)

export function mountToolbar({ source, configs, swappable }) {
  const prefs = window.playgroundPrefs
  if (!prefs) {
    console.warn('[playground] playground-prefs.js is not loaded on this page; the toolbar is disabled.')
    return
  }

  const configNamed = name => configs.find(config => config.name === name)

  // Auto, Light and Dark, the custom color modes of the current config
  // (configs/color-modes-custom/), and the current one if it's another, set
  // with ?theme=.
  const colorModes = current => [...new Set([
    ...COLOR_MODES,
    ...(configNamed(current.config)?.colorModes ?? []),
    current.colorMode
  ])]

  let render = () => {}
  let togglePanel = () => {}
  let dismissHint = () => {}

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
    } else if (event.code === 'KeyP' && !prefs.embedded) {
      togglePanel()
    } else {
      return
    }

    event.preventDefault()
    dismissHint()
  })

  // Keep tabs in sync.
  window.addEventListener('storage', () => {
    prefs.apply(prefs.effective())
    render(prefs.effective())
  })

  // And the page, when it saves a preference.
  window.addEventListener('playground-prefs', () => render(prefs.effective()))

  if (prefs.embedded) {
    return
  }

  const host = document.createElement('div')
  host.id = 'playground-toolbar'
  const shadow = host.attachShadow({ mode: 'open' })

  const radio = (name, value, content, { className = '', label = '', style = '' } = {}) => `
    <label${className ? ` class="${className}"` : ''}${style ? ` style="${style}"` : ''}${label ? ` title="${escapeHtml(label)}"` : ''}>
      <input type="radio" name="${name}" value="${escapeHtml(value)}"${label ? ` aria-label="${escapeHtml(label)}"` : ''}>${content}
    </label>`
  const segmented = (name, options) => options.map(([value, text]) => radio(name, value, escapeHtml(text))).join('')
  const modeOptions = modes => modes.map(mode => [mode, capitalize(mode)])
  const sourceOptions = [['src', 'Source'], ['dist', 'Dist']]
  const row = (legend, name, options, shortcut = '') => `
    <fieldset class="row">
      <legend>${legend}${shortcut ? ` <kbd>${shortcut}</kbd>` : ''}</legend>
      <div class="segmented" data-radios="${name}">${segmented(name, options)}</div>
    </fieldset>`

  const swatches = HUES.map(hue => (hue === 'default' ?
    radio('primary', hue, 'Default', { className: 'swatch default', label: 'Default primary' }) :
    radio('primary', hue, '', { className: 'swatch', label: capitalize(hue), style: `background: var(--bs-${hue}-500, #71717a)` }))).join('')

  // The working copy leads the first category, next to `default`.
  const working = { name: 'working', label: 'src/styles', category: 'baseline', description: 'The working copy in `src/styles/`, what pages use until a config is applied.', gaps: [] }
  const configRow = ({ name, label, description, gaps, tokensOnly }) => `
    <div class="config" data-config="${escapeHtml(name)}" data-search="${escapeHtml(`${name} ${label ?? ''} ${description}`.toLowerCase())}">
      <label>
        <input type="radio" name="config" value="${escapeHtml(name)}"${swappable ? '' : ' disabled'}>
        <span class="config-name">${escapeHtml(label ?? name)}</span>
        ${description ? `<span class="config-description">${inlineCode(description)}</span>` : ''}
      </label>
      ${(tokensOnly && name !== 'default') || gaps.length > 0 ? `
        <span class="config-meta">
          ${tokensOnly && name !== 'default' ? '<span class="badge" title="Only changes tokens.css, so it also applies on top of the prebuilt dist">tokens only</span>' : ''}
          ${gaps.map(issue => `<a href="${REPOSITORY_URL}/issues/${issue}" target="_blank" rel="noopener" title="Known gap: tracking issue #${issue}">#${issue}</a>`).join('')}
        </span>` : ''}
    </div>`
  const categories = groupConfigs([working, ...configs]).map(({ id, label, description, configs }) => `
    <fieldset class="category" data-category="${escapeHtml(id)}">
      <legend>${escapeHtml(label)} <span>${configs.filter(config => config !== working).length}</span></legend>
      ${configs.map(configRow).join('')}
    </fieldset>`).join('')

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
  // The credit stays visible while the panel is closed.
  const origin = document.querySelector('meta[name="playground-source"]')
  const originHtml = origin ? `
      <span class="origin">Adapted from <a href="${escapeHtml(origin.dataset.url)}" target="_blank" rel="noopener">${escapeHtml(origin.content)}</a>${origin.dataset.license ? ` (${escapeHtml(origin.dataset.license)})` : ''}</span>` : ''

  shadow.innerHTML = `
    <style>${styles}</style>
    <div class="dock">${originHtml}
      <div class="hint" role="note" aria-labelledby="hint-title" hidden>
        <p><strong id="hint-title">Playground settings</strong><span id="hint-text">Switch the config, color mode, direction, primary color and dist from here.</span> <kbd>Alt+Shift+P</kbd></p>
        <button type="button" class="icon dismiss" aria-label="Dismiss" title="Dismiss">${ICONS.close}</button>
      </div>
      <div class="pill" role="group" aria-label="Playground">
        <a class="icon" href="${import.meta.env.BASE_URL}" title="All pages" aria-label="All pages">${ICONS.home}</a>${pagerHtml}
        <button type="button" class="summary" aria-haspopup="dialog" aria-expanded="false" aria-controls="panel" aria-keyshortcuts="Alt+Shift+P" title="Playground settings (Alt+Shift+P)">
          ${ICONS.sliders}<span class="summary-text"></span>
        </button>
        <button type="button" class="icon search" title="Go to another page (${paletteShortcut})" aria-label="Go to another page" aria-keyshortcuts="${paletteShortcut === '⌘K' ? 'Meta+K' : 'Control+K'}">${ICONS.search}<kbd>${paletteShortcut}</kbd></button>
      </div>
    </div>
    <dialog id="panel" aria-labelledby="panel-title">
      <header>
        <h2 id="panel-title">Playground settings</h2>
        <button type="button" class="icon close" aria-label="Close" title="Close (Esc)">${ICONS.close}</button>
      </header>
      <section aria-labelledby="panel-environment">
        <h3 id="panel-environment">Environment</h3>
        ${row('Color mode', 'colorMode', [], 'Alt+Shift+T')}
        ${row('Direction', 'dir', [['ltr', 'LTR'], ['rtl', 'RTL']], 'Alt+Shift+D')}
        ${row('CSS', 'css', sourceOptions)}
        ${row('JavaScript', 'js', sourceOptions)}
      </section>
      <section aria-labelledby="panel-theme">
        <h3 id="panel-theme">Theme</h3>
        <fieldset class="row">
          <legend>Primary</legend>
          <div class="swatches">${swatches}</div>
        </fieldset>
      </section>
      <section aria-labelledby="panel-config">
        <h3 id="panel-config">Config</h3>
        <input type="search" class="filter" placeholder="Filter ${configs.length} configs…" aria-label="Filter configs" autocomplete="off" spellcheck="false">
        <p class="note" data-note="swappable"${swappable ? ' hidden' : ''}>This page compiles its own styles, like an issue reproduction: configs don't apply here.</p>
        <p class="note" data-note="dist" hidden>With the CSS from dist, only this config's <code>tokens.css</code> applies: its Sass options can't.</p>
        ${categories}
        <p class="empty" hidden>No matching config</p>
      </section>
      <footer>
        <button type="button" class="action copy">Copy link</button>
        <a class="action" href="${compareUrl}">Compare</a>
        <button type="button" class="action reset" title="Back to Bootstrap's defaults">Reset</button>
        <span class="source" title="Bootstrap source">${escapeHtml(source)}</span>
      </footer>
    </dialog>`

  const panel = shadow.querySelector('dialog')
  const summary = shadow.querySelector('.summary')
  const summaryText = shadow.querySelector('.summary-text')
  const modeGroup = shadow.querySelector('[data-radios="colorMode"]')
  const filter = shadow.querySelector('.filter')
  const copy = shadow.querySelector('.copy')

  // What the pill shows, like `shadcn · dark · RTL · dist`.
  const describe = current => {
    const config = !swappable ? 'own styles' : configNamed(current.config) ? current.config : 'src/styles'
    const dist = current.css === 'dist' && current.js === 'dist' ? 'dist' : current.css === 'dist' ? 'CSS dist' : current.js === 'dist' ? 'JS dist' : ''
    return [
      config,
      current.colorMode !== 'auto' && current.colorMode,
      current.dir === 'rtl' && 'RTL',
      current.primary !== 'default' && current.primary,
      dist
    ].filter(Boolean).join(' · ')
  }

  // The current view as a link, with only what differs from the defaults.
  const shareUrl = current => {
    const url = new URL(location.href)
    for (const [param, key] of Object.entries(prefs.URL_PARAMS)) {
      if (current[key] === prefs.DEFAULTS[key]) {
        url.searchParams.delete(param)
      } else {
        url.searchParams.set(param, current[key])
      }
    }

    return url.href
  }

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
      modeGroup.innerHTML = segmented('colorMode', modeOptions(modes))
      modeGroup.dataset.modes = modes.join()
    }

    const values = { ...current, config: configNamed(current.config) ? current.config : 'working' }
    for (const input of shadow.querySelectorAll('input[type="radio"]')) {
      input.checked = values[input.name] === input.value
    }

    const text = describe(current)
    summaryText.textContent = text
    summary.setAttribute('aria-label', `Playground settings: ${text}`)
    shadow.querySelector('[data-note="dist"]').hidden = !(swappable && current.css === 'dist' && configNamed(current.config) && !configNamed(current.config).tokensOnly)
  }

  const applyFilter = () => {
    const words = filter.value.toLowerCase().split(/\s+/).filter(Boolean)
    let found = 0
    for (const category of shadow.querySelectorAll('.category')) {
      const label = category.querySelector('legend').textContent.toLowerCase()
      let visible = 0
      for (const item of category.querySelectorAll('.config')) {
        const match = words.every(word => item.dataset.search.includes(word) || label.includes(word))
        item.hidden = !match
        visible += match
      }

      category.hidden = visible === 0
      found += visible
    }

    shadow.querySelector('.empty').hidden = found > 0
  }

  const remember = open => {
    try {
      sessionStorage.setItem(OPEN_KEY, open ? '1' : '')
    } catch {}
  }

  const hint = shadow.querySelector('.hint')
  dismissHint = () => {
    if (hint.hidden) {
      return
    }

    hint.hidden = true
    summary.removeAttribute('aria-describedby')
    try {
      localStorage.setItem(HINT_KEY, 'seen')
    } catch {}
  }

  const openPanel = () => {
    dismissHint()
    if (panel.open) {
      return
    }

    panel.showModal()
    summary.setAttribute('aria-expanded', 'true')
    remember(true)
    // Start on the current choice rather than at the top of the list.
    shadow.querySelector('input[name="config"]:checked')?.closest('.config')?.scrollIntoView({ block: 'nearest' })
  }

  togglePanel = () => (panel.open ? panel.close() : openPanel())

  panel.addEventListener('close', () => {
    summary.setAttribute('aria-expanded', 'false')
    remember(false)
  })

  // A click on the backdrop reaches the dialog itself.
  panel.addEventListener('click', event => {
    if (event.target === panel) {
      panel.close()
    }
  })

  shadow.addEventListener('click', event => {
    const button = event.target.closest('button')
    if (!button) {
      return
    }

    if (button === summary) {
      openPanel()
    } else if (button.classList.contains('close')) {
      panel.close()
    } else if (button.classList.contains('dismiss')) {
      dismissHint()
    } else if (button.classList.contains('search')) {
      palette.open()
    } else if (button === copy) {
      navigator.clipboard.writeText(shareUrl(prefs.effective())).then(() => 'Copied', () => 'Copy failed').then(text => {
        copy.textContent = text
        setTimeout(() => {
          copy.textContent = 'Copy link'
        }, 1500)
      })
    } else if (button.classList.contains('reset')) {
      filter.value = ''
      applyFilter()
      render(saveAndReload(prefs.effective(), prefs.reset()))
    }
  })

  shadow.addEventListener('change', event => {
    const { name, value } = event.target
    if (event.target.type === 'radio') {
      render(saveAndReload(prefs.effective(), prefs.save({ [name]: value })))
    }
  })

  filter.addEventListener('input', applyFilter)
  filter.addEventListener('keydown', event => {
    // Escape clears the filter first, then closes the panel.
    if (event.key === 'Escape' && filter.value) {
      event.preventDefault()
      filter.value = ''
      applyFilter()
    }
  })

  render(prefs.effective())
  document.body.append(host)

  let open = false
  try {
    open = sessionStorage.getItem(OPEN_KEY) === '1'
  } catch {}

  if (open) {
    openPanel()
    return
  }

  let seen = true
  try {
    seen = localStorage.getItem(HINT_KEY) === 'seen'
  } catch {}

  if (!seen && !navigator.webdriver) {
    hint.hidden = false
    summary.setAttribute('aria-describedby', 'hint-text')
  }
}
