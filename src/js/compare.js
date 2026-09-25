// Side-by-side comparison of one page under two sets of preferences, using the
// URL overrides understood by public/playground-prefs.js. The state lives in
// the URL: /compare.html?page=/pages/dashboard.html&a=theme%3Dlight&b=theme%3Ddark
import configs from 'virtual:playground-configs'
import groups from 'virtual:playground-pages'

const FIELDS = {
  theme: { label: 'Theme', options: ['auto', 'light', 'dark'] },
  dir: { label: 'Dir', options: ['ltr', 'rtl'] },
  primary: { label: 'Primary', options: ['default', 'indigo', 'violet', 'purple', 'pink', 'red', 'orange', 'amber', 'lime', 'green', 'teal', 'cyan', 'brown', 'gray'] },
  config: { label: 'Styles', options: ['working', ...configs.map(config => config.name)] }
}

const PRESETS = {
  theme: [{ theme: 'light' }, { theme: 'dark' }],
  dir: [{ dir: 'ltr' }, { dir: 'rtl' }],
  config: [{ config: 'working' }, { config: 'default' }]
}

const escapeHtml = value => String(value).replace(/[&<>"]/g, char => `&#${char.charCodeAt(0)};`)

const state = new URLSearchParams(location.search)
const sides = { a: new URLSearchParams(state.get('a') ?? 'theme=light'), b: new URLSearchParams(state.get('b') ?? 'theme=dark') }
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

for (const pane of document.querySelectorAll('.compare-pane')) {
  const side = pane.dataset.side
  pane.querySelector('.compare-side').innerHTML = Object.entries(FIELDS).map(([name, { label, options }]) => `
    <label class="d-flex gap-1 align-items-center">${label}
      <select class="form-control form-control-sm" data-side="${side}" data-field="${name}">
        ${name === 'config' || name === 'primary' ? '' : '<option value="">saved</option>'}
        ${options.map(option => `<option value="${option}">${option}</option>`).join('')}
      </select>
    </label>`).join('')
}

const frames = Object.fromEntries([...document.querySelectorAll('.compare-pane')].map(pane => [pane.dataset.side, pane.querySelector('iframe')]))

function frameUrl(side) {
  const url = new URL(page, location.origin)
  for (const [key, value] of sides[side]) {
    url.searchParams.set(key, value)
  }

  url.searchParams.set('embed', '')
  return url.pathname + url.search
}

function render() {
  pageSelect.value = page
  for (const select of document.querySelectorAll('select[data-side]')) {
    select.value = sides[select.dataset.side].get(select.dataset.field) ?? (select.options[0]?.value ?? '')
  }

  for (const [side, frame] of Object.entries(frames)) {
    const url = frameUrl(side)
    if (frame.getAttribute('src') !== url) {
      frame.setAttribute('src', url)
    }
  }

  document.getElementById('compare-open').href = page
  const params = new URLSearchParams({ page, a: sides.a.toString(), b: sides.b.toString() })
  history.replaceState(null, '', `?${params}`)
}

pageSelect.addEventListener('change', () => {
  page = pageSelect.value
  render()
})

document.addEventListener('change', event => {
  const { side, field } = event.target.dataset
  if (side && field) {
    if (event.target.value) {
      sides[side].set(field, event.target.value)
    } else {
      sides[side].delete(field)
    }

    render()
  }
})

document.addEventListener('click', event => {
  const preset = PRESETS[event.target.dataset?.preset]
  if (preset) {
    sides.a = new URLSearchParams(preset[0])
    sides.b = new URLSearchParams(preset[1])
    render()
  }
})

// Keep both frames at the same scroll position, and follow in-frame navigation.
let syncing = false
for (const [side, frame] of Object.entries(frames)) {
  frame.addEventListener('load', () => {
    const win = frame.contentWindow
    const path = win.location.pathname
    if (path !== new URL(page, location.origin).pathname) {
      page = path
      render()
      return
    }

    win.addEventListener('scroll', () => {
      if (syncing || !document.getElementById('compare-sync').checked) {
        return
      }

      const other = frames[side === 'a' ? 'b' : 'a'].contentWindow
      syncing = true
      other.scrollTo(win.scrollX, win.scrollY)
      requestAnimationFrame(() => {
        syncing = false
      })
    })
  })
}

render()
