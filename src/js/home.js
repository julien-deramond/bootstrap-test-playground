// Home page: every page found by vite.config.js, with search, group and tag
// filters, and recently viewed pages. The filters live in the URL
// (?q=menu&group=kitchen-sink&tag=forms), so a filtered list can be shared.
import { groups, pages, readRecent, resultUrl, search } from './page-index.js'

const VIEW_KEY = 'bootstrap-playground-home-view'

const escapeHtml = value => String(value).replace(/[&<>"]/g, char => `&#${char.charCodeAt(0)};`)
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

const input = document.getElementById('page-search')
const results = document.getElementById('results')
const groupFilters = document.getElementById('group-filters')
const tagFilters = document.getElementById('tag-filters')
const resultCount = document.getElementById('result-count')

document.getElementById('bootstrap-source').textContent = __BOOTSTRAP_SOURCE__
if (/Mac|iPhone|iPad/.test(navigator.platform)) {
  document.getElementById('palette-key').textContent = '⌘ K'
}

const params = new URLSearchParams(location.search)
const state = {
  q: params.get('q') ?? '',
  group: groups.some(group => group.dir === params.get('group')) ? params.get('group') : '',
  tag: params.get('tag') ?? '',
  view: 'grid'
}

try {
  state.view = localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'
} catch {}

input.value = state.q

// Wraps the parts of `text` that start a query word in <mark>.
function highlight(text, query) {
  const tokens = query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  if (tokens.length === 0) {
    return escapeHtml(text)
  }

  const lower = text.toLowerCase()
  const marked = new Array(text.length).fill(false)
  for (const token of tokens) {
    let index = lower.indexOf(token)
    while (index !== -1) {
      marked.fill(true, index, index + token.length)
      index = lower.indexOf(token, index + 1)
    }
  }

  let html = ''
  let open = false
  for (let index = 0; index < text.length; index++) {
    if (marked[index] !== open) {
      html += open ? '</mark>' : '<mark>'
      open = marked[index]
    }

    html += escapeHtml(text[index])
  }

  return html + (open ? '</mark>' : '')
}

function card(result, { showGroup }) {
  const { page, section } = result
  const title = escapeHtml(page.title)
  return `
    <li class="page-card">
      <div class="page-card-head">
        <h3 class="page-card-title"><a class="page-card-link" href="${escapeHtml(resultUrl({ page }))}">${highlight(page.title, state.q)}</a></h3>
        ${showGroup ? `<span class="page-card-group">${escapeHtml(page.groupLabel)}</span>` : ''}
        <a class="page-card-action" href="/compare.html?page=${encodeURIComponent(page.url)}" title="Compare ${title} side by side" aria-label="Compare ${title} side by side">
          <svg width="16" height="16" aria-hidden="true"><use href="#icon-columns"/></svg>
        </a>
      </div>
      ${page.description ? `<p class="page-card-description">${highlight(page.description, state.q)}</p>` : ''}
      ${section ? `<a class="page-card-section" href="${escapeHtml(resultUrl(result))}"><svg width="14" height="14" aria-hidden="true"><use href="#icon-corner"/></svg><span>${highlight(section.title, state.q)}</span></a>` : ''}
      <div class="page-card-meta">
        ${page.tags.map(tag => `<button type="button" class="page-card-tag${tag === state.tag ? ' active' : ''}" data-tag="${escapeHtml(tag)}" title="Show pages tagged “${escapeHtml(tag)}”">${escapeHtml(tag)}</button>`).join('')}
        ${page.source ? `<span class="page-card-source" title="Adapted from ${escapeHtml(page.source.label)}">${escapeHtml(page.source.label.replace(/\s*[“"].*$/, ''))}</span>` : ''}
        <code class="page-card-path">${escapeHtml(page.url)}</code>
      </div>
    </li>`
}

const list = (items, options = {}) => `<ul class="page-list" data-view="${state.view}">${items.map(item => card(item, options)).join('')}</ul>`

function emptyGroupHint(dir) {
  return dir === 'issues' ?
    'Nothing here yet. Run <code>npm run new-issue 12345</code> to create one.' :
    'Nothing here yet.'
}

// Pages matching everything but `except` ('group' or 'tag'), for the chip counts.
function matching(except) {
  return search(state.q, pages.filter(page =>
    (except === 'group' || !state.group || page.group === state.group) &&
    (except === 'tag' || !state.tag || page.tags.includes(state.tag))))
}

function renderFilters() {
  const byGroup = matching('group')
  const chip = (attribute, value, label, count, active) => `
    <button type="button" class="chip${active ? ' active' : ''}" ${attribute}="${escapeHtml(value)}" aria-pressed="${active}">
      ${escapeHtml(label)} <span class="home-chip-count">${count}</span>
    </button>`

  groupFilters.innerHTML = [
    chip('data-group', '', 'All', byGroup.length, !state.group),
    ...groups.map(group => chip('data-group', group.dir, group.label, byGroup.filter(({ page }) => page.group === group.dir).length, state.group === group.dir))
  ].join('')

  const counts = new Map()
  for (const { page } of matching('tag')) {
    for (const tag of page.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  if (state.tag && !counts.has(state.tag)) {
    counts.set(state.tag, 0)
  }

  // Most used first; the active tag leads so it stays visible in the scrolling row.
  const tags = [...counts].sort((a, b) => (b[0] === state.tag) - (a[0] === state.tag) || b[1] - a[1] || a[0].localeCompare(b[0]))
  tagFilters.hidden = tags.length === 0
  tagFilters.innerHTML = `<span class="home-chips-label">Tags</span>${tags.map(([tag, count]) => chip('data-tag', tag, tag, count, state.tag === tag)).join('')}`
}

function renderResults() {
  const found = search(state.q, pages.filter(page =>
    (!state.group || page.group === state.group) &&
    (!state.tag || page.tags.includes(state.tag))))
  const filtered = state.q || state.tag

  resultCount.textContent = `${plural(found.length, 'page')} found`

  if (found.length === 0) {
    results.innerHTML = `
      <div class="home-empty">
        <p class="home-empty-title">No pages match${state.q ? ` “${escapeHtml(state.q)}”` : ''}${state.tag ? ` tagged “${escapeHtml(state.tag)}”` : ''}.</p>
        <button type="button" class="btn-outline theme-secondary btn-sm" data-clear>Clear filters</button>
      </div>`
    return
  }

  // A search or a tag shows one list, best matches first. Otherwise, pages
  // are grouped like the folders they live in.
  if (filtered) {
    results.innerHTML = `
      <section class="home-group" aria-labelledby="results-heading">
        <div class="home-group-head">
          <h2 class="home-group-title" id="results-heading">${state.q ? 'Results' : `Tagged “${escapeHtml(state.tag)}”`}</h2>
          <span class="home-group-count">${plural(found.length, 'page')}</span>
          <button type="button" class="btn-link btn-sm ms-auto" data-clear>Clear</button>
        </div>
        ${list(found, { showGroup: !state.group })}
      </section>`
    return
  }

  const recent = state.group ? [] : readRecent().slice(0, 4)
  results.innerHTML = [
    recent.length > 0 ? `
      <section class="home-group home-recent" aria-labelledby="group-recent">
        <div class="home-group-head">
          <h2 class="home-group-title" id="group-recent">Recently viewed</h2>
        </div>
        ${list(recent.map(page => ({ page })), { showGroup: true })}
      </section>` : '',
    ...groups.filter(group => !state.group || group.dir === state.group).map(group => `
      <section class="home-group" aria-labelledby="group-${group.dir}">
        <div class="home-group-head">
          <h2 class="home-group-title" id="group-${group.dir}">${escapeHtml(group.label)}</h2>
          <span class="home-group-count">${group.pages.length}</span>
          <p class="home-group-description">${escapeHtml(group.description)}</p>
        </div>
        ${group.pages.length === 0 ?
          `<p class="home-group-empty">${emptyGroupHint(group.dir)}</p>` :
          list(group.pages.map(page => ({ page })))}
      </section>`)
  ].join('')
}

function syncUrl() {
  const url = new URL(location.href)
  for (const key of ['q', 'group', 'tag']) {
    if (state[key]) {
      url.searchParams.set(key, state[key])
    } else {
      url.searchParams.delete(key)
    }
  }

  history.replaceState(history.state, '', url)
}

function render() {
  renderFilters()
  renderResults()
  for (const button of document.querySelectorAll('[data-view]')) {
    button.setAttribute('aria-pressed', String(button.dataset.view === state.view))
  }
}

function update(changes) {
  Object.assign(state, changes)
  syncUrl()
  render()
}

const filters = document.getElementById('filters')
input.addEventListener('input', () => {
  update({ q: input.value.trim() })
  // Bring the results up under the sticky filters once typing starts.
  if (filters.getBoundingClientRect().top > 0) {
    window.scrollTo({ top: window.scrollY + filters.getBoundingClientRect().top })
  }
})

input.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    const first = results.querySelector('.page-card-section, .page-card-link')
    if (first) {
      event.preventDefault()
      first.click()
    }
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    results.querySelector('.page-card-link')?.focus()
  } else if (event.key === 'Escape' && input.value) {
    event.preventDefault()
    input.value = ''
    update({ q: '' })
  }
})

// Arrow keys move between result cards.
results.addEventListener('keydown', event => {
  if (!['ArrowDown', 'ArrowUp'].includes(event.key) || !event.target.matches('.page-card-link')) {
    return
  }

  event.preventDefault()
  const links = [...results.querySelectorAll('.page-card-link')]
  const index = links.indexOf(event.target) + (event.key === 'ArrowDown' ? 1 : -1)
  if (index < 0) {
    input.focus()
  } else {
    links[Math.min(index, links.length - 1)].focus()
  }
})

document.addEventListener('click', event => {
  const target = event.target.closest('[data-group], [data-tag], [data-view], [data-clear]')
  if (!target) {
    return
  }

  if (target.matches('[data-group]')) {
    update({ group: target.dataset.group })
  } else if (target.matches('[data-tag]')) {
    update({ tag: state.tag === target.dataset.tag ? '' : target.dataset.tag })
  } else if (target.matches('[data-view]')) {
    try {
      localStorage.setItem(VIEW_KEY, target.dataset.view)
    } catch {}

    update({ view: target.dataset.view })
  } else {
    input.value = ''
    update({ q: '', tag: '', group: '' })
    input.focus()
  }
})

// "/" and Ctrl+K (⌘K) focus the search field instead of opening the switcher.
document.addEventListener('keydown', event => {
  const typing = event.target.closest?.('input, textarea, select, [contenteditable]')
  const isSlash = event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey
  const isPalette = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey
  if (isSlash || isPalette) {
    event.preventDefault()
    event.stopImmediatePropagation()
    input.focus()
    input.select()
  }
}, { capture: true })

render()
