// pages/js-api.html: every component driven from JavaScript. Each
// [data-jsapi] section gets buttons for getInstance(), getOrCreateInstance(),
// the component's methods and dispose(), a switch that cancels the next event
// starting an action, "Mount a copy", and a log of its `*.bs.*` events, which
// the page's first script records from the start. The option precedence table
// instantiates fresh copies of each component's markup.
//
// Everything comes from `window.bootstrap`, never from an import, so the page
// tests whichever build the toolbar picked (`?js=dist`).
//
// The log is what tests/smoke/smoke.spec.js reads: each <li> has a
// `data-entry`, like `show()`, `show.bs.dialog`, `show.bs.dialog prevented` or
// `show() resolved`. Each precedence cell has data-result="pass" or "fail",
// and <html> gets data-js-api="ready" once everything is set up.
import { cloneWithSuffix } from '/src/js/reproduction.js'

// The tracking issue of an upstream bug a precedence check runs into, by
// component and column.
const KNOWN = {
  popover: { config: 322, existing: 322 },
  scrollspy: { config: 323, existing: 323 },
  tooltip: { config: 322, existing: 322 }
}

// For each section: the class on `window.bootstrap`, the methods offered
// (a name, or a name and its arguments), the cancelable event that starts the
// action, and the option the precedence table checks, with the value set from
// data-bs-config, from its data-bs-* attribute and from JavaScript.
const COMPONENTS = {
  alert: { name: 'Alert', methods: ['close'], cancel: 'close' },
  button: { name: 'Button', methods: ['toggle'] },
  carousel: {
    name: 'Carousel',
    methods: ['prev', 'next', ['to', 2], 'pause', 'cycle'],
    cancel: 'slide',
    option: { name: 'interval', values: [1000, 2000, 3000] }
  },
  chips: {
    name: 'Chips',
    methods: [['add', 'Smoke'], ['remove', 'Smoke'], 'getValues', 'clear'],
    cancel: 'add',
    option: { name: 'placeholder', values: ['config', 'attribute', 'js'] }
  },
  collapse: {
    name: 'Collapse',
    methods: ['show', 'hide', 'toggle'],
    cancel: 'show',
    // `parent` is resolved to an element: compare its id.
    option: { name: 'parent', values: ['#parent-1', '#parent-2', '#parent-3'], read: value => (value ? `#${value.id}` : value) }
  },
  combobox: {
    name: 'Combobox',
    methods: ['show', 'hide', 'toggle'],
    cancel: 'show',
    option: { name: 'placeholder', values: ['config', 'attribute', 'js'] }
  },
  datepicker: {
    name: 'Datepicker',
    methods: ['show', 'hide', 'toggle', 'getSelectedDates'],
    cancel: 'show',
    option: { name: 'firstWeekday', values: [0, 6, 3] }
  },
  dialog: {
    name: 'Dialog',
    methods: ['show', 'hide', 'toggle'],
    cancel: 'show',
    option: { name: 'backdrop', values: ['static', false, true] }
  },
  drawer: {
    name: 'Drawer',
    methods: ['show', 'hide', 'toggle'],
    cancel: 'show',
    option: { name: 'backdrop', values: ['static', false, true] }
  },
  menu: {
    name: 'Menu',
    methods: ['show', 'hide', 'toggle', 'update'],
    cancel: 'show',
    option: { name: 'placement', values: ['top-start', 'bottom-end', 'top-end'] }
  },
  'nav-overflow': {
    name: 'NavOverflow',
    methods: ['update'],
    option: { name: 'moreText', values: ['config', 'attribute', 'js'] }
  },
  'otp-input': {
    name: 'OtpInput',
    methods: [['setValue', '123456'], 'getValue', 'clear'],
    option: { name: 'separator', values: ['config', 'attribute', 'js'] }
  },
  popover: {
    name: 'Popover',
    methods: ['show', 'hide', 'toggle', 'disable', 'enable'],
    cancel: 'show',
    option: { name: 'customClass', values: ['config', 'attribute', 'js'] }
  },
  range: {
    name: 'Range',
    methods: ['update'],
    option: { name: 'bubble', values: [true, false, true] }
  },
  scrollspy: {
    name: 'ScrollSpy',
    methods: ['refresh'],
    option: { name: 'topMargin', values: ['10%', '20%', '30%'] }
  },
  strength: {
    name: 'Strength',
    methods: ['evaluate', 'getStrength'],
    option: { name: 'minLength', values: [10, 12, 14] }
  },
  tab: { name: 'Tab', methods: ['show'], cancel: 'show' },
  toast: {
    name: 'Toast',
    methods: ['show', 'hide', 'isShown'],
    cancel: 'show',
    option: { name: 'delay', values: [1000, 2000, 3000] }
  },
  toggler: {
    name: 'Toggler',
    methods: ['toggle'],
    cancel: 'toggle',
    option: { name: 'value', values: ['config', 'attribute', 'js'] }
  },
  tooltip: {
    name: 'Tooltip',
    methods: ['show', 'hide', 'toggle', 'disable', 'enable'],
    cancel: 'show',
    option: { name: 'customClass', values: ['config', 'attribute', 'js'] }
  }
}

const html = document.documentElement
const kebab = name => name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)
const markup = key => window.jsApiMarkup.get(key)
const sections = new Map([...document.querySelectorAll('[data-jsapi]')].map(section => [section.dataset.jsapi, section]))

// `#id`, or the tag and first class: enough to tell elements apart in a log.
function describe(node) {
  if (node === document) {
    return 'document'
  }

  if (node === window) {
    return 'window'
  }

  if (!(node instanceof Element)) {
    return String(node)
  }

  return node.id ? `#${node.id}` : `${node.localName}${node.classList.length > 0 ? `.${node.classList[0]}` : ''}`
}

function format(value) {
  if (value instanceof Element) {
    return describe(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(format).join(', ')}]`
  }

  return typeof value === 'string' ? JSON.stringify(value) : String(value)
}

// --- Event log ---------------------------------------------------------------

function append(section, kind, entry, text = entry) {
  const item = document.createElement('li')
  item.dataset.kind = kind
  item.dataset.entry = entry
  item.textContent = text
  const log = section.querySelector('[data-jsapi-log]')
  log.querySelector('ol').append(item)
  log.scrollTop = log.scrollHeight
  return item
}

const logged = new WeakMap()
// The section of each component element, for the events it gets once it's
// out of the document, like `closed.bs.alert`.
const owners = new WeakMap()

function logEvent(entry) {
  const section = entry.target instanceof Element ? entry.target.closest('[data-jsapi]') ?? owners.get(entry.target) : null
  if (!section) {
    return
  }

  const { event, target } = entry
  const details = [`on ${describe(target)}`]
  if ('relatedTarget' in event) {
    details.push(`relatedTarget: ${event.relatedTarget ? describe(event.relatedTarget) : 'null'}`)
  }

  logged.set(entry, append(section, 'event', event.type, `${event.type} ${details.join(' · ')}`))
  if (entry.dispatched) {
    markPrevented(entry)
  }
}

function markPrevented(entry) {
  const item = logged.get(entry)
  const { event } = entry
  if (item && event.defaultPrevented) {
    item.dataset.prevented = ''
    item.dataset.entry = `${event.type} prevented`
    item.textContent += ' · prevented'
  }
}

// --- Controls ----------------------------------------------------------------

function button(label, onClick, theme = 'secondary') {
  const element = document.createElement('button')
  element.type = 'button'
  element.className = `btn-outline theme-${theme} btn-sm`
  element.textContent = label
  element.addEventListener('click', onClick)
  return element
}

function initSection(key, section, bootstrap) {
  const { name, methods, cancel } = COMPONENTS[key]
  const Component = bootstrap[name]
  const title = section.querySelector('h2').textContent
  const state = { target: section.querySelector('[data-jsapi-markup] [data-jsapi-element]'), copies: 0 }
  owners.set(state.target, section)
  const log = (entry, text) => append(section, 'call', entry, text)

  const panel = section.querySelector('[data-jsapi-panel]')
  const controls = document.createElement('div')
  controls.className = 'd-flex flex-wrap gap-2 mb-3'
  controls.setAttribute('role', 'group')
  controls.setAttribute('aria-label', `${title} API`)

  const instance = () => {
    if (Component.getInstance(state.target)) {
      return Component.getInstance(state.target)
    }

    log('getOrCreateInstance() → new instance')
    return Component.getOrCreateInstance(state.target)
  }

  controls.append(
    button('getInstance()', () => log(`getInstance() → ${Component.getInstance(state.target) ? 'instance' : 'null'}`)),
    button('getOrCreateInstance()', () => {
      const existing = Component.getInstance(state.target)
      Component.getOrCreateInstance(state.target)
      log(`getOrCreateInstance() → ${existing ? 'existing' : 'new'} instance`)
    })
  )

  // Logs the call, then what it returned: when a promise resolves, or the value.
  const callMethod = (methodName, args = []) => {
    const call = `${methodName}(${args.map(format).join(', ')})`
    const target = instance()
    log(call)
    let result
    try {
      result = target[methodName](...args)
    } catch (error) {
      log(`${call} threw`, `${call} threw ${error.name}: ${error.message}`)
      return
    }

    if (result instanceof Promise) {
      result.then(() => log(`${call} resolved`), error => log(`${call} rejected`, `${call} rejected: ${error.message}`))
    } else if (result !== undefined) {
      log(`${call} → ${format(result)}`)
    }
  }

  for (const method of methods) {
    const [methodName, ...args] = [method].flat()
    controls.append(button(`${methodName}(${args.map(format).join(', ')})`, () => callMethod(methodName, args)))
  }

  // Buttons inside a modal overlay, in the original markup and its copies.
  section.addEventListener('click', event => {
    const trigger = event.target.closest('[data-jsapi-call]')
    if (trigger) {
      callMethod(trigger.dataset.jsapiCall)
    }
  })

  controls.append(button('dispose()', () => {
    const existing = Component.getInstance(state.target)
    if (existing) {
      existing.dispose()
      log('dispose()')
    } else {
      log('dispose() → no instance')
    }
  }))

  const options = document.createElement('div')
  options.className = 'd-flex flex-wrap align-items-center gap-3 mb-2'

  if (cancel) {
    const type = `${cancel}.bs.${Component.NAME}`
    const field = document.createElement('div')
    field.className = 'form-field'
    field.innerHTML = `<input type="checkbox" class="check" id="${key}-cancel"><label for="${key}-cancel">Cancel next <code>${type}</code></label>`
    const checkbox = field.querySelector('input')
    document.addEventListener(type, event => {
      if (checkbox.checked && section.contains(event.target)) {
        event.preventDefault()
        checkbox.checked = false
      }
    }, { capture: true })
    options.append(field)
  }

  const driving = document.createElement('span')
  driving.className = 'small fg-2'
  driving.dataset.jsapiTarget = ''
  const showTarget = () => {
    driving.textContent = `Driving ${describe(state.target)}`
  }

  showTarget()

  const copies = document.createElement('div')
  copies.dataset.jsapiCopies = ''
  section.querySelector('[data-jsapi-markup]').append(copies)

  options.append(
    button('Mount a copy', () => {
      state.copies++
      const copy = cloneWithSuffix(markup(key), `-copy${state.copies}`)
      copy.removeAttribute('data-jsapi-markup')
      copy.className = 'mt-3'
      copies.append(copy)
      state.target = copy.querySelector('[data-jsapi-element]')
      owners.set(state.target, section)
      log(`mounted ${describe(state.target)}`)
      showTarget()
    }, 'primary'),
    button('Clear log', () => section.querySelector('[data-jsapi-log] ol').replaceChildren()),
    driving
  )

  // The buttons only call the API. Their clicks don't reach Bootstrap's
  // document listeners, which would take them for a click outside and close a
  // menu, a combobox or a datepicker just opened, and they don't take the
  // focus, which would close a datepicker or a tooltip.
  for (const container of [controls, options]) {
    container.addEventListener('mousedown', event => event.preventDefault())
    for (const type of ['pointerdown', 'mousedown', 'click']) {
      container.addEventListener(type, event => event.stopPropagation())
    }
  }

  const logPanel = document.createElement('div')
  logPanel.className = 'pg-log'
  logPanel.dataset.jsapiLog = ''
  logPanel.tabIndex = 0
  logPanel.setAttribute('role', 'log')
  logPanel.setAttribute('aria-label', `${title} log`)
  logPanel.append(document.createElement('ol'))

  panel.append(controls, options, logPanel)
}

// --- Option precedence -------------------------------------------------------

const CASES = [
  ['default', []],
  ['config', ['config']],
  ['config-attribute', ['config', 'attribute']],
  ['attribute-js', ['attribute', 'js']],
  ['all', ['config', 'attribute', 'js']]
]

let copyCount = 0

// A fresh copy of the component's markup in the hidden sandbox, without the
// option set anywhere. `cleanup()` disposes its instance and removes it.
function freshElement(key, optionName) {
  const copy = cloneWithSuffix(markup(key), `-p${++copyCount}`)
  copy.removeAttribute('data-jsapi-markup')
  document.getElementById('precedence-sandbox').append(copy)
  const element = copy.querySelector('[data-jsapi-element]')
  element.removeAttribute('data-bs-config')
  element.removeAttribute(`data-bs-${kebab(optionName)}`)
  return { element, cleanup: Component => {
    Component.getInstance(element)?.dispose()
    copy.remove()
  } }
}

function precedenceRow(key, bootstrap) {
  const { name, option } = COMPONENTS[key]
  const Component = bootstrap[name]
  const [fromConfig, fromAttribute, fromJs] = option.values
  const read = instance => (option.read ?? (value => value))(instance._config[option.name])
  const expected = {
    default: (option.read ?? (value => value))(Component.Default[option.name]),
    config: fromConfig,
    'config-attribute': fromAttribute,
    'attribute-js': fromJs,
    all: fromJs,
    existing: fromConfig,
    disposed: fromJs
  }

  const results = {}
  const attempt = (id, run) => {
    const { element, cleanup } = freshElement(key, option.name)
    try {
      results[id] = { value: run(element) }
    } catch (error) {
      results[id] = { error: `${error.name}: ${error.message}` }
    } finally {
      cleanup(Component)
    }
  }

  const setConfig = element => element.setAttribute('data-bs-config', JSON.stringify({ [option.name]: fromConfig }))
  const setAttribute = element => element.setAttribute(`data-bs-${kebab(option.name)}`, typeof fromAttribute === 'string' ? fromAttribute : JSON.stringify(fromAttribute))

  for (const [id, sources] of CASES) {
    attempt(id, element => {
      if (sources.includes('config')) {
        setConfig(element)
      }

      if (sources.includes('attribute')) {
        setAttribute(element)
      }

      return read(new Component(element, sources.includes('js') ? { [option.name]: fromJs } : undefined))
    })
  }

  // getOrCreateInstance() returns the existing instance, options ignored.
  attempt('existing', element => {
    setConfig(element)
    Component.getOrCreateInstance(element)
    return read(Component.getOrCreateInstance(element, { [option.name]: fromJs }))
  })

  // After dispose(), it creates a new instance with its options.
  attempt('disposed', element => {
    setConfig(element)
    Component.getOrCreateInstance(element).dispose()
    return read(Component.getOrCreateInstance(element, { [option.name]: fromJs }))
  })

  const row = document.querySelector('#precedence-checks tbody').insertRow()
  row.dataset.component = key
  // The value from each source, for the smoke suite's own expectations.
  Object.assign(row.dataset, { default: format(expected.default), config: format(fromConfig), attribute: format(fromAttribute), js: format(fromJs) })
  row.innerHTML = `<th scope="row"><a href="#${key}">${sections.get(key).querySelector('h2').textContent}</a></th><td><code>${option.name}</code></td>`
  for (const id of ['default', 'config', 'config-attribute', 'attribute-js', 'all', 'existing', 'disposed']) {
    const cell = row.insertCell()
    cell.dataset.case = id
    const { value, error } = results[id]
    const pass = !error && JSON.stringify(value) === JSON.stringify(expected[id])
    cell.dataset.result = pass ? 'pass' : 'fail'
    cell.dataset.expected = format(expected[id])
    cell.dataset.actual = error ?? format(value)
    cell.innerHTML = `<code>${error ? 'error' : format(value)}</code>`

    const badge = document.createElement('span')
    badge.className = `badge ${pass ? 'theme-success' : 'theme-danger'} ms-2`
    badge.textContent = pass ? 'Pass' : 'Fail'
    badge.title = pass ? '' : `Expected ${cell.dataset.expected}, got ${cell.dataset.actual}`
    cell.append(badge)

    const issue = KNOWN[key]?.[id]
    if (!pass && issue) {
      cell.insertAdjacentHTML('beforeend', ` <a href="https://github.com/julien-deramond/bootstrap-test-playground/issues/${issue}">#${issue}</a>`)
    }
  }
}

// --- Start -------------------------------------------------------------------

function run(bootstrap) {
  for (const [key, section] of sections) {
    initSection(key, section, bootstrap)
  }

  // Events recorded so far, then the next ones as they come.
  const events = window.jsApiEvents
  for (const entry of events) {
    logEvent(entry)
  }

  events.onEvent = logEvent
  events.onDispatched = markPrevented

  for (const key of sections.keys()) {
    if (COMPONENTS[key].option) {
      precedenceRow(key, bootstrap)
    }
  }

  html.dataset.jsApi = 'ready'
  // The visual suite waits for this to go before its screenshot.
  delete html.dataset.playgroundBusy
}

// Bootstrap is on `window.bootstrap` once src/js/main.js has imported it,
// which may come after `load`. Timers rather than requestAnimationFrame,
// which stops in hidden tabs.
const start = () => {
  if (window.bootstrap && document.readyState === 'complete' && !document.getElementById('playground-config-pending')) {
    run(window.bootstrap)
  } else {
    setTimeout(start, 50)
  }
}

start()
