// Comparison of one page under two to four sets of preferences, using the URL
// overrides understood by public/playground-prefs.js. The state lives in the
// URL: /compare.html?page=/pages/dashboard.html&a=theme%3Dlight&b=theme%3Ddark
// Panes `c` and `d` add a third and a fourth pane. `mode` stacks the first two
// panes instead (`overlay`, with `opacity`; `slider`, with `split`;
// `difference`), each 0 to 100.
//
// Under `npm run diff-bootstrap -- <from> <to> --serve`, a second Bootstrap
// commit is served under /b/, and a pane's `bootstrap` field picks A or B.
import configs from 'virtual:playground-configs'
import groups from 'virtual:playground-pages'

// Set by `diff-bootstrap --serve`: labels of the two commits being served.
const COMMITS = import.meta.env.VITE_BOOTSTRAP_B ? { a: import.meta.env.VITE_BOOTSTRAP_A, b: import.meta.env.VITE_BOOTSTRAP_B } : null

const FIELDS = {
  ...(COMMITS ? { bootstrap: { label: 'Bootstrap', options: ['a', 'b'], labels: COMMITS } } : {}),
  // The configs' own color modes too, like `sepia` from configs/color-modes-custom/.
  theme: { label: 'Theme', options: [...new Set(['auto', 'light', 'dark', ...configs.flatMap(config => config.colorModes)])] },
  dir: { label: 'Dir', options: ['ltr', 'rtl'] },
  primary: { label: 'Primary', options: ['default', 'indigo', 'violet', 'purple', 'pink', 'red', 'orange', 'amber', 'lime', 'green', 'teal', 'cyan', 'brown', 'gray'] },
  config: { label: 'Styles', options: ['working', ...configs.map(config => config.name)] },
  css: { label: 'CSS', options: ['src', 'dist'] },
  js: { label: 'JS', options: ['src', 'dist'] }
}

// The two sides of each preset; `grid` fills four panes: light on the first
// row, dark on the second, so the stacked views compare the first column with
// the second in light.
const AFTER = COMMITS ? { bootstrap: 'b' } : { config: 'default' }
const BEFORE = COMMITS ? { bootstrap: 'a' } : { config: 'working' }
const PRESETS = {
  theme: [{ theme: 'light' }, { theme: 'dark' }],
  dir: [{ dir: 'ltr' }, { dir: 'rtl' }],
  config: [{ config: 'working' }, { config: 'default' }],
  // The compiled default config against the prebuilt files it should match.
  dist: [{ config: 'default', css: 'src', js: 'src' }, { config: 'default', css: 'dist', js: 'dist' }],
  commits: [{ bootstrap: 'a' }, { bootstrap: 'b' }],
  grid: ['light', 'dark'].flatMap(theme => [{ theme, ...BEFORE }, { theme, ...AFTER }])
}

// Pane parameters in the URL, in order. Missing panes up to the last one
// present take these, then copy the pane before them.
const PANES = ['a', 'b', 'c', 'd']
const DEFAULT_PANES = ['theme=light', 'theme=dark']
// Every view but the first stacks the first two panes in one box.
const MODES = ['side', 'overlay', 'slider', 'difference']
// Accessible names of the panes, by count and in the stacked views.
const NAMES = {
  2: ['Left', 'Right'],
  3: ['Left', 'Middle', 'Right'],
  4: ['Top left', 'Top right', 'Bottom left', 'Bottom right'],
  overlay: ['Under', 'Over'],
  slider: ['Left', 'Right'],
  difference: ['Under', 'Over']
}

const escapeHtml = value => String(value).replace(/[&<>"]/g, char => `&#${char.charCodeAt(0)};`)
// A whole number from 0 to 100, or `fallback` for anything else.
const toPercent = (value, fallback) => (/^\d+$/.test(value ?? '') && Number(value) <= 100 ? Number(value) : fallback)

const state = new URLSearchParams(location.search)
const panes = []
for (const [index, key] of PANES.slice(0, Math.max(PANES.findLastIndex(key => state.has(key)) + 1, 2)).entries()) {
  panes.push(new URLSearchParams(state.get(key) ?? DEFAULT_PANES[index] ?? panes[index - 1]))
}

const view = {
  mode: MODES.includes(state.get('mode')) ? state.get('mode') : 'side',
  opacity: toPercent(state.get('opacity'), 50),
  split: toPercent(state.get('split'), 50)
}

// Only same-origin paths: `page` ends up in a link's href and the iframes' src.
const toPath = value => {
  const url = new URL(value, location.origin)
  return url.origin === location.origin && url.protocol === location.protocol ? url.pathname : import.meta.env.BASE_URL
}

let page = toPath(state.get('page') ?? `${import.meta.env.BASE_URL}pages/dashboard.html`)

const pageSelect = document.getElementById('compare-page')
pageSelect.innerHTML = [{ label: 'Home', pages: [{ url: import.meta.env.BASE_URL, title: 'Home' }] }, ...groups].map(group => `
  <optgroup label="${escapeHtml(group.label)}">
    ${group.pages.map(({ url, title }) => `<option value="${escapeHtml(url)}">${escapeHtml(title)}</option>`).join('')}
  </optgroup>`).join('')

document.querySelector('[data-preset="commits"]').hidden = !COMMITS
document.querySelector('[data-preset="grid"]').textContent = `Light / Dark × ${COMMITS ? 'Commit A / B' : 'Working / Default'}`

const container = document.getElementById('compare-panes')
const handle = document.getElementById('compare-handle')
const modeSelect = document.getElementById('compare-mode')
const addButton = document.getElementById('compare-add')
const syncInput = document.getElementById('compare-sync')
const ranges = { opacity: document.getElementById('compare-opacity'), split: document.getElementById('compare-split') }
// What the checkbox says in the side-by-side view: the stacked views always sync.
let syncChosen = syncInput.checked

const sections = () => [...container.querySelectorAll(':scope > .compare-pane')]
const frames = () => sections().map(section => section.querySelector('iframe'))
const isStacked = () => view.mode !== 'side'

// Commit B's pages live under /b/.
const B_PREFIX = '/b'

function frameUrl(pane) {
  const onB = COMMITS && pane.get('bootstrap') === 'b'
  const url = new URL(onB ? `${B_PREFIX}${page}` : page, location.origin)
  for (const [key, value] of pane) {
    if (key !== 'bootstrap') {
      url.searchParams.set(key, value)
    }
  }

  url.searchParams.set('embed', '')
  return url.pathname + url.search
}

// The page a frame shows, without the /b/ prefix, or null before it loads one.
function framePath(frame) {
  const win = frame.contentWindow
  if (!win || win.location.href === 'about:blank') {
    return null
  }

  return COMMITS ? win.location.pathname.replace(new RegExp(`^${B_PREFIX}(?=/)`), '') : win.location.pathname
}

const showsPage = frame => frame.contentDocument?.readyState === 'complete' && framePath(frame) === new URL(page, location.origin).pathname

// Keep every frame at the same scroll position, and follow in-frame navigation.
let syncing = false
function syncScroll(from) {
  if (syncing || !syncInput.checked) {
    return
  }

  const { scrollX, scrollY } = from.contentWindow
  syncing = true
  for (const frame of frames()) {
    const win = frame.contentWindow
    if (frame !== from && showsPage(frame) && (win.scrollX !== scrollX || win.scrollY !== scrollY)) {
      win.scrollTo(scrollX, scrollY)
    }
  }

  requestAnimationFrame(() => {
    syncing = false
  })
}

function createPane() {
  const section = document.createElement('section')
  section.className = 'compare-pane'
  section.innerHTML = `<div class="compare-side">
      ${Object.entries(FIELDS).map(([name, { label, options, labels }]) => `
      <label class="d-flex gap-1 align-items-center">${label}
        <select class="form-control form-control-sm" data-field="${name}">
          ${['config', 'primary', 'bootstrap'].includes(name) ? '' : '<option value="">saved</option>'}
          ${options.map(option => `<option value="${option}">${escapeHtml(labels ? `${option.toUpperCase()}: ${labels[option]}` : option)}</option>`).join('')}
        </select>
      </label>`).join('')}
    </div>
    <iframe></iframe>`

  const frame = section.querySelector('iframe')
  frame.addEventListener('load', () => {
    const path = framePath(frame)
    if (path === null) {
      return
    }

    if (path !== new URL(page, location.origin).pathname) {
      page = path
      render()
      return
    }

    frame.contentWindow.addEventListener('scroll', () => syncScroll(frame))
    // A frame that reloads (new settings) catches up with the others.
    const other = frames().find(candidate => candidate !== frame && showsPage(candidate))
    if (other && syncInput.checked) {
      frame.contentWindow.scrollTo(other.contentWindow.scrollX, other.contentWindow.scrollY)
    }
  })
  return section
}

// The opacity, the split and their controls, which change while dragging
// without touching the URL: Safari limits how often it may be replaced.
function renderView() {
  container.style.setProperty('--compare-opacity', view.opacity / 100)
  container.style.setProperty('--compare-split', `${view.split}%`)
  for (const [name, input] of Object.entries(ranges)) {
    input.value = view[name]
    input.setAttribute('aria-valuetext', `${view[name]}%`)
    input.parentElement.nextElementSibling.textContent = `${view[name]}%`
  }
}

function writeUrl() {
  const params = new URLSearchParams({ page })
  for (const [index, pane] of panes.entries()) {
    params.set(PANES[index], pane.toString())
  }

  if (view.mode !== 'side') {
    params.set('mode', view.mode)
  }

  for (const name of ['opacity', 'split']) {
    if (view[name] !== 50) {
      params.set(name, view[name])
    }
  }

  history.replaceState(null, '', `?${params}`)
}

function render() {
  pageSelect.value = page
  while (sections().length < panes.length) {
    container.insertBefore(createPane(), handle)
  }

  for (const section of sections().slice(panes.length)) {
    section.remove()
  }

  const stacked = isStacked()
  container.classList.toggle('compare-stacked', stacked)
  container.dataset.mode = view.mode
  container.dataset.count = panes.length
  for (const [index, section] of sections().entries()) {
    const name = (stacked && index < 2 ? NAMES[view.mode] : NAMES[panes.length])[index]
    const frame = section.querySelector('iframe')
    section.dataset.pane = index
    section.hidden = stacked && index > 1
    section.setAttribute('aria-label', name)
    frame.title = name
    // The blended frame is only a picture of the differences, as in the matrix.
    frame.inert = view.mode === 'difference' && index === 1
    for (const select of section.querySelectorAll('select[data-field]')) {
      select.value = panes[index].get(select.dataset.field) ?? (select.options[0]?.value ?? '')
    }

    let remove = section.querySelector('[data-remove]')
    if (index > 1 && !remove) {
      remove = document.createElement('button')
      remove.type = 'button'
      remove.className = 'btn-outline theme-secondary btn-sm ms-auto'
      remove.dataset.remove = ''
      remove.textContent = 'Remove'
      section.querySelector('.compare-side').append(remove)
    } else if (index <= 1) {
      remove?.remove()
    }

    remove?.setAttribute('aria-label', `Remove the ${name.toLowerCase()} pane`)

    const url = frameUrl(panes[index])
    if (frame.getAttribute('src') !== url) {
      frame.setAttribute('src', url)
    }
  }

  modeSelect.value = view.mode
  document.getElementById('compare-opacity-field').hidden = view.mode !== 'overlay'
  document.getElementById('compare-split-field').hidden = view.mode !== 'slider'
  addButton.disabled = stacked || panes.length >= PANES.length
  // Stacked frames must stay at the same scroll position.
  syncInput.disabled = stacked
  syncInput.checked = stacked || syncChosen
  renderView()

  document.getElementById('compare-open').href = page
  writeUrl()
}

pageSelect.addEventListener('change', () => {
  page = pageSelect.value
  render()
})

modeSelect.addEventListener('change', () => {
  view.mode = MODES.includes(modeSelect.value) ? modeSelect.value : 'side'
  render()
  const [first] = frames()
  if (isStacked() && showsPage(first)) {
    syncScroll(first)
  }
})

syncInput.addEventListener('change', () => {
  syncChosen = syncInput.checked
})

for (const [name, input] of Object.entries(ranges)) {
  input.addEventListener('input', () => {
    view[name] = toPercent(input.value, 50)
    renderView()
  })
  input.addEventListener('change', writeUrl)
}

document.addEventListener('change', event => {
  const { field } = event.target.dataset
  const section = event.target.closest('.compare-pane')
  if (field && section) {
    const pane = panes[Number(section.dataset.pane)]
    if (event.target.value) {
      pane.set(field, event.target.value)
    } else {
      pane.delete(field)
    }

    render()
  }
})

document.addEventListener('click', event => {
  const preset = PRESETS[event.target.closest('[data-preset]')?.dataset.preset]
  if (preset) {
    panes.splice(0, panes.length, ...preset.map(settings => new URLSearchParams(settings)))
    render()
  } else if (event.target === addButton && panes.length < PANES.length) {
    panes.push(new URLSearchParams(panes.at(-1)))
    render()
  } else if (event.target.closest('[data-remove]')) {
    panes.splice(Number(event.target.closest('.compare-pane').dataset.pane), 1)
    render()
  }
})

// Dragging the slider's handle. The frames would take the pointer as it
// crosses them, so they ignore it until the drag ends.
function dragTo(event) {
  const box = frames()[0].getBoundingClientRect()
  const ratio = (event.clientX - box.left) / box.width
  view.split = Math.round(Math.min(Math.max(getComputedStyle(container).direction === 'rtl' ? 1 - ratio : ratio, 0), 1) * 100)
  renderView()
}

handle.addEventListener('pointerdown', event => {
  handle.setPointerCapture(event.pointerId)
  container.classList.add('compare-dragging')
  dragTo(event)
})
handle.addEventListener('pointermove', event => {
  if (handle.hasPointerCapture(event.pointerId)) {
    dragTo(event)
  }
})
handle.addEventListener('lostpointercapture', () => {
  container.classList.remove('compare-dragging')
  writeUrl()
})

render()
