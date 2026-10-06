// Smoke scenarios and keyboard walkthrough steps that fail because of a known
// upstream bug, each with its tracking issue in this repository (see
// "Upstream issue tracking" in CLAUDE.md).
//
// - `scenario` (smoke.spec.js): the scenario is marked `test.fail()`, so
//   Playwright reports it as soon as it passes again.
// - `walkthrough` and `step` (keyboard.spec.js): that step may fail, and the
//   walkthrough fails as soon as it passes again. `dirs` limits an entry to
//   `ltr` or `rtl`.
//
// Either way, remove the entry once it passes. `configs` limits an entry to
// some configs (or `dist`), and `engines` to some engines (chromium, firefox,
// webkit): an engine-only failure is usually a browser difference that
// Bootstrap doesn't handle. `js-api …` scenarios are the tests of
// pages/js-api.html, named like the tests.
export default [
  { scenario: 'datepicker', issue: 155 },
  { scenario: 'combobox', issue: 156 },
  { scenario: 'dialog', engines: ['webkit'], issue: 158 },

  { walkthrough: 'combobox', step: 'Escape on the toggle closes the list', issue: 156 },
  { walkthrough: 'dialog', step: 'Enter opens the dialog and moves focus into it', engines: ['webkit'], issue: 158 },
  { walkthrough: 'dialog', step: 'Space opens the dialog and moves focus into it', engines: ['webkit'], issue: 158 },
  { walkthrough: 'dialog', step: 'Enter opens a non-modal dialog and moves focus into it', engines: ['webkit'], issue: 158 },
  { walkthrough: 'drawer', step: 'Enter opens the drawer and moves focus into it', engines: ['webkit'], issue: 158 },
  { walkthrough: 'drawer', step: 'Enter opens a non-modal drawer and moves focus into it', engines: ['webkit'], issue: 158 },
  { walkthrough: 'tab', step: 'The forward arrow selects the next tab', dirs: ['rtl'], issue: 325 },
  { walkthrough: 'tab', step: 'The back arrow selects the previous tab', dirs: ['rtl'], issue: 325 },
  { walkthrough: 'chips', step: 'The back arrow at the start of the input focuses the last chip', dirs: ['rtl'], issue: 326 },
  { walkthrough: 'chips', step: 'The arrows move between chips, and forward from the last one to the input', dirs: ['rtl'], issue: 326 },
  { walkthrough: 'chips', step: 'Shift and the back arrow extend the selection', dirs: ['rtl'], issue: 326 },
  { walkthrough: 'carousel', step: 'The forward arrow shows the next slide', dirs: ['rtl'], issue: 327 },
  { walkthrough: 'carousel', step: 'The back arrow shows the previous slide', dirs: ['rtl'], issue: 327 },
  { walkthrough: 'collapse', step: 'Space toggles a collapse from a link with role="button"', issue: 328 },
  { walkthrough: 'menu', step: 'Space opens a menu from a link with role="button"', issue: 328 },
  { walkthrough: 'drawer', step: 'Space opens a drawer from a link with role="button"', issue: 328 },
  { walkthrough: 'otp', step: 'The back and forward arrows move the active slot', dirs: ['rtl'], engines: ['firefox', 'webkit'], issue: 329 },
  { scenario: 'js-api datepicker', issue: 324 },
  { scenario: 'js-api precedence popover', issue: 322 },
  { scenario: 'js-api precedence tooltip', issue: 322 },
  { scenario: 'js-api precedence scrollspy', issue: 323 }
]
