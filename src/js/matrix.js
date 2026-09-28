// One page, or one kitchen sink example, rendered under several configs at
// once: columns are configs, rows are theme × direction. Each cell is an
// iframe using the URL overrides of public/playground-prefs.js, without the
// toolbar or the page's own UI (`embed&chrome=0`). The state lives in the URL:
// /matrix.html?page=/kitchen-sink/components-button.html&section=sizes&configs=default,square,pill
//
// `npm run matrix` writes the same grid as one image, with a pixel diff
// against the first column (scripts/matrix.mjs).
import configs, { categories } from 'virtual:playground-configs'
import groups from 'virtual:playground-pages'

const escapeHtml = value => String(value).replace(/[&<>"]/g, char => `&#${char.charCodeAt(0)};`)

const CONFIG_NAMES = ['working', ...configs.map(({ name }) => name)]
// Bootstrap's defaults first, the reference for the diff, then the shapes.
const DEFAULT_CONFIGS = ['default', ...configs.filter(({ category }) => category === 'shape').map(({ name }) => name)]
const THEMES = ['light', 'dark']
const DIRS = ['ltr', 'rtl']

const state = new URLSearchParams(location.search)
const list = (name, fallback, allowed) => {
  const values = (state.get(name) ?? '').split(',').filter(value => allowed.includes(value))
  return values.length > 0 ? values : fallback
}

// Only same-origin paths: `page` ends up in a link's href and the iframes' src.
const toPath = value => {
  const url = new URL(value, location.origin)
  return url.origin === location.origin && url.protocol === location.protocol ? url.pathname : import.meta.env.BASE_URL
}

const view = {
  page: toPath(state.get('page') ?? `${import.meta.env.BASE_URL}kitchen-sink/components-button.html`),
  section: state.get('section') ?? '',
  configs: list('configs', DEFAULT_CONFIGS, CONFIG_NAMES),
  themes: list('themes', THEMES, THEMES),
  dirs: list('dirs', ['ltr'], DIRS),
  width: Math.min(Math.max(Number.parseInt(state.get('width'), 10) || 600, 240), 1600),
  zoom: ['0.5', '0.75', '1'].includes(state.get('zoom')) ? state.get('zoom') : '0.75',
  freeze: state.get('freeze') !== '0',
  diff: state.has('diff')
}

const pageInfo = url => groups.flatMap(group => group.pages.map(page => ({ ...page, dir: group.dir }))).find(page => page.url === url)

// Only kitchen sink pages have `?section=`: one example, by its heading's id.
const sectionsOf = url => {
  const page = pageInfo(url)
  return page?.dir === 'kitchen-sink' ? page.sections : []
}

const pageSelect = document.getElementById('matrix-page')
pageSelect.innerHTML = groups.map(group => `
  <optgroup label="${escapeHtml(group.label)}">
    ${group.pages.map(({ url, title }) => `<option value="${escapeHtml(url)}">${escapeHtml(title)}</option>`).join('')}
  </optgroup>`).join('')

const sectionSelect = document.getElementById('matrix-section')
const configList = document.getElementById('matrix-config-list')
const grid = document.getElementById('matrix-grid')

const byCategory = categories.map(category => ({ ...category, configs: configs.filter(config => config.category === category.id) }))
  .filter(category => category.configs.length > 0)
configList.innerHTML = [
  { label: 'Working copy', configs: [{ name: 'working', description: 'src/styles/, what you are editing' }] },
  ...byCategory
].map(({ label, configs }) => `
  <fieldset>
    <legend>${escapeHtml(label)}</legend>
    ${configs.map(({ name, description }) => `
      <label class="d-flex gap-1 align-items-center" title="${escapeHtml(description)}">
        <input type="checkbox" class="check" data-config="${escapeHtml(name)}"> ${escapeHtml(name)}
      </label>`).join('')}
  </fieldset>`).join('')

function frameUrl(config, theme, dir) {
  const url = new URL(view.page, location.origin)
  url.search = new URLSearchParams({ config, theme, dir, embed: '', chrome: '0' })
  if (view.section) {
    url.searchParams.set('section', view.section)
    url.searchParams.set('frame', '0')
  }

  if (view.freeze) {
    url.searchParams.set('freeze', '')
  }

  return url.pathname + url.search
}

// Sizes a cell to its frames' content, scaled by the zoom, and follows it
// when the content changes (fonts, images, a component opening).
function fit(cell) {
  const frames = [...cell.querySelectorAll('iframe')]
  const zoom = Number(view.zoom)
  // The <html> box, not scrollHeight, which never drops below the frame's own height.
  const heights = frames.map(frame => Math.ceil(frame.contentDocument?.documentElement.getBoundingClientRect().height ?? 0))
  const height = Math.max(...heights, 40)
  for (const frame of frames) {
    frame.style.blockSize = `${height}px`
  }

  cell.style.blockSize = `${Math.ceil(height * zoom)}px`
}

function watch(frame) {
  frame.addEventListener('load', () => {
    const cell = frame.closest('.matrix-cell')
    const win = frame.contentWindow
    fit(cell)
    new win.ResizeObserver(() => fit(cell)).observe(win.document.documentElement)
  })
}

function renderGrid() {
  const zoom = Number(view.zoom)
  const columns = view.configs
  const rows = view.themes.flatMap(theme => view.dirs.map(dir => ({ theme, dir })))
  grid.style.gridTemplateColumns = `auto repeat(${columns.length}, ${Math.round(view.width * zoom)}px)`

  const frame = (config, { theme, dir }, className = '') => `<iframe${className ? ` class="${className}"` : ''} title="${escapeHtml(`${config}, ${theme}, ${dir}${className ? ', diff overlay' : ''}`)}"
      src="${escapeHtml(frameUrl(config, theme, dir))}" loading="lazy" style="inline-size: ${view.width}px; transform: scale(${zoom})"${className ? ' tabindex="-1" aria-hidden="true"' : ''}></iframe>`

  grid.innerHTML = [
    '<div class="matrix-head matrix-corner"></div>',
    ...columns.map(config => `<div class="matrix-head" title="${escapeHtml(configs.find(({ name }) => name === config)?.description ?? 'src/styles/')}">${escapeHtml(config)}</div>`),
    ...rows.flatMap(row => [
      `<div class="matrix-row-head">${row.theme} · ${row.dir}</div>`,
      ...columns.map((config, index) => `<div class="matrix-cell">
        ${frame(config, row)}
        ${view.diff && index > 0 ? frame(columns[0], row, 'matrix-diff') : ''}
      </div>`)
    ])
  ].join('')

  for (const frame of grid.querySelectorAll('iframe')) {
    watch(frame)
  }
}

function render() {
  pageSelect.value = view.page
  const sections = sectionsOf(view.page)
  if (!sections.some(({ id }) => id === view.section)) {
    view.section = ''
  }

  sectionSelect.innerHTML = `<option value="">Whole page</option>${sections.map(({ id, title }) => `<option value="${escapeHtml(id)}">${escapeHtml(title)}</option>`).join('')}`
  sectionSelect.value = view.section
  sectionSelect.disabled = sections.length === 0

  for (const input of configList.querySelectorAll('[data-config]')) {
    input.checked = view.configs.includes(input.dataset.config)
  }

  document.getElementById('matrix-config-count').textContent = `(${view.configs.length})`
  for (const input of document.querySelectorAll('[data-row]')) {
    input.checked = view[`${input.dataset.row}s`].includes(input.value)
  }

  document.getElementById('matrix-width').value = view.width
  document.getElementById('matrix-zoom').value = view.zoom
  document.getElementById('matrix-freeze').checked = view.freeze
  document.getElementById('matrix-diff').checked = view.diff
  document.getElementById('matrix-open').href = view.page

  const params = new URLSearchParams({ page: view.page })
  if (view.section) {
    params.set('section', view.section)
  }

  params.set('configs', view.configs.join(','))
  params.set('themes', view.themes.join(','))
  params.set('dirs', view.dirs.join(','))
  params.set('width', view.width)
  params.set('zoom', view.zoom)
  if (!view.freeze) {
    params.set('freeze', '0')
  }

  if (view.diff) {
    params.set('diff', '')
  }

  history.replaceState(null, '', `?${params}`)
  renderGrid()
}

// Keeps the order of CONFIG_NAMES, and at least one value.
const toggle = (values, value, on, order) => {
  const next = order.filter(item => (item === value ? on : values.includes(item)))
  return next.length > 0 ? next : values
}

document.addEventListener('change', event => {
  const { target } = event
  if (target === pageSelect) {
    view.page = target.value
    view.section = ''
  } else if (target === sectionSelect) {
    view.section = target.value
  } else if (target.dataset.config) {
    view.configs = toggle(view.configs, target.dataset.config, target.checked, CONFIG_NAMES)
  } else if (target.dataset.row) {
    const key = `${target.dataset.row}s`
    view[key] = toggle(view[key], target.value, target.checked, target.dataset.row === 'theme' ? THEMES : DIRS)
  } else if (target.id === 'matrix-width') {
    view.width = Math.min(Math.max(Number.parseInt(target.value, 10) || view.width, 240), 1600)
  } else if (target.id === 'matrix-zoom') {
    view.zoom = target.value
  } else if (target.id === 'matrix-freeze') {
    view.freeze = target.checked
  } else if (target.id === 'matrix-diff') {
    view.diff = target.checked
  } else {
    return
  }

  render()
})

render()
