// Issue reproductions (issues/<name>/, from scripts/templates/issue/): fills the
// header from the page's metadata and shows the markup under test in light and
// dark side by side. Pages without that metadata or markup are left alone.
import source, { onChange as onSourceChange } from 'virtual:bootstrap-source'
import { STATUSES, githubUrl } from './repro-status.js'

const STORAGE_KEY = 'playground-repro-side-by-side'

// Attributes holding one id or a space-separated list of ids.
const ID_LIST_ATTRIBUTES = ['for', 'form', 'list', 'headers', 'popovertarget', 'commandfor', 'anchor', 'aria-activedescendant', 'aria-controls', 'aria-describedby', 'aria-details', 'aria-errormessage', 'aria-flowto', 'aria-labelledby', 'aria-owns']

const link = (href, text) => {
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.textContent = text
  return anchor
}

const item = (...children) => {
  const span = document.createElement('span')
  span.append(...children)
  return span
}

function renderMeta(container, upstream, commit) {
  const parts = []
  const status = STATUSES[upstream?.dataset.status]
  if (status) {
    const badge = document.createElement('span')
    badge.className = `badge badge-subtle theme-${status.theme}`
    badge.textContent = status.text
    parts.push(badge)
  }

  const reference = upstream?.content.trim()
  if (reference) {
    const url = githubUrl(reference)
    parts.push(item('Upstream: ', url ? link(url, reference) : reference))
  }

  const tracking = upstream?.dataset.tracking?.trim()
  if (tracking) {
    const url = githubUrl(tracking)
    const label = `#${tracking.split('#')[1]}`
    parts.push(item('Tracking: ', url ? link(url, label) : tracking))
  }

  const current = source.url ? link(source.url, source.label) : source.label
  parts.push(item('Bootstrap: ', current))

  const reproducedOn = commit?.content.trim()
  if (reproducedOn) {
    const short = reproducedOn.slice(0, 7)
    const reproduced = link(`https://github.com/twbs/bootstrap/commit/${reproducedOn}`, short)
    parts.push(source.sha === reproducedOn ?
      item('(reproduced on this commit)') :
      item('(reproduced on ', reproduced, ')'))
  }

  container.replaceChildren(...parts)
}

// A copy of `element` whose ids, the references to them, and radio and
// `<details>` names get `suffix`, so it can sit next to the original.
function cloneWithSuffix(element, suffix) {
  const clone = element.cloneNode(true)
  const elements = [clone, ...clone.querySelectorAll('*')]
  const ids = new Set(elements.filter(node => node.id).map(node => node.id))

  for (const node of elements) {
    if (node.id) {
      node.id += suffix
    }

    // Radios and exclusive accordions group by name across the document.
    if (node.matches('input[type="radio"][name], details[name]')) {
      node.setAttribute('name', node.getAttribute('name') + suffix)
    }

    for (const attribute of [...node.attributes]) {
      if (ID_LIST_ATTRIBUTES.includes(attribute.name)) {
        attribute.value = attribute.value.split(/\s+/).map(token => (ids.has(token) ? token + suffix : token)).join(' ')
      } else if (attribute.name === 'href' || attribute.name.startsWith('data-bs-')) {
        // `#id` references: href="#id", data-bs-target="#id", selectors.
        attribute.value = attribute.value.replace(/#([\w-]+)/g, (match, id) => (ids.has(id) ? `#${id}${suffix}` : match))
      }
    }
  }

  return clone
}

const readSideBySide = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

const saveSideBySide = value => {
  try {
    localStorage.setItem(STORAGE_KEY, String(value))
  } catch {}
}

function panel(theme, label, content) {
  const column = document.createElement('div')
  column.className = 'md:col-6'

  const caption = document.createElement('p')
  caption.className = 'small fg-2 mb-2'
  caption.dataset.playgroundChrome = ''
  caption.textContent = label

  const wrapper = document.createElement('div')
  wrapper.className = 'bg-body fg-body border rounded p-3'
  wrapper.dataset.bsTheme = theme
  wrapper.append(content)

  column.append(caption, wrapper)
  return { column, caption, wrapper }
}

// Wraps `block` in a row of a light and a dark panel. Returns the row, and
// `apply` to switch between that and the markup once, in the page's theme (the
// toolbar's).
function sideBySide(block) {
  const row = document.createElement('div')
  row.className = 'row g-3'
  block.before(row)

  const light = panel('light', 'Light', block)
  const dark = panel('dark', 'Dark', cloneWithSuffix(block, '-dark'))
  row.append(light.column, dark.column)

  const apply = on => {
    dark.column.hidden = !on
    light.column.className = on ? 'md:col-6' : 'col-12'
    light.caption.hidden = !on
    if (on) {
      light.wrapper.dataset.bsTheme = 'light'
    } else {
      delete light.wrapper.dataset.bsTheme
    }
  }

  return { row, apply }
}

// One switch for every block, before the first one.
function sideBySideSwitch(before, appliers) {
  const field = document.createElement('div')
  field.className = 'form-field mb-3'
  field.dataset.playgroundChrome = ''
  field.innerHTML = `<div class="switch"><input type="checkbox" id="playground-repro-side-by-side" role="switch" switch></div>
    <label for="playground-repro-side-by-side">Light and dark side by side</label>`
  before.before(field)

  const toggle = field.querySelector('input')
  const apply = on => {
    toggle.checked = on
    for (const applier of appliers) {
      applier(on)
    }
  }

  apply(readSideBySide())
  toggle.addEventListener('change', () => {
    apply(toggle.checked)
    saveSideBySide(toggle.checked)
  })
}

// Runs before the page's own scripts, so they see both copies.
export function initReproduction() {
  const meta = document.querySelector('[data-playground-repro-meta]')
  if (meta) {
    const upstream = document.querySelector('meta[name="playground-upstream"]')
    const commit = document.querySelector('meta[name="playground-bootstrap"]')
    renderMeta(meta, upstream, commit)
    onSourceChange(() => renderMeta(meta, upstream, commit))
  }

  const blocks = [...document.querySelectorAll('[data-playground-repro]')]
  if (blocks.length > 0) {
    const rows = blocks.map(block => sideBySide(block))
    sideBySideSwitch(rows[0].row, rows.map(({ apply }) => apply))
  }
}
