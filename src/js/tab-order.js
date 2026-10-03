// Tab order overlay: numbers every tab stop of the page in the order the Tab
// key visits them, for a manual review of focus order. The toolbar's "Show
// tab order" (Alt+Shift+O, Option+Shift+O on macOS) toggles it, and it stays
// on while you browse in the same tab.
//
// The order follows HTML's sequential focus navigation: positive `tabindex`
// first, in ascending order, then the rest in tree order, through open shadow
// roots. A stop is focusable, not `tabindex="-1"`, disabled, inert or hidden,
// and outside a modal <dialog> when one is open. Of a group of radios, only
// the checked one is a stop, or the first one when none is. Browsers can still
// differ: WebKit on macOS only tabs to text fields and selects unless Safari's
// "Press Tab to highlight each item" is on, and Chromium also stops on
// scrollable areas without a focusable child, which the overlay doesn't count.
//
// The overlay lives in the top layer, in a shadow root, and ignores the
// pointer, so it neither covers nor changes what it numbers.

const STORAGE_KEY = 'bootstrap-playground-tab-order'
// The playground's own UI: the toolbar, the page switcher and the overlay.
const PLAYGROUND_HOSTS = ['playground-toolbar', 'playground-palette', 'playground-tab-order']

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  'details > summary:first-of-type',
  '[tabindex]'
].join(', ')

// Every element of `root` in tree order, entering open shadow roots where
// their host is.
function * walk(root) {
  for (const element of root.children) {
    if (PLAYGROUND_HOSTS.includes(element.id)) {
      continue
    }

    yield element
    if (element.shadowRoot) {
      yield * walk(element.shadowRoot)
    }

    yield * walk(element)
  }
}

const isStop = (element, scope) => {
  if (!element.matches(FOCUSABLE) || element.tabIndex < 0 || element.matches(':disabled')) {
    return false
  }

  // Inert, or outside the open modal dialog.
  if (element.closest('[inert]') || (scope && !scope.contains(element))) {
    return false
  }

  // Not rendered, `visibility: hidden`, or in a closed <details>.
  return element.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: false })
}

// The tab stops of the document, in the order Tab visits them.
export function tabOrder(doc = document) {
  // A modal dialog makes the rest of the page inert. The last one opened is
  // on top, and holds focus when there's more than one.
  const modals = [...doc.querySelectorAll('dialog:modal')]
  const scope = modals.find(dialog => dialog.contains(doc.activeElement)) ?? modals.at(-1)

  const stops = [...walk(doc.documentElement)].filter(element => isStop(element, scope))

  // One stop per group of radios (same name, same form): the checked one, or
  // the first one.
  const groups = new Map()
  for (const radio of stops.filter(element => element.matches('input[type="radio"][name]'))) {
    const key = radio.form ?? radio.getRootNode()
    const names = groups.get(key) ?? new Map()
    groups.set(key, names)
    const current = names.get(radio.name)
    if (!current || (radio.checked && !current.checked)) {
      names.set(radio.name, radio)
    }
  }

  const kept = new Set([...groups.values()].flatMap(names => [...names.values()]))
  const filtered = stops.filter(element => !element.matches('input[type="radio"][name]') || kept.has(element))

  // Positive tabindex first, ascending; the sort is stable for the rest.
  const rank = element => (element.tabIndex > 0 ? element.tabIndex : Number.MAX_SAFE_INTEGER)
  return filtered.sort((a, b) => rank(a) - rank(b))
}

const styles = `
  :host { all: initial; }
  [popover] {
    position: fixed;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    max-inline-size: none;
    max-block-size: none;
    padding: 0;
    margin: 0;
    overflow: hidden;
    pointer-events: none;
    background: transparent;
    border: 0;
  }
  .box {
    position: absolute;
    box-sizing: border-box;
    border: 2px dashed #e5484d;
    border-radius: 3px;
  }
  .box.positive { border-color: #f5a524; }
  .number {
    position: absolute;
    inset-block-start: -11px;
    inset-inline-start: -11px;
    min-inline-size: 20px;
    block-size: 20px;
    padding: 0 5px;
    box-sizing: border-box;
    font: 600 11px/20px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #fff;
    text-align: center;
    background: #e5484d;
    border-radius: 999px;
    box-shadow: 0 0 0 2px #fff;
  }
  .positive .number { color: #111; background: #f5a524; }
  .focused { border-style: solid; }
  .focused .number { box-shadow: 0 0 0 2px #fff, 0 0 0 4px #111; }
`

// Mounts the overlay, off until `toggle()`. `onChange(on)` reports the state.
export function mountTabOrder({ onChange = () => {} } = {}) {
  let host
  let layer
  let frame = 0
  let observer
  let raised = ''

  const draw = () => {
    frame = 0
    const stops = tabOrder()
    // Top layer elements stack in the order they entered it: re-enter it
    // after a modal dialog or a popover opens, to stay on top.
    const above = [...document.querySelectorAll(':modal, :popover-open')].filter(element => element !== layer).length
    if (String(above) !== raised) {
      raised = String(above)
      layer.hidePopover()
      layer.showPopover()
    }

    const width = document.documentElement.clientWidth
    const height = document.documentElement.clientHeight
    const boxes = []
    for (const [index, element] of stops.entries()) {
      const rect = element.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > height || rect.right < 0 || rect.left > width) {
        continue
      }

      const box = document.createElement('div')
      box.className = `box${element.tabIndex > 0 ? ' positive' : ''}${element === document.activeElement || element.contains(document.activeElement) ? ' focused' : ''}`
      box.dataset.index = index + 1
      box.style.cssText = `left: ${rect.left}px; top: ${rect.top}px; width: ${rect.width}px; height: ${rect.height}px;`
      const number = document.createElement('span')
      number.className = 'number'
      number.textContent = index + 1
      box.append(number)
      boxes.push(box)
    }

    layer.replaceChildren(...boxes)
    layer.dataset.count = stops.length
  }

  const schedule = () => {
    frame ||= requestAnimationFrame(draw)
  }

  const show = () => {
    host = document.createElement('div')
    host.id = 'playground-tab-order'
    host.setAttribute('aria-hidden', 'true')
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = `<style>${styles}</style><div popover="manual"></div>`
    layer = shadow.querySelector('[popover]')
    document.body.append(host)
    raised = ''

    observer = new MutationObserver(schedule)
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'open', 'disabled', 'tabindex', 'inert', 'href', 'type', 'checked', 'contenteditable', 'dir']
    })
    for (const type of ['scroll', 'resize', 'focusin', 'change', 'toggle', 'transitionend']) {
      window.addEventListener(type, schedule, { capture: true, passive: true })
    }

    draw()
  }

  const hide = () => {
    observer.disconnect()
    for (const type of ['scroll', 'resize', 'focusin', 'change', 'toggle', 'transitionend']) {
      window.removeEventListener(type, schedule, { capture: true })
    }

    cancelAnimationFrame(frame)
    frame = 0
    host.remove()
    host = undefined
  }

  const save = on => {
    try {
      sessionStorage.setItem(STORAGE_KEY, on ? '1' : '')
    } catch {}
  }

  const overlay = {
    get on() {
      return Boolean(host)
    },
    toggle(on = !host) {
      if (on === Boolean(host)) {
        return
      }

      if (on) {
        show()
      } else {
        hide()
      }

      save(on)
      onChange(on)
    }
  }

  let saved = false
  try {
    saved = sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {}

  if (saved) {
    overlay.toggle(true)
  }

  return overlay
}
