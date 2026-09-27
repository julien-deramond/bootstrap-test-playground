// Shared entry for every playground page: loads Bootstrap's JavaScript, wires
// up the demo behaviors Bootstrap's docs examples expect, and mounts the
// playground toolbar.
//
// Bootstrap's JavaScript is compiled from its TypeScript source, like the CSS is
// compiled from Sass, so the playground always runs the branch's current code.
// With `?js=dist` (or the toolbar's Source switch), it loads the prebuilt
// js/dist/ modules the package ships instead, what `import 'bootstrap'` gives
// users. Only one of the two ever loads.
import { configs, initConfigs } from './configs.js'
import { initExamples } from './examples.js'
import { recordVisit } from './page-index.js'
import { mountToolbar } from './toolbar.js'

// The import is dynamic, so Bootstrap runs after DOMContentLoaded, and maybe
// after load. Several components only initialize from those events
// (#160), so replay the ones that fired meanwhile, as if Bootstrap had loaded
// with a plain script tag. A page's own inline module scripts are bundled
// after this module in a build, so they may run after both: they should check
// `document.readyState` rather than only listen for `load`.
const fired = new Set()
document.addEventListener('DOMContentLoaded', () => fired.add('DOMContentLoaded'), { once: true })
window.addEventListener('load', () => fired.add('load'), { once: true })

// Before the import: swapping stylesheets doesn't need Bootstrap's JavaScript,
// and starting early lets `load` wait for the swapped ones, as it always has.
const { swappable } = window.playgroundPrefs ? initConfigs(window.playgroundPrefs) : { swappable: false }

const jsSource = window.playgroundPrefs?.effective().js === 'dist' ? 'dist' : 'src'
const bootstrap = jsSource === 'dist' ? await import('bootstrap') : await import('bootstrap/js/src/index.ts')

// Handy for poking at components from the browser console.
window.bootstrap = bootstrap

// `?freeze`: Bootstrap starts autoplaying carousels on window load, which comes
// after this module runs. initExamples then sets them up as static carousels.
if (window.playgroundPrefs?.frozen) {
  for (const carousel of document.querySelectorAll('[data-bs-autoplay="true"]')) {
    carousel.dataset.bsAutoplay = 'false'
  }
}

initExamples(bootstrap)

if (fired.has('DOMContentLoaded')) {
  document.dispatchEvent(new Event('DOMContentLoaded'))
}

if (fired.has('load')) {
  window.dispatchEvent(new Event('load'))
}

mountToolbar({ source: __BOOTSTRAP_SOURCE__, configs, swappable })

// For "Recently viewed" on the home page and in the page switcher.
if (!window.playgroundPrefs?.embedded) {
  recordVisit(location.pathname)
}
