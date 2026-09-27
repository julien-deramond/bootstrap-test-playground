// Smoke scenarios that fail because of a known upstream bug, each with its
// tracking issue in this repository (see "Upstream issue tracking" in
// CLAUDE.md). The scenario is marked `test.fail()`, so Playwright reports it
// as soon as it passes again: then remove its entry here. `configs` limits an
// entry to some configs.
export default [
  { scenario: 'datepicker', issue: 155 },
  { scenario: 'combobox', issue: 156 }
]
