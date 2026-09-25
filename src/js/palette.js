// Page switcher: Ctrl+K (⌘K on macOS) on any page opens a search over every
// page and its example headings. Like the toolbar, it renders in a shadow root
// so it neither inherits from nor leaks into the page under test.
import { pages, readRecent, resultUrl, search } from './page-index.js'

const MAX_RESULTS = 50

const styles = `
  :host { all: initial; }
  dialog {
    inline-size: min(40rem, calc(100vw - 24px));
    max-block-size: min(32rem, calc(100vh - 96px));
    margin-block-start: 12vh;
    padding: 0;
    overflow: hidden;
    font: 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #e6e6e6;
    background: rgb(24 24 27 / .97);
    border: 1px solid rgb(255 255 255 / .12);
    border-radius: 12px;
    box-shadow: 0 24px 64px rgb(0 0 0 / .45);
  }
  dialog[open] { display: flex; flex-direction: column; }
  dialog::backdrop { background: rgb(0 0 0 / .35); backdrop-filter: blur(2px); }
  input {
    box-sizing: border-box;
    inline-size: 100%;
    padding: 14px 16px;
    font: inherit;
    font-size: 16px;
    color: inherit;
    background: transparent;
    border: 0;
    border-block-end: 1px solid rgb(255 255 255 / .1);
    outline: 0;
  }
  input::placeholder { color: rgb(255 255 255 / .4); }
  ul { flex: 1; margin: 0; padding: 6px; overflow-y: auto; list-style: none; }
  li { margin: 0; }
  .heading { padding: 8px 10px 4px; font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; opacity: .5; }
  a {
    display: flex;
    gap: 10px;
    align-items: baseline;
    padding: 8px 10px;
    color: inherit;
    text-decoration: none;
    border-radius: 8px;
  }
  a[aria-selected="true"] { background: rgb(255 255 255 / .1); }
  .title { overflow: hidden; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .section { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: .75; }
  .group { flex-shrink: 0; margin-inline-start: auto; font-size: 12px; opacity: .5; }
  .current { font-size: 11px; opacity: .5; }
  .empty { padding: 24px; text-align: center; opacity: .6; }
  footer { display: flex; gap: 16px; padding: 8px 14px; font-size: 11px; border-block-start: 1px solid rgb(255 255 255 / .1); opacity: .55; }
  kbd { font: inherit; padding: 0 4px; border: 1px solid rgb(255 255 255 / .25); border-radius: 4px; }
`

const escapeHtml = value => String(value).replace(/[&<>"]/g, char => `&#${char.charCodeAt(0)};`)

export const paletteShortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl+K'

export function mountPalette() {
  const host = document.createElement('div')
  host.id = 'playground-palette'
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = `
    <style>${styles}</style>
    <dialog aria-label="Go to page">
      <input type="text" placeholder="Go to a page or an example…" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="palette-results" aria-autocomplete="list">
      <ul id="palette-results" role="listbox" aria-label="Pages"></ul>
      <footer><span><kbd>↑</kbd> <kbd>↓</kbd> to move</span><span><kbd>Enter</kbd> to open</span><span><kbd>Esc</kbd> to close</span></footer>
    </dialog>`

  const dialog = shadow.querySelector('dialog')
  const input = shadow.querySelector('input')
  const list = shadow.querySelector('ul')
  let items = []
  let selected = 0

  const option = (result, index) => {
    const { page, section } = result
    const current = page.url === location.pathname
    return `
      <li role="presentation">
        <a href="${escapeHtml(resultUrl(result))}" role="option" id="palette-option-${index}" data-index="${index}" aria-selected="${index === selected}">
          <span class="title">${escapeHtml(page.title)}</span>
          ${section ? `<span class="section">› ${escapeHtml(section.title)}</span>` : ''}
          ${current ? '<span class="current">(this page)</span>' : ''}
          <span class="group">${escapeHtml(page.groupLabel)}</span>
        </a>
      </li>`
  }

  const render = () => {
    const query = input.value.trim()
    let html = ''
    if (query) {
      items = search(query).slice(0, MAX_RESULTS)
      html = items.map(option).join('')
    } else {
      // No query: recent pages first, then everything else.
      const recent = readRecent()
      const rest = pages.filter(page => !recent.includes(page))
      items = [...recent, ...rest].slice(0, MAX_RESULTS).map(page => ({ page }))
      html = [
        recent.length > 0 ? '<li class="heading" role="presentation">Recent</li>' : '',
        ...items.slice(0, recent.length).map(option),
        items.length > recent.length ? `<li class="heading" role="presentation">${recent.length > 0 ? 'All pages' : 'Pages'}</li>` : '',
        ...items.slice(recent.length).map((item, index) => option(item, index + recent.length))
      ].join('')
    }

    list.innerHTML = items.length > 0 ? html : '<li class="empty" role="presentation">No matching page</li>'
    input.setAttribute('aria-activedescendant', items.length > 0 ? `palette-option-${selected}` : '')
  }

  const select = index => {
    if (items.length === 0) {
      return
    }

    selected = (index + items.length) % items.length
    for (const link of list.querySelectorAll('a')) {
      link.setAttribute('aria-selected', String(Number(link.dataset.index) === selected))
    }

    input.setAttribute('aria-activedescendant', `palette-option-${selected}`)
    list.querySelector(`[data-index="${selected}"]`)?.scrollIntoView({ block: 'nearest' })
  }

  const open = () => {
    if (dialog.open) {
      input.select()
      return
    }

    input.value = ''
    selected = 0
    render()
    dialog.showModal()
    input.focus()
  }

  const go = (url, newTab) => {
    if (newTab) {
      window.open(url, '_blank', 'noopener')
    } else {
      dialog.close()
      location.href = url
    }
  }

  input.addEventListener('input', () => {
    selected = 0
    render()
  })

  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      select(selected + (event.key === 'ArrowDown' ? 1 : -1))
    } else if (event.key === 'Escape') {
      event.preventDefault()
      dialog.close()
    } else if (event.key === 'Enter' && items[selected]) {
      event.preventDefault()
      go(resultUrl(items[selected]), event.metaKey || event.ctrlKey)
    }
  })

  list.addEventListener('mousemove', event => {
    const link = event.target.closest('a')
    if (link && Number(link.dataset.index) !== selected) {
      select(Number(link.dataset.index))
    }
  })

  // Close when clicking the backdrop.
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      dialog.close()
    }
  })

  document.addEventListener('keydown', event => {
    if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
      event.preventDefault()
      open()
    }
  })

  document.body.append(host)
  return { open }
}
