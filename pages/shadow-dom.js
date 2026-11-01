// pages/shadow-dom.html: Bootstrap's compiled CSS adopted in the shadow roots
// of two <pg-bootstrap-box> custom elements (the second has data-bs-theme="dark"
// on its host), then a table of what works inside them.
//
// The roots adopt the text of the page's own `link[data-playground-styles]`
// sheets, so they follow the config and the Bootstrap source the toolbar
// picked. They are re-adopted whenever those links are swapped.
//
// Everything comes from `window.bootstrap`, never from an import, so the page
// tests whichever build the toolbar picked (`?js=dist`).
//
// The table has one row per check, with data-check="<id>" and
// data-result="pass", "fail" or "info"; <html> gets data-shadow-dom="ready"
// once they are all in.

const html = document.documentElement

const readStyles = () =>
  [...document.querySelectorAll('link[data-playground-styles]')]
    .map(link => {
      try {
        return [...link.sheet.cssRules].map(rule => rule.cssText).join('\n')
      } catch {
        return ''
      }
    })
    .join('\n')

const boxes = new Set()

// Waits for the stylesheets to be loaded (a swapped config adds a new link).
const adoptAll = () => {
  const css = readStyles()
  for (const box of boxes) {
    box.adopt(css)
  }
}

class PgBootstrapBox extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) {
      return
    }

    const root = this.attachShadow({ mode: 'open' })
    this.sheet = new CSSStyleSheet()
    root.adoptedStyleSheets = [this.sheet]
    root.append(document.getElementById('pg-box-template').content.cloneNode(true))
    root.querySelector('[data-title]').textContent =
      this.dataset.instance === 'dark' ? 'Shadow root, dark host' : 'Shadow root'
    boxes.add(this)
    this.adopt(readStyles())
  }

  adopt(css) {
    this.sheet.replaceSync(css)
  }
}

customElements.define('pg-bootstrap-box', PgBootstrapBox)

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const until = async (test, ms = 1500) => {
  const end = performance.now() + ms
  while (performance.now() < end) {
    if (test()) {
      return true
    }

    await sleep(30)
  }

  return Boolean(test())
}

const tbody = document.querySelector('[data-shadow-checks] tbody')
const record = (id, label, result, detail) => {
  const row = document.createElement('tr')
  row.dataset.check = id
  row.dataset.result = result
  for (const text of [label, result, detail]) {
    const cell = document.createElement('td')
    cell.textContent = text
    row.append(cell)
  }

  tbody.append(row)
}

const run = async bootstrap => {
  const { Dialog, Menu, Tooltip } = bootstrap
  const [light, dark] = [...document.querySelectorAll('pg-bootstrap-box')]
  const q = (box, selector) => box.shadowRoot.querySelector(selector)
  const style = (el, pseudo) => getComputedStyle(el, pseudo)

  // Tokens and reboot -------------------------------------------------------
  for (const [name, box] of [['light', light], ['dark', dark]]) {
    const card = q(box, '.card')
    const token = style(card).getPropertyValue('--bs-bg-body').trim()
    record(`tokens-${name}`, `Tokens reach the ${name} root (--bs-bg-body)`, token ? 'pass' : 'fail', token || 'empty')
  }

  const lightBg = style(q(light, '.card')).backgroundColor
  const darkBg = style(q(dark, '.card')).backgroundColor
  record('dark-host', 'data-bs-theme="dark" on the host changes the card background', lightBg === darkBg ? 'fail' : 'pass', `${lightBg} then ${darkBg}`)

  const darkScheme = style(q(dark, '.card')).colorScheme
  record('dark-color-scheme', 'The dark host sets color-scheme: dark', darkScheme.includes('dark') ? 'pass' : 'fail', darkScheme || 'empty')

  const rootFont = style(q(light, '[data-part="form"]')).fontFamily
  const bodyFont = style(document.body).fontFamily
  record('reboot-font', 'The root gets the body font from :host', rootFont === bodyFont ? 'pass' : 'fail', `${rootFont} against ${bodyFont}`)

  const hostColor = style(light).color
  const bodyColor = style(document.body).color
  record('reboot-color', 'The host text color matches the body', hostColor === bodyColor ? 'pass' : 'info', `${hostColor} against ${bodyColor}`)

  const focusRing = style(q(light, 'button')).getPropertyValue('--bs-focus-ring-color').trim()
  record('theme-token', 'A theme token resolves on a button (--bs-focus-ring-color)', focusRing ? 'pass' : 'info', focusRing || 'empty')

  // Menus ---------------------------------------------------------------
  const menuOpen = toggle => toggle.getAttribute('aria-expanded') === 'true'

  for (const [name, box] of [['light', light], ['dark', dark]]) {
    const toggle = q(box, '[data-menu="data-api"]')
    toggle.click()
    const opened = await until(() => menuOpen(toggle), 800)
    record(`menu-data-api-${name}`, `Menu opens from data-bs-toggle in the ${name} root`, opened ? 'pass' : 'fail', `aria-expanded=${toggle.getAttribute('aria-expanded')}`)
    if (opened) {
      toggle.click()
      await until(() => !menuOpen(toggle), 800)
    }

    const codeToggle = q(box, '[data-menu="code"]')
    const menu = new Menu(codeToggle)
    menu.show()
    const shown = await until(() => menuOpen(codeToggle), 800)
    const menuEl = codeToggle.parentElement.querySelector('.menu')
    const visible = shown && style(menuEl).display !== 'none' && menuEl.getClientRects().length > 0
    record(`menu-code-${name}`, `new Menu() opens in the ${name} root and is visible`, visible ? 'pass' : 'fail', `aria-expanded=${codeToggle.getAttribute('aria-expanded')}, rects=${menuEl.getClientRects().length}`)
    menu.hide()
    await until(() => !menuOpen(codeToggle), 800)
  }

  const tipBackgrounds = {}

  // Tooltips -------------------------------------------------------------
  for (const [name, box] of [['light', light], ['dark', dark]]) {
    for (const kind of ['body', 'root']) {
      const trigger = q(box, `[data-tooltip="${kind}"]`)
      const options = kind === 'root' ? { container: q(box, '[data-part="tooltips"]') } : {}
      const tooltip = new Tooltip(trigger, options)
      tooltip.show()
      const tipId = () => trigger.getAttribute('aria-describedby')
      await until(() => tipId() && (document.getElementById(tipId()) || box.shadowRoot.getElementById(tipId())), 1000)
      const tip = tipId() && (box.shadowRoot.getElementById(tipId()) || document.getElementById(tipId()))
      if (!tip) {
        record(`tooltip-${kind}-${name}`, `Tooltip (${kind} container) shows in the ${name} root`, 'fail', 'no tip element')
        continue
      }

      const inRoot = tip.getRootNode() === box.shadowRoot
      await until(() => tip.classList.contains('show'), 1000)
      const bg = style(tip.querySelector('.tooltip-inner')).backgroundColor
      const styled = bg !== 'rgba(0, 0, 0, 0)' && style(tip).position !== 'static'
      record(`tooltip-${kind}-${name}`, `Tooltip (${kind} container) is styled in the ${name} root`, styled ? 'pass' : 'fail', `tip in the ${inRoot ? 'shadow root' : 'document'}, .tooltip-inner background ${bg}, position ${style(tip).position}`)
      tipBackgrounds[`${name}-${kind}`] = bg
      tooltip.hide()
      await sleep(250)
      tooltip.dispose()
    }
  }

  record(
    'tooltip-host-theme',
    'A tooltip appended to the body follows the dark host\'s color mode',
    tipBackgrounds['dark-body'] === tipBackgrounds['dark-root'] ? 'pass' : 'info',
    `body container ${tipBackgrounds['dark-body']}, root container ${tipBackgrounds['dark-root']}`
  )

  // Dialogs ------------------------------------------------------------------
  for (const [name, box] of [['light', light], ['dark', dark]]) {
    const dialog = q(box, 'dialog')
    const closeDialog = async () => {
      if (dialog.open) {
        dialog.close()
        await until(() => !dialog.open, 800)
      }
    }

    q(box, '[data-dialog-trigger="data-api"]').click()
    const viaDataApi = await until(() => dialog.open, 800)
    record(`dialog-data-api-${name}`, `Dialog opens from data-bs-toggle and data-bs-target in the ${name} root`, viaDataApi ? 'pass' : 'fail', viaDataApi ? 'open' : 'closed')
    await closeDialog()

    await Dialog.getOrCreateInstance(dialog).show()
    const viaCode = await until(() => dialog.open, 800)
    const backdrop = style(dialog, '::backdrop').backgroundColor
    record(`dialog-code-${name}`, `Dialog.show() opens in the ${name} root`, viaCode ? 'pass' : 'fail', viaCode ? 'open' : 'closed')
    record(`dialog-backdrop-${name}`, `The ${name} root's ::backdrop is styled`, backdrop === 'rgba(0, 0, 0, 0)' ? 'info' : 'pass', backdrop)

    if (viaCode) {
      q(box, '[data-bs-dismiss="dialog"]').click()
      const dismissed = await until(() => !dialog.open, 1000)
      record(`dialog-dismiss-${name}`, `data-bs-dismiss closes the dialog in the ${name} root`, dismissed ? 'pass' : 'fail', dismissed ? 'closed' : 'still open')
    }

    await closeDialog()

    q(box, '[data-dialog-trigger="command"]').click()
    const viaCommand = await until(() => dialog.open, 800)
    record(`dialog-command-${name}`, `command="show-modal" opens the dialog in the ${name} root`, viaCommand ? 'pass' : 'fail', viaCommand ? 'open' : 'closed')
    await closeDialog()
  }

  html.dataset.shadowDom = 'ready'
  delete html.dataset.playgroundBusy
}

// Re-adopt when the toolbar swaps a stylesheet: the old link goes and a new
// one is added, which fires `load` on the new one.
new MutationObserver(mutations => {
  for (const { addedNodes } of mutations) {
    for (const node of addedNodes) {
      if (node.matches?.('link[data-playground-styles]')) {
        node.addEventListener('load', adoptAll, { once: true })
      }
    }
  }
}).observe(document.head, { childList: true })

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
