// Checks for the standalone entry point pages (grid-only.html,
// reboot-only.html and utilities-only.html). Each page passes its checks by
// case name. Once the page's styles are in, every `[data-entry-case]` item gets
// data-result="pass" or "fail" and a marker, and <html> gets
// data-entry-cases="done". These builds have no badges, so the markers are
// styled by entry-points.css.

export const html = document.documentElement
export const element = id => document.getElementById(`case-${id}`)
export const style = id => getComputedStyle(element(id))
export const token = (node, name) => getComputedStyle(node).getPropertyValue(name).trim()
export const media = query => matchMedia(query).matches
export const rootFontSize = () => Number.parseFloat(getComputedStyle(html).fontSize)
export const width = node => node.getBoundingClientRect().width

// The visual suite waits for this to go before its screenshot. The page's own
// module imports src/js/main.js, whose top-level await can keep runChecks()
// from running until after `load`, in Firefox often. This module doesn't
// import it, so this line runs before `load`.
html.dataset.playgroundBusy = ''

// Every style rule of the page's same-origin stylesheets, with the layer it
// sits in.
export function rules() {
  const found = []
  const walk = (list, layer) => {
    for (const rule of list) {
      if (rule instanceof CSSStyleRule) {
        found.push({ rule, layer })
      } else if (rule instanceof CSSLayerBlockRule) {
        walk(rule.cssRules, [layer, rule.name].filter(Boolean).join('.'))
      } else if (rule.cssRules) {
        walk(rule.cssRules, layer)
      }
    }
  }

  for (const sheet of document.styleSheets) {
    try {
      walk(sheet.cssRules, '')
    } catch {
      // Cross-origin stylesheets can't be read.
    }
  }

  return found
}

export const findRule = selector => rules().find(({ rule }) => rule.selectorText === selector)

export function runChecks(checks) {
  const run = () => {
    for (const item of document.querySelectorAll('[data-entry-case]')) {
      const pass = checks[item.dataset.entryCase]()
      item.dataset.result = pass ? 'pass' : 'fail'
      const { issue } = item.dataset
      item.querySelector('.pg-marker').innerHTML = `<span class="pg-result">${pass ? 'Pass' : 'Fail'}</span>
        <span>${item.dataset.expect}</span>
        ${issue ? `<a href="https://github.com/julien-deramond/bootstrap-test-playground/issues/${issue}">#${issue}</a>` : ''}`
    }

    html.dataset.entryCases = 'done'
    delete html.dataset.playgroundBusy
  }

  // In a build, this script runs after src/js/main.js, which may be after
  // `load`: check the ready state rather than only waiting for the event.
  if (document.readyState === 'complete') {
    requestAnimationFrame(run)
  } else {
    window.addEventListener('load', () => requestAnimationFrame(run), { once: true })
  }
}
