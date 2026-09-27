// Smoke scenarios that fail because of a known upstream bug, each with its
// tracking issue in this repository (see "Upstream issue tracking" in
// CLAUDE.md). The scenario is marked `test.fail()`, so Playwright reports it
// as soon as it passes again: then remove its entry here. `configs` limits an
// entry to some configs, and `engines` to some engines (chromium, firefox,
// webkit): an engine-only failure is usually a browser difference that
// Bootstrap doesn't handle.
export default [
  { scenario: 'datepicker', issue: 155 },
  { scenario: 'combobox', issue: 156 },
  { scenario: 'dialog', engines: ['webkit'], issue: 158 }
]
