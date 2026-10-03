// Home page: every page found by vite.config.js, with search, group, upstream
// status and tag filters in the sidebar, and recently viewed pages. The
// filters live in the URL (?q=menu&group=kitchen-sink&tag=forms, or
// ?status=reported for the reproductions reported upstream), so a filtered
// list can be shared. The sidebar's Configs view (?group=configs, or /#configs) lists the
// saved configs by category, applied in one click.
//
// The home page is playground UI, not a page under test: it doesn't load
// main.js, so it has no toolbar, and `data-playground-fixed` keeps it on
// Bootstrap's defaults whatever the preferences (see playground-prefs.js).
import source, { onChange as onSourceChange } from 'virtual:bootstrap-source'
import { configs, groupConfigs } from './configs.js'
import { groups, pages, queryText, readRecent, resultUrl, search } from './page-index.js'
import { changeLabels, pageUrl, record } from './last-update.js'
import { STATUSES, githubUrl } from './repro-status.js'

const VIEW_KEY = 'bootstrap-playground-home-view'

const escapeHtml = value => String(value).replace(/[&<>"]/g, char => `&#${char.charCodeAt(0)};`)
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`
// READMEs write code in backticks.
const inlineCode = text => escapeHtml(text).replace(/`([^`]+)`/g, '<code>$1</code>')

const input = document.getElementById('page-search')
const results = document.getElementById('results')
const groupFilters = document.getElementById('group-filters')
const tagFilters = document.getElementById('tag-filters')
const statusFilters = document.getElementById('status-filters')
const resultCount = document.getElementById('result-count')
const configList = document.getElementById('configs')

const CONFIGS = 'configs'
const ALL_DESCRIPTION = 'Starter screens, real app screens, every docs example and issue reproductions, all compiled from v6-dev source.'
const CONFIGS_DESCRIPTION = 'Saved styles from `configs/`. The one you apply is used by every example page, like the toolbar’s Config list; this page keeps Bootstrap’s defaults.'
// How many tags the sidebar shows before "more".
const TAGS_SHOWN = 12
let tagsExpanded = false

// Where Bootstrap comes from, linked to its commit or branch on GitHub. The
// dot turns amber when a local checkout has uncommitted changes.
function renderSource({ label, path, url, dirty }) {
  const pill = document.getElementById('bootstrap-source')
  const link = pill.querySelector('a')
  link.querySelector('code').textContent = label
  link.title = `Bootstrap source: ${path}`
  if (url) {
    link.href = url
    link.rel = 'noopener'
  } else {
    link.removeAttribute('href')
    link.removeAttribute('rel')
  }

  pill.toggleAttribute('data-dirty', dirty)
}

renderSource(source)
onSourceChange(renderSource)

// --- Last update ------------------------------------------------------------

const short = sha => sha.slice(0, 7)
const commitUrl = sha => `https://github.com/twbs/bootstrap/commit/${sha}`
// `(#123)` in a commit subject links to the upstream pull request.
const linkPulls = subject => escapeHtml(subject).replace(/\(#(\d+)\)/g, '(<a href="https://github.com/twbs/bootstrap/pull/$1" rel="noopener">#$1</a>)')

function renderLastUpdate() {
  const panel = document.getElementById('last-update')
  const { from, to, pr, commits, rendering, examples } = record
  const date = new Date(record.date).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })
  const compareUrl = `https://github.com/twbs/bootstrap/compare/${from}...${to}`

  panel.querySelector('summary').innerHTML = [
    pr ? `<strong>Testing twbs/bootstrap#${pr.number}</strong>` : '<strong>Last update</strong>',
    escapeHtml(date),
    commits ? plural(commits.length, 'upstream commit') : `${short(from)} → ${short(to)}`,
    `${plural(examples.length, 'changed example')}${rendering ? '' : ' (markup only)'}`
  ].join(' <span aria-hidden="true">·</span> ')

  // Changed examples, grouped by page.
  const byPage = new Map()
  for (const example of examples) {
    byPage.set(example.url, [...(byPage.get(example.url) ?? []), example])
  }

  const examplesHtml = byPage.size ?
    `<ul class="home-update-pages">${[...byPage].map(([url, list]) => `
      <li><a href="${escapeHtml(pageUrl(url))}">${escapeHtml(list[0].page ?? url)}</a>
        <ul>${list.map(example => `
          <li><a href="${escapeHtml(pageUrl(`${url}#${example.id}`))}">${escapeHtml(example.example ?? example.id)}</a>
            ${changeLabels(example).map(({ text, title }) => `<span class="badge badge-subtle theme-warning" title="${escapeHtml(title)}">${escapeHtml(text)}</span>`).join(' ')}</li>`).join('')}
        </ul></li>`).join('')}</ul>` :
    `<p>${rendering ? 'No kitchen sink example changed: same markup, same rendering.' : 'No kitchen sink markup changed.'}</p>`

  panel.querySelector('.home-update-body').innerHTML = `
    <p class="home-update-range">
      <a href="${compareUrl}" rel="noopener"><code>${short(from)}</code> → <code>${short(to)}</code></a>
      ${pr ? `· <a href="${escapeHtml(pr.url)}" rel="noopener">${escapeHtml(pr.title)}</a>${pr.behind ? `, ${plural(pr.behind, 'commit')} behind <code>v6-dev</code>` : ''}` : ''}
    </p>
    <div class="home-update-columns">
      <section aria-labelledby="last-update-commits">
        <h2 class="home-update-title" id="last-update-commits">Upstream commits${commits ? ` <span class="home-group-count">${commits.length}</span>` : ''}</h2>
        ${commits ?
          `<ol class="home-update-commits">${commits.map(({ sha, subject }) => `<li><a href="${commitUrl(sha)}" rel="noopener"><code>${short(sha)}</code></a> ${linkPulls(subject)}</li>`).join('')}</ol>` :
          `<p><a href="${compareUrl}" rel="noopener">See them on GitHub</a>.</p>`}
      </section>
      <section aria-labelledby="last-update-examples">
        <h2 class="home-update-title" id="last-update-examples">Changed examples <span class="home-group-count">${examples.length}</span></h2>
        ${examplesHtml}
        ${rendering ? '' : '<p class="home-update-note">Rendering wasn\'t compared (<code>--no-diff</code>): only the markup changes are listed.</p>'}
      </section>
    </div>`

  // Kitchen sink pages link their change badges here.
  const openFromHash = () => {
    if (location.hash === '#last-update') {
      panel.open = true
    }
  }

  openFromHash()
  window.addEventListener('hashchange', openFromHash)
}

renderLastUpdate()
if (/Mac|iPhone|iPad/.test(navigator.platform)) {
  document.getElementById('palette-key').textContent = '⌘ K'
}

const params = new URLSearchParams(location.search)
const isGroup = value => value === CONFIGS || groups.some(group => group.dir === value)
const state = {
  q: params.get('q') ?? '',
  group: isGroup(params.get('group')) ? params.get('group') : (location.hash === '#configs' ? CONFIGS : ''),
  tag: params.get('tag') ?? '',
  status: params.get('status') in STATUSES ? params.get('status') : '',
  view: 'grid'
}

try {
  state.view = localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'
} catch {}

input.value = state.q

// Wraps the parts of `text` that start a query word in <mark>.
function highlight(text, query) {
  const tokens = queryText(query).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)
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

// Classes and tokens the query found in the page: `.btn-subtle ×9`, or
// `--alert-padding-x` on `.alert`.
const matchesHtml = matches => (matches?.length ?
  `<p class="page-card-matches">${matches.map(({ label, kind, classes }) => (kind === 'token' ?
    `<code>${escapeHtml(label)}</code> on ${classes.slice(0, 3).map(name => `<code>.${escapeHtml(name)}</code>`).join(', ')}${classes.length > 3 ? '…' : ''}` :
    classes.slice(0, 3).map(name => `<code>.${escapeHtml(name)}</code>`).join(', ') + (classes.length > 3 ? '…' : ''))).join(' · ')}</p>` :
  '')

const groupIcon = dir => `<span class="page-card-icon" data-group-icon="${escapeHtml(dir)}" aria-hidden="true"><svg width="16" height="16"><use href="#icon-${escapeHtml(dir)}"/></svg></span>`

// A reproduction's upstream status, and links to its upstream issue and its
// tracking issue (src/js/repro-status.js).
function reproLinks(page) {
  if (!page.repro) {
    return ''
  }

  const { status, upstream, tracking } = page.repro
  const number = reference => escapeHtml(reference.replace(/^.*#/, '#'))
  const parts = [
    STATUSES[status] && `<span class="badge badge-subtle theme-${STATUSES[status].theme}" title="${STATUSES[status].text}">${STATUSES[status].short}</span>`,
    githubUrl(upstream) && `<a href="${escapeHtml(githubUrl(upstream))}" rel="noopener" title="Upstream: ${escapeHtml(upstream)}">Upstream ${number(upstream)}</a>`,
    githubUrl(tracking) && `<a href="${escapeHtml(githubUrl(tracking))}" rel="noopener" title="Tracking issue in this repository">Tracking ${number(tracking)}</a>`
  ].filter(Boolean)
  return parts.length > 0 ? `<p class="page-card-repro">${parts.join('')}</p>` : ''
}

// A page tile: icon, title and description. Tags, source and path only show
// in the list view; the sidebar has the tags.
function card(result, { showGroup }) {
  const { page, section, matches } = result
  const title = escapeHtml(page.title)
  return `
    <li class="page-card">
      ${groupIcon(page.group)}
      <div class="page-card-body">
        <div class="page-card-head">
          <h3 class="page-card-title"><a class="page-card-link" href="${escapeHtml(resultUrl({ page }))}">${highlight(page.title, state.q)}</a></h3>
          ${showGroup ? `<span class="page-card-group">${escapeHtml(page.groupLabel)}</span>` : ''}
        </div>
        ${page.description ? `<p class="page-card-description" title="${escapeHtml(page.description)}">${highlight(page.description, state.q)}</p>` : ''}
        ${reproLinks(page)}
        ${matchesHtml(matches)}
        ${section ? `<a class="page-card-section" href="${escapeHtml(resultUrl(result))}"><svg width="14" height="14" aria-hidden="true"><use href="#icon-corner"/></svg><span>${highlight(section.title, state.q)}</span></a>` : ''}
      </div>
      <div class="page-card-meta">
        ${page.tags.map(tag => `<button type="button" class="page-card-tag${tag === state.tag ? ' active' : ''}" data-tag="${escapeHtml(tag)}" title="Show pages tagged “${escapeHtml(tag)}”">${escapeHtml(tag)}</button>`).join('')}
        ${page.source ? `<span class="page-card-source" title="Adapted from ${escapeHtml(page.source.label)}">${escapeHtml(page.source.label.replace(/\s*[“"].*$/, ''))}</span>` : ''}
        <code class="page-card-path">${escapeHtml(page.url)}</code>
      </div>
      <div class="page-card-actions">
        <a class="page-card-action" href="${import.meta.env.BASE_URL}compare.html?page=${encodeURIComponent(page.url)}" title="Compare ${title} side by side" aria-label="Compare ${title} side by side">
          <svg width="16" height="16" aria-hidden="true"><use href="#icon-columns"/></svg>
        </a>
        ${page.docs ? `<a class="page-card-action" href="${escapeHtml(page.docs)}" rel="noopener" title="${title} docs source" aria-label="${title} docs source">
          <svg width="16" height="16" aria-hidden="true"><use href="#icon-book"/></svg>
        </a>` : ''}
      </div>
    </li>`
}

const list = (items, options = {}) => `<ul class="page-list" data-view="${state.view}">${items.map(item => card(item, options)).join('')}</ul>`

function emptyGroupHint(dir) {
  return dir === 'issues' ?
    'Nothing here yet. Run <code>npm run new-issue 12345</code> to create one.' :
    'Nothing here yet.'
}

// Pages matching everything but `except` ('group', 'tag' or 'status'), for
// the chip counts.
function matching(except) {
  return search(state.q, pages.filter(page =>
    (except === 'group' || !state.group || page.group === state.group) &&
    (except === 'tag' || !state.tag || page.tags.includes(state.tag)) &&
    (except === 'status' || !state.status || page.repro?.status === state.status)))
}

function renderFilters() {
  const byGroup = matching('group')
  const navItem = (value, label, icon, count) => {
    const active = state.group === value
    return `
      <button type="button" class="home-nav-item${active ? ' active' : ''}" data-group="${escapeHtml(value)}" aria-pressed="${active}">
        <svg width="16" height="16" aria-hidden="true" data-group-icon="${escapeHtml(value || 'all')}"><use href="#icon-${icon}"/></svg>
        <span class="home-nav-label">${escapeHtml(label)}</span>
        <span class="home-nav-count">${count}</span>
      </button>`
  }

  groupFilters.innerHTML = [
    navItem('', 'All pages', 'layers', byGroup.length),
    ...groups.map(group => navItem(group.dir, group.label, group.dir, byGroup.filter(({ page }) => page.group === group.dir).length)),
    '<hr class="home-nav-divider">',
    navItem(CONFIGS, 'Configs', 'palette', matchingConfigs().length)
  ].join('')

  // The reproductions' upstream statuses, when any page in view has one.
  const statusCounts = new Map(Object.keys(STATUSES).map(status => [status, 0]))
  for (const { page } of state.group === CONFIGS ? [] : matching('status')) {
    if (statusCounts.has(page.repro?.status)) {
      statusCounts.set(page.repro.status, statusCounts.get(page.repro.status) + 1)
    }
  }

  const statuses = [...statusCounts].filter(([status, count]) => count > 0 || status === state.status)
  statusFilters.hidden = statuses.length === 0
  statusFilters.innerHTML = `
    <h2 class="home-sidebar-title" id="status-heading">Upstream status</h2>
    <div class="home-tag-list">
      ${statuses.map(([status, count]) => `
        <button type="button" class="home-tag${state.status === status ? ' active' : ''}" data-repro-status="${status}" aria-pressed="${state.status === status}" title="Reproductions ${STATUSES[status].text.toLowerCase()}">
          <span class="home-status-dot theme-${STATUSES[status].theme}" aria-hidden="true"></span>${STATUSES[status].short} <span class="home-tag-count">${count}</span>
        </button>`).join('')}
    </div>`

  // Tags don't filter configs.
  const counts = new Map()
  for (const { page } of state.group === CONFIGS ? [] : matching('tag')) {
    for (const tag of page.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  if (state.tag && !counts.has(state.tag) && state.group !== CONFIGS) {
    counts.set(state.tag, 0)
  }

  // Most used first; the active tag leads so it stays visible when collapsed.
  const tags = [...counts].sort((a, b) => (b[0] === state.tag) - (a[0] === state.tag) || b[1] - a[1] || a[0].localeCompare(b[0]))
  const shown = tagsExpanded ? tags : tags.slice(0, TAGS_SHOWN)
  tagFilters.hidden = tags.length === 0
  tagFilters.innerHTML = `
    <h2 class="home-sidebar-title" id="tags-heading">Tags</h2>
    <div class="home-tag-list">
      ${shown.map(([tag, count]) => `
        <button type="button" class="home-tag${state.tag === tag ? ' active' : ''}" data-tag="${escapeHtml(tag)}" aria-pressed="${state.tag === tag}">
          ${escapeHtml(tag)} <span class="home-tag-count">${count}</span>
        </button>`).join('')}
      ${tags.length > TAGS_SHOWN ? `<button type="button" class="home-tag home-tag-more" data-more-tags aria-expanded="${tagsExpanded}">${tagsExpanded ? 'Fewer' : `+${tags.length - TAGS_SHOWN} more`}</button>` : ''}
    </div>`
}

function renderHead() {
  const group = groups.find(({ dir }) => dir === state.group)
  let title = group?.label ?? 'All pages'
  let description = group?.description ?? ALL_DESCRIPTION
  if (state.group === CONFIGS) {
    title = 'Configs'
    description = CONFIGS_DESCRIPTION
  } else if (state.q || state.tag || state.status) {
    title = state.q ? 'Results' : state.tag ? `Tagged “${state.tag}”` : STATUSES[state.status].text
    description = group ? `In ${group.label}.` : ''
  }

  document.getElementById('view-title').textContent = title
  document.getElementById('view-description').innerHTML = inlineCode(description) +
    (state.group === CONFIGS ? ' <a href="https://github.com/julien-deramond/bootstrap-test-playground/tree/main/configs#saved-configs" rel="noopener">What each one stresses</a>' : '')
  document.querySelector('.home-view').hidden = state.group === CONFIGS
}

function renderResults() {
  results.hidden = state.group === CONFIGS
  configList.hidden = state.group !== CONFIGS
  if (state.group === CONFIGS) {
    results.innerHTML = ''
    const count = matchingConfigs().length
    resultCount.textContent = `${plural(count, 'config')} found`
    return
  }

  const found = matching()
  const filtered = state.q || state.tag || state.status

  resultCount.textContent = `${plural(found.length, 'page')} found`

  if (found.length === 0) {
    results.innerHTML = `
      <div class="home-empty">
        <p class="home-empty-title">No pages match${state.q ? ` “${escapeHtml(state.q)}”` : ''}${state.tag ? ` tagged “${escapeHtml(state.tag)}”` : ''}${state.status ? `, ${STATUSES[state.status].text.toLowerCase()}` : ''}.</p>
        <button type="button" class="btn-outline theme-secondary btn-sm" data-clear>Clear filters</button>
      </div>`
    return
  }

  // A search, a tag or a status shows one list, best matches first. Otherwise, pages
  // are grouped like the folders they live in.
  if (filtered) {
    results.innerHTML = `
      <section class="home-group" aria-label="Results">
        <div class="home-group-head">
          <span class="home-group-count">${plural(found.length, 'page')}</span>
          <button type="button" class="btn-link btn-sm ms-auto" data-clear>Clear filters</button>
        </div>
        ${list(found, { showGroup: !state.group })}
      </section>`
    return
  }

  const recent = state.group ? [] : readRecent().slice(0, 6)
  const shownGroups = groups.filter(group => !state.group || group.dir === state.group)
  results.innerHTML = [
    recent.length > 0 ? `
      <section class="home-recent" aria-labelledby="group-recent">
        <h2 class="home-recent-title" id="group-recent"><svg width="14" height="14" aria-hidden="true"><use href="#icon-clock"/></svg> Recent</h2>
        <ul class="home-recent-list">${recent.map(page => `
          <li><a class="home-recent-item" href="${escapeHtml(resultUrl({ page }))}" title="${escapeHtml(`${page.groupLabel}: ${page.title}`)}">${groupIcon(page.group)}<span>${escapeHtml(page.title)}</span></a></li>`).join('')}
        </ul>
      </section>` : '',
    ...shownGroups.map(group => `
      <section class="home-group" aria-labelledby="group-${group.dir}">
        ${state.group ? '' : `
          <div class="home-group-head">
            <h2 class="home-group-title" id="group-${group.dir}"><button type="button" data-group="${escapeHtml(group.dir)}">${escapeHtml(group.label)}</button></h2>
            <span class="home-group-count">${group.pages.length}</span>
            <p class="home-group-description">${escapeHtml(group.description)}</p>
          </div>`}
        ${group.pages.length === 0 ?
          `<p class="home-group-empty">${emptyGroupHint(group.dir)}</p>` :
          list(pages.filter(page => page.group === group.dir).map(page => ({ page })))}
      </section>`)
  ].join('')
  if (state.group) {
    results.querySelector('.home-group').setAttribute('aria-labelledby', 'view-title')
  }
}

// Configs: applying one saves the toolbar's Config preference, which every
// example page opened next uses. This page itself doesn't change.
const prefs = window.playgroundPrefs
const issueUrl = issue => `https://github.com/julien-deramond/bootstrap-test-playground/issues/${issue}`

// The working copy leads the first category, next to `default`.
const working = { name: 'working', label: 'src/styles', category: 'baseline', description: 'The working copy, what every example page uses until a config is applied. Save it as a config with `npm run save-config <name>`.', gaps: [] }

// Configs whose name or description has every word of the search.
function matchingConfigs() {
  const words = state.q.toLowerCase().split(/\s+/).filter(Boolean)
  return [working, ...configs].filter(({ name, label, description }) => {
    const text = `${name} ${label ?? ''} ${description}`.toLowerCase()
    return words.every(word => text.includes(word))
  })
}

function renderConfigs() {
  if (state.group !== CONFIGS) {
    configList.innerHTML = ''
    return
  }

  // The saved choice: URL overrides don't apply to this page.
  const current = prefs?.read().config
  const found = matchingConfigs()
  const configCard = ({ name, label, description, gaps, tokensOnly }) => {
    const active = name === current || (name === 'working' && !configs.some(config => config.name === current))
    return `
      <li class="config-card${active ? ' active' : ''}">
        <div class="config-card-head">
          <h3 class="config-card-title"><code>${highlight(label ?? name, state.q)}</code></h3>
          <button type="button" class="btn-sm ${active ? 'btn-subtle' : 'btn-outline'} theme-${active ? 'success' : 'secondary'} config-card-apply" data-config="${escapeHtml(name)}" aria-pressed="${active}" aria-label="${active ? 'Applied' : 'Apply'} ${escapeHtml(label ?? name)}" ${prefs ? '' : 'disabled'}>${active ? '<svg width="14" height="14" aria-hidden="true"><use href="#icon-check"/></svg> Applied' : 'Apply'}</button>
        </div>
        <p class="config-card-description" title="${escapeHtml(description)}">${inlineCode(description || `configs/${name}/`)}</p>
        ${(tokensOnly && name !== 'default') || gaps.length > 0 ? `
          <div class="config-card-meta">
            ${tokensOnly && name !== 'default' ? '<span class="config-card-badge" title="Only changes tokens.css, so it also applies on top of the prebuilt dist">tokens only</span>' : ''}
            ${gaps.map(issue => `<a class="config-card-gap" href="${issueUrl(issue)}" rel="noopener" title="Known gap: tracking issue #${issue}">#${issue}</a>`).join('')}
          </div>` : ''}
      </li>`
  }

  if (found.length === 0) {
    configList.innerHTML = `
      <div class="home-empty">
        <p class="home-empty-title">No configs match “${escapeHtml(state.q)}”.</p>
        <button type="button" class="btn-outline theme-secondary btn-sm" data-clear>Clear filters</button>
      </div>`
    return
  }

  configList.innerHTML = groupConfigs(found).map(({ id, label, description, configs }) => `
    <section class="home-group config-group" aria-labelledby="config-group-${id}">
      <div class="home-group-head">
        <h2 class="home-group-title" id="config-group-${id}">${escapeHtml(label)}</h2>
        <span class="home-group-count">${configs.filter(config => config !== working).length}</span>
        <p class="home-group-description">${inlineCode(description)}</p>
      </div>
      <ul class="config-list">${configs.map(configCard).join('')}</ul>
    </section>`).join('')
}

function syncUrl() {
  const url = new URL(location.href)
  for (const key of ['q', 'group', 'tag', 'status']) {
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
  renderHead()
  renderResults()
  renderConfigs()
  for (const button of document.querySelectorAll('[data-view]')) {
    button.setAttribute('aria-pressed', String(button.dataset.view === state.view))
  }
}

function update(changes) {
  Object.assign(state, changes)
  syncUrl()
  render()
}

input.addEventListener('input', () => {
  update({ q: input.value.trim() })
  // Bring the results back up once typing starts.
  const main = document.querySelector('.home-main')
  if (main.getBoundingClientRect().top < 0) {
    window.scrollTo({ top: window.scrollY + main.getBoundingClientRect().top })
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
  const target = event.target.closest('[data-group], [data-tag], [data-repro-status], [data-view], [data-clear], [data-more-tags]')
  if (!target) {
    return
  }

  if (target.matches('[data-more-tags]')) {
    tagsExpanded = !tagsExpanded
    renderFilters()
    tagFilters.querySelector('[data-more-tags]').focus()
  } else if (target.matches('[data-group]')) {
    // The Configs view doesn't take a tag or a status.
    update({ group: target.dataset.group, ...(target.dataset.group === CONFIGS && { tag: '', status: '' }) })
    window.scrollTo({ top: 0 })
  } else if (target.matches('[data-tag]')) {
    update({ tag: state.tag === target.dataset.tag ? '' : target.dataset.tag })
  } else if (target.matches('[data-repro-status]')) {
    update({ status: state.status === target.dataset.reproStatus ? '' : target.dataset.reproStatus })
  } else if (target.matches('[data-view]')) {
    try {
      localStorage.setItem(VIEW_KEY, target.dataset.view)
    } catch {}

    update({ view: target.dataset.view })
  } else {
    input.value = ''
    update({ q: '', tag: '', status: '', group: '' })
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

// /#configs opens the Configs view.
window.addEventListener('hashchange', () => {
  if (location.hash === '#configs') {
    update({ group: CONFIGS, tag: '', status: '' })
  }
})

configList.addEventListener('click', event => {
  const button = event.target.closest('[data-config]')
  if (button && prefs) {
    prefs.save({ config: button.dataset.config })
  }
})

// Saves from here, or from the toolbar in another tab.
window.addEventListener('playground-prefs', renderConfigs)
window.addEventListener('storage', renderConfigs)
