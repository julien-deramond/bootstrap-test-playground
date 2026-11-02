// Breakpoint indicator: a small badge at the bottom start of the page with the
// active breakpoint's name and the viewport width. The toolbar's "Show
// breakpoint" (Alt+Shift+B, Option+Shift+B on macOS) toggles it, and it stays
// on while you browse in the same tab.
//
// The breakpoints are read at runtime from the `--breakpoint-*` tokens that
// Bootstrap declares on `:root` (`--bs-breakpoint-*` with the default custom
// property prefix), so the badge follows a config that renames, adds or removes
// breakpoints, like `breakpoints-custom`. A custom property can't be listed
// from getComputedStyle(), so the names come from the stylesheets' rules and
// the values from the computed style. The active breakpoint is the widest one
// whose minimum width is at most the viewport's, as `@media (width >= …)`
// decides. rem and em values count 16px, the browser's default font size, as
// media queries do.
//
// The badge lives in a shadow root and ignores the pointer, so it neither
// changes the page nor receives its styles. It is hidden from assistive
// technologies, like the tab order overlay: it is a tool for the person
// testing, not content.

const STORAGE_KEY = 'bootstrap-playground-breakpoints'
const HOST_ID = 'playground-breakpoints'
const TOKEN = /^--(?:[\w]+-)?breakpoint-(.+)$/

// Every custom property name of a `:root` or `:host` rule, wherever it is
// nested (layers, media queries).
function * ruleNames(rules) {
  for (const rule of rules) {
    if (rule.cssRules) {
      yield * ruleNames(rule.cssRules)
    }

    if (rule.style && /(^|,)\s*(:root|:host|html)\s*(,|$)/.test(rule.selectorText ?? '')) {
      for (const name of rule.style) {
        if (name.startsWith('--')) {
          yield name
        }
      }
    }
  }
}

const toPixels = value => {
  const number = Number.parseFloat(value)
  if (Number.isNaN(number)) {
    return null
  }

  return /r?em\s*$/.test(value) ? number * 16 : number
}

// The breakpoints of the page, narrowest first: [{ name, min }].
export function readBreakpoints(doc = document) {
  const names = new Set()
  for (const sheet of doc.styleSheets) {
    try {
      for (const name of ruleNames(sheet.cssRules)) {
        if (TOKEN.test(name)) {
          names.add(name)
        }
      }
    } catch {
      // A cross-origin stylesheet: not the playground's, nor Bootstrap's.
    }
  }

  const style = getComputedStyle(doc.documentElement)
  return [...names]
    .map(token => ({ name: token.match(TOKEN)[1], min: toPixels(style.getPropertyValue(token).trim()) }))
    .filter(({ min }) => min !== null)
    .sort((a, b) => a.min - b.min)
}

// The active breakpoint for a viewport width, or undefined without any.
export const activeBreakpoint = (breakpoints, width) => breakpoints.findLast(({ min }) => min <= width)

const styles = `
  :host { all: initial; }
  [popover] {
    position: fixed;
    inset: auto;
    inset-block-end: 12px;
    inset-inline-start: 12px;
    max-inline-size: calc(100vw - 24px);
    padding: 4px 10px;
    margin: 0;
    overflow: visible;
    font: 600 12px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #e6e6e6;
    white-space: nowrap;
    pointer-events: none;
    background: rgb(24 24 27 / .92);
    border: 1px solid rgb(255 255 255 / .12);
    border-radius: 999px;
    box-shadow: 0 6px 24px rgb(0 0 0 / .25);
  }
  .name { font-size: 14px; }
  .width { font-weight: 400; font-variant-numeric: tabular-nums; opacity: .8; }
`

// Mounts the badge, off until `toggle()`. `onChange(on)` reports the state.
export function mountBreakpointIndicator({ onChange = () => {} } = {}) {
  let host
  let layer
  let breakpoints = []

  const draw = () => {
    const current = activeBreakpoint(breakpoints, window.innerWidth)
    layer.dataset.breakpoint = current?.name ?? ''
    layer.dataset.width = String(window.innerWidth)
    layer.querySelector('.name').textContent = current?.name ?? '?'
    layer.querySelector('.width').textContent = `${window.innerWidth}px`
    layer.title = breakpoints.length > 0 ?
      breakpoints.map(({ name, min }) => `${name} ${min}px`).join(', ') :
      'No breakpoint token found'
  }

  // The tokens change with the config, whose stylesheets are swapped while the
  // page is open, so read them again at every redraw.
  const refresh = () => {
    breakpoints = readBreakpoints()
    draw()
  }

  let sheets
  let resizes
  const show = () => {
    host = document.createElement('div')
    host.id = HOST_ID
    host.setAttribute('aria-hidden', 'true')
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = `<style>${styles}</style><div popover="manual"><span class="name"></span> <span class="width"></span></div>`
    layer = shadow.querySelector('[popover]')
    document.body.append(host)
    layer.showPopover()
    refresh()

    resizes = new ResizeObserver(draw)
    resizes.observe(document.documentElement)
    // A swapped config adds and removes <link> and <style> elements.
    sheets = new MutationObserver(refresh)
    sheets.observe(document.head, { childList: true, attributes: true, attributeFilter: ['href', 'disabled', 'media'] })
    document.addEventListener('load', refresh, { capture: true })
  }

  const hide = () => {
    resizes.disconnect()
    document.removeEventListener('load', refresh, { capture: true })
    sheets.disconnect()
    host.remove()
    host = undefined
  }

  const save = on => {
    try {
      sessionStorage.setItem(STORAGE_KEY, on ? '1' : '')
    } catch {}
  }

  const indicator = {
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
    indicator.toggle(true)
  }

  return indicator
}
