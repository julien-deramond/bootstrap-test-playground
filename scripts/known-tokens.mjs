// Findings of scripts/audit-tokens.mjs that are known: tracked as an upstream
// bug (`issue`, a tracking issue in this repository) or intended (`reason`).
// Each entry matches one kind and either a list of tokens or a pattern, in
// every config or only in the ones `configs` names.
// Tokens are named like in the Sass source, without the `bs-` prefix.
//
// When an upstream fix lands, remove its tokens here: the audit fails on an
// entry that no longer matches anything (see "Upstream issue tracking" in
// CLAUDE.md).
export default [
  // Read without a fallback, never defined

  { kind: 'undefined', issue: 8, tokens: ['--font-weight-base'] },
  { kind: 'undefined', issue: 9, tokens: ['--nav-link-font-weight', '--range-track-box-shadow'] },
  { kind: 'undefined', issue: 182, configs: ['brand'], tokens: ['--info-bg', '--secondary-fg'] },
  {
    kind: 'undefined',
    reason: 'opt-in hook: while it’s unset, the property falls back to its inherited or initial value',
    tokens: ['--body-text-align', '--heading-font-family', '--heading-font-style', '--legend-font-weight', '--form-text-font-style', '--form-text-font-weight']
  },

  // Read with a fallback, never defined

  { kind: 'hook', reason: 'set inline by Bootstrap’s JavaScript', tokens: ['--carousel-interval', '--range-fill'] },
  {
    kind: 'hook',
    reason: 'customization hook with a default',
    tokens: [
      '--accordion-body-padding-x', '--accordion-body-padding-y', '--accordion-btn-padding-x', '--accordion-btn-padding-y', '--accordion-radius',
      '--avatar-font-weight',
      '--breadcrumb-padding-x', '--breadcrumb-padding-y',
      '--chip-font-size', '--chip-font-weight', '--chip-line-height',
      '--drawer-sheet-width',
      '--dt-font-weight', '--heading-font-weight', '--hr-margin-y', '--initialism-font-size', '--link-hover-decoration', '--list-inline-padding', '--small-font-size', '--sub-sup-font-size',
      '--icon-link-transform',
      '--label-color', '--label-font-size', '--label-font-style', '--label-font-weight', '--label-margin-bottom',
      '--menu-border-color', '--menu-border-radius', '--menu-border-width', '--menu-item-font-weight',
      '--nav-link-border-color', '--navbar-bg',
      '--stack-align-self', '--stack-flex',
      '--stepper-align-items',
      '--toast-border-radius', '--toast-color',
      '--vr-border-width'
    ]
  },

  // Defined, never read

  { kind: 'unused', reason: 'color scale, for users and utilities', pattern: /^--[a-z]+-\d{3}$/ },
  { kind: 'unused', reason: 'scale step, for users and utilities', pattern: /^--(spacer|radius|z|font-size|line-height)-(n?\d+|\d*x[sl])$/ },
  { kind: 'unused', reason: 'scale step, for users and utilities', tokens: ['--box-shadow-xs', '--font-weight-light', '--font-weight-lighter'] },
  { kind: 'unused', reason: 'read by Bootstrap’s JavaScript (NavOverflow)', pattern: /^--breakpoint-/ },
  { kind: 'unused', reason: 'generated from the color maps and the theme API, for users', tokens: ['--bg-inherit', '--fg-inherit', '--theme-base'] },
  { kind: 'unused', reason: 'the shadcn config sets --btn-font-weight directly', tokens: ['--btn-input-font-weight'] },
  { kind: 'unused', issue: 4, tokens: ['--check-border-radius'] },
  {
    kind: 'unused',
    configs: ['no-transitions'],
    reason: '$enable-transitions: false removes the transitions, the progress bar stripes and the carousel progress indicator, not their tokens',
    pattern: /transition|^--carousel-(fade|indicator-(opacity|width))-(duration|timing)$|^--carousel-indicator-progress-bg$|^--progress-bar-animation$/
  },
  {
    kind: 'unused',
    configs: ['no-rounded'],
    reason: '$enable-rounded: false removes the border-radius declarations, not their tokens',
    pattern: /-radius$/
  },
  {
    kind: 'unused',
    configs: ['no-shadows'],
    reason: '$enable-shadows: false removes the box-shadow declarations, not their tokens',
    pattern: /-box-shadow$/
  },
  {
    kind: 'unused',
    configs: ['grid-css-only'],
    reason: 'containers set --gutter-y for .row, which $enable-grid-classes: false removes',
    tokens: ['--gutter-y']
  },
  {
    kind: 'unused',
    issue: 125,
    tokens: [
      '--card-subtitle-color',
      '--check-active-bg', '--check-active-border-color', '--check-indeterminate-bg', '--check-indeterminate-border-color',
      '--form-text-margin-top',
      '--menu-spacer',
      '--nav-tabs-border-radius',
      '--navbar-toggler-width', '--navbar-toggler-padding-y', '--navbar-toggler-padding-x', '--navbar-toggler-font-size', '--navbar-toggler-border-color', '--navbar-toggler-border-radius',
      '--switch-checked-indicator-bg',
      '--table-active-bg', '--table-hover-bg', '--table-striped-bg'
    ]
  },

  // Defined on a component, read on an unrelated selector

  { kind: 'foreign', reason: '.page-link sits inside .pagination', pattern: /^--pagination-/ },
  { kind: 'foreign', reason: '.combobox-toggle is also a .form-control', tokens: ['--control-padding-x'] },
  { kind: 'foreign', reason: '.combobox-search sits inside the combobox’s .menu', tokens: ['--menu-bg', '--menu-padding-x'] },
  { kind: 'foreign', reason: 'Range’s value bubble is also a .tooltip', tokens: ['--tooltip-arrow-height'] }
]
