// Smoke scenarios that fail because of a known upstream bug, each with its
// tracking issue in this repository (see "Upstream issue tracking" in
// CLAUDE.md). The scenario is marked `test.fail()`, so Playwright reports it
// as soon as it passes again: then remove its entry here. `configs` limits an
// entry to some configs (or `dist`), and `engines` to some engines (chromium, firefox,
// webkit): an engine-only failure is usually a browser difference that
// Bootstrap doesn't handle. `js-api …` scenarios are the tests of
// pages/js-api.html, named like the tests.
export default [
  { scenario: 'datepicker', issue: 155 },
  { scenario: 'combobox', issue: 156 },
  { scenario: 'dialog', engines: ['webkit'], issue: 158 },
  { scenario: 'js-api datepicker', issue: 324 },
  { scenario: 'js-api precedence popover', issue: 322 },
  { scenario: 'js-api precedence tooltip', issue: 322 },
  { scenario: 'js-api precedence scrollspy', issue: 323 }
]
