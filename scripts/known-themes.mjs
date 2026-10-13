// Findings of scripts/audit-themes.mjs that are known: tracked as an upstream
// bug (`issue`, a tracking issue in this repository) or intended (`reason`).
// Each entry names a partial that reads no `--theme-*` token, like the audit
// does (`forms/form-control`, not `forms/_form-control.scss`).
//
// When an upstream fix lands, remove its entries: the audit fails on an entry
// that no longer matches anything (see "Upstream issue tracking" in CLAUDE.md).
export default [
  // Should react to `.theme-*`

  // The selected day hard-codes `--primary-bg` and `--primary-contrast`.
  { partial: 'datepicker', issue: 372 },

  // Neutral surfaces and controls

  { partial: 'banner', reason: 'neutral surface, colored with `bg-*` and `fg-*` utilities' },
  { partial: 'breadcrumb', reason: 'neutral navigation links on `--fg-*` tokens' },
  { partial: 'carousel', reason: 'media controls: the indicators read `--fg-3`' },
  { partial: 'dialog', reason: 'neutral surface' },
  { partial: 'drawer', reason: 'neutral surface' },
  { partial: 'nav-overflow', reason: 'layout of a nav that overflows, no color of its own' },
  { partial: 'buttons/close', reason: 'the close button inherits `color`' },
  { partial: 'buttons/button-group', reason: 'layout of buttons, which are themeable on their own' },
  { partial: 'forms/chip-input', reason: 'neutral field, focus uses `--focus-ring-color`' },
  { partial: 'forms/combobox', reason: 'neutral field, focus uses `--focus-ring-color`' },
  { partial: 'forms/floating-labels', reason: 'neutral field, focus uses `--focus-ring-color`' },
  { partial: 'forms/form-adorn', reason: 'neutral field, focus uses `--focus-ring-color`' },
  { partial: 'forms/form-control', reason: 'neutral field, focus uses `--focus-ring-color`' },
  { partial: 'forms/form-field', reason: 'neutral field, focus uses `--focus-ring-color`' },
  { partial: 'forms/form-text', reason: 'neutral field text' },
  { partial: 'forms/input-group', reason: 'neutral field, focus uses `--focus-ring-color`' },
  { partial: 'forms/labels', reason: 'neutral field text' },
  { partial: 'forms/otp-input', reason: 'neutral field, focus uses `--focus-ring-color`' },

  // Fixed by design

  { partial: 'forms/strength', reason: 'fixed semantic colors by design (`--danger-*`, `--success-*`…)' },
  { partial: 'forms/validation', reason: 'fixed semantic colors by design (`--danger-*`, `--success-*`…)' },
  { partial: 'placeholder', reason: '`currentcolor`; the docs color it with `fg-*` and `bg-*` utilities' },
  { partial: 'spinner', reason: '`currentcolor`; the docs color it with `fg-*` and `bg-*` utilities' },
  { partial: 'popover', reason: 'themed with its own CSS variables, and appended to `body`, so it wouldn’t inherit a theme from its trigger' },
  { partial: 'tooltip', reason: 'themed with its own CSS variables, and appended to `body`, so it wouldn’t inherit a theme from its trigger' },

  // Not colored components

  { partial: 'transitions', reason: 'animation helpers' },
  { partial: 'content/blockquote', reason: 'not a colored component' },
  { partial: 'content/images', reason: 'not a colored component' },
  { partial: 'content/lists', reason: 'not a colored component' },
  { partial: 'content/prose', reason: 'not a colored component' },
  { partial: 'helpers/hover-lift', reason: 'not a colored component' },
  { partial: 'helpers/icon-link', reason: 'not a colored component' },
  { partial: 'helpers/position', reason: 'not a colored component' },
  { partial: 'helpers/stacks', reason: 'not a colored component' },
  { partial: 'helpers/stretched-link', reason: 'not a colored component' },
  { partial: 'helpers/text-truncation', reason: 'not a colored component' },
  { partial: 'helpers/visually-hidden', reason: 'not a colored component' },
  { partial: 'helpers/vr', reason: 'not a colored component' }
]
