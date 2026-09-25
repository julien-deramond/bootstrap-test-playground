// Shared entry for every playground page: loads Bootstrap's JavaScript, wires
// up the demo behaviors Bootstrap's docs examples expect, and mounts the
// playground toolbar.
//
// Bootstrap's JavaScript is compiled from its TypeScript source, like the CSS is
// compiled from Sass, so the playground always runs the branch's current code.
// To test the prebuilt files committed in js/dist/ instead, import 'bootstrap'.
import * as bootstrap from 'bootstrap/js/src/index.ts'
import { configs, initConfigs } from './configs.js'
import { initExamples } from './examples.js'
import { recordVisit } from './page-index.js'
import { mountToolbar } from './toolbar.js'

// Handy for poking at components from the browser console.
window.bootstrap = bootstrap

const { swappable } = window.playgroundPrefs ? initConfigs(window.playgroundPrefs) : { swappable: false }
initExamples(bootstrap)
mountToolbar({ source: __BOOTSTRAP_SOURCE__, configs, swappable })

// For "Recently viewed" on the home page and in the page switcher.
if (!window.playgroundPrefs?.embedded) {
  recordVisit(location.pathname)
}
