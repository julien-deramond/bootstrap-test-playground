// pages/table-large.html: a table of 1000 rows with every table variant to
// toggle, a sticky header and three wrappers. The data comes from a seeded
// generator (no Math.random(), no Date.now()), so every load, in every
// engine, shows the same rows.
//
// The state is in the URL, so tests and baselines pin it without clicking:
//   ?variants=striped,hover&wrapper=none|responsive|box&sticky=0&rows=200
// <html> gets data-table-large="ready" once the rows are in the document.
// With ?chrome=0 the page is capped at one screen (see table-large.css).

const VARIANTS = new Set(['sm', 'striped', 'striped-columns', 'hover', 'bordered', 'borderless', 'group-divider', 'card', 'stacked'])
const WRAPPERS = ['none', 'responsive', 'box']
const DEFAULT_ROWS = 1000

const FIRST = ['Ada', 'Grace', 'Alan', 'Linus', 'Margaret', 'Dennis', 'Barbara', 'Ken', 'Radia', 'Tim', 'Hedy', 'Edsger', 'Katherine', 'Donald', 'Sophie', 'Guido']
const LAST = ['Lovelace', 'Hopper', 'Turing', 'Torvalds', 'Hamilton', 'Ritchie', 'Liskov', 'Thompson', 'Perlman', 'Berners-Lee', 'Lamarr', 'Dijkstra', 'Johnson', 'Knuth', 'Wilson', 'van Rossum']
const STATUSES = [
  { label: 'Paid' },
  { label: 'Pending' },
  { label: 'Overdue' },
  { label: 'Refunded' }
]

// mulberry32, a small seeded generator.
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const START = Date.UTC(2026, 0, 1)

function generate(count) {
  const random = mulberry32(1000)
  const pick = list => list[Math.floor(random() * list.length)]

  return Array.from({ length: count }, (_, index) => ({
    id: 10_001 + index,
    customer: `${pick(FIRST)} ${pick(LAST)}`,
    status: pick(STATUSES),
    amount: Math.round(random() * 250_000) / 100,
    date: new Date(START + Math.floor(random() * 300) * 86_400_000).toISOString().slice(0, 10)
  }))
}

function rowHtml({ id, customer, status, amount, date }) {
  return `<tr data-row="${id}">
<td data-cell="Select"><input type="checkbox" class="check" aria-label="Select order ${id}"></td>
<th scope="row" data-cell="Order">${id}</th>
<td data-cell="Customer">${customer}</td>
<td data-cell="Status">${status.label}</td>
<td data-cell="Amount" class="text-end tl-amount">${money.format(amount)}</td>
<td data-cell="Date"><time datetime="${date}">${date}</time></td>
</tr>`
}

const params = new URLSearchParams(location.search)
const chosen = new Set((params.get('variants') ?? '').split(',').filter(variant => VARIANTS.has(variant)))
const rows = Math.max(1, Number.parseInt(params.get('rows'), 10) || DEFAULT_ROWS)
const state = {
  wrapper: WRAPPERS.includes(params.get('wrapper')) ? params.get('wrapper') : 'responsive',
  sticky: !['0', 'false'].includes(params.get('sticky'))
}

const root = document.documentElement
const mount = document.querySelector('[data-tl-table]')
const count = document.getElementById('tl-count')
const data = generate(rows)
const selected = new Set()

if (params.get('chrome') === '0') {
  root.dataset.tlCapped = ''
}

let table

function build() {
  const classes = ['table', ...[...chosen].filter(variant => !['card', 'stacked'].includes(variant)).map(variant => `table-${variant}`)]
  if (chosen.has('stacked')) {
    classes.push('table-stacked')
  }

  const html = `<table class="${classes.join(' ')}">
<caption class="visually-hidden">Orders, ${data.length} rows</caption>
<thead><tr>
<th scope="col"><input type="checkbox" class="check" aria-label="Select all orders" data-tl-all></th>
<th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Status</th><th scope="col" class="text-end">Amount</th><th scope="col">Date</th>
</tr></thead>
<tbody>${data.map(rowHtml).join('')}</tbody>
</table>`

  // .table-card wraps the table, or the responsive wrapper.
  mount.className = chosen.has('card') ? 'table-card' : ''
  if (state.wrapper === 'none') {
    mount.innerHTML = html
  } else {
    mount.innerHTML = `<div class="table-responsive tl-wrapper" role="region" aria-label="Orders" tabindex="0">${html}</div>`
  }

  table = mount.querySelector('table')
  root.dataset.tlWrapper = state.wrapper
  root.toggleAttribute('data-tl-sticky', state.sticky)
  // A stacked table needs a .table-responsive ancestor.
  if (chosen.has('stacked') && state.wrapper === 'none') {
    mount.classList.add('table-responsive')
  }

  for (const id of selected) {
    const row = table.querySelector(`[data-row="${id}"]`)
    row.classList.add('table-active')
    row.querySelector('input').checked = true
  }

  updateCount()
}

function updateCount() {
  count.textContent = selected.size ? `${selected.size} of ${data.length} selected` : `${data.length} orders`
  const all = table.querySelector('[data-tl-all]')
  all.checked = selected.size === data.length
  all.indeterminate = selected.size > 0 && selected.size < data.length
}

// One listener for the 1000 checkboxes.
mount.addEventListener('change', ({ target }) => {
  if (target.matches('[data-tl-all]')) {
    selected.clear()
    for (const row of table.tBodies[0].rows) {
      row.classList.toggle('table-active', target.checked)
      row.querySelector('input').checked = target.checked
      if (target.checked) {
        selected.add(Number(row.dataset.row))
      }
    }
  } else if (target.closest('tbody')) {
    const row = target.closest('tr')
    row.classList.toggle('table-active', target.checked)
    if (target.checked) {
      selected.add(Number(row.dataset.row))
    } else {
      selected.delete(Number(row.dataset.row))
    }
  }

  updateCount()
})

// Writes the options to the URL and to the controls, then rebuilds.
function sync() {
  const url = new URL(location.href)
  url.searchParams.set('variants', [...chosen].join(','))
  url.searchParams.set('wrapper', state.wrapper)
  url.searchParams.set('sticky', state.sticky ? '1' : '0')
  if (!chosen.size) {
    url.searchParams.delete('variants')
  }

  history.replaceState(null, '', url)
}

const form = document.getElementById('tl-options')
for (const input of form.querySelectorAll('[name="variants"]')) {
  input.checked = chosen.has(input.value)
}

const wrapperSelect = document.getElementById('tl-wrapper')
const stickyInput = document.getElementById('tl-sticky')
wrapperSelect.value = state.wrapper
stickyInput.checked = state.sticky

form.addEventListener('change', ({ target }) => {
  if (target.name === 'variants') {
    if (target.checked) {
      chosen.add(target.value)
    } else {
      chosen.delete(target.value)
    }
  } else if (target === wrapperSelect) {
    state.wrapper = target.value
  } else if (target === stickyInput) {
    state.sticky = target.checked
  }

  sync()
  build()
})

build()
root.dataset.tableLarge = 'ready'
