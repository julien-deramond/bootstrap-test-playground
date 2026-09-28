// Findings of scripts/audit-partials.mjs that are known: tracked as an upstream
// bug (`issue`, a tracking issue in this repository) or intended (`reason`).
// Each entry matches one kind, a partial and, for `needs`, the partial it
// needs.
//
// When an upstream fix lands, remove its entries: the audit fails on an entry
// that no longer matches anything (see "Upstream issue tracking" in CLAUDE.md).
export default [
  // Forms reuse the `.tooltip` markup for validation tooltips and the range's
  // value bubble, and the docs' Option B leaves `tooltip` out.

  { kind: 'needs', partial: 'forms', needs: 'tooltip', issue: 216 },
  { kind: 'needs', partial: 'forms/validation', needs: 'tooltip', issue: 216 },
  { kind: 'needs', partial: 'forms/form-range', needs: 'tooltip', issue: 216 },

  // Composition

  { kind: 'needs', partial: 'card', needs: 'nav', reason: '`.card-header-tabs` is a nav, so it only appears with the nav partial' },
  { kind: 'needs', partial: 'badge', needs: 'helpers/theme-colors', reason: 'theme colors come from a `.theme-*` class, which helpers generates' },
  { kind: 'needs', partial: 'buttons', needs: 'helpers/theme-colors', reason: 'theme colors come from a `.theme-*` class, which helpers generates' },
  { kind: 'needs', partial: 'buttons/button', needs: 'helpers/theme-colors', reason: 'theme colors come from a `.theme-*` class, which helpers generates' },
  { kind: 'needs', partial: 'utilities/api', needs: 'helpers/theme-colors', reason: 'theme colors come from a `.theme-*` class, which helpers generates' },

  // Inside a folder: its index loads every file

  { kind: 'needs', partial: 'buttons/button-group', needs: 'buttons/button', reason: 'a button group styles buttons, and `buttons` loads both' },
  { kind: 'needs', partial: 'forms/combobox', needs: 'forms/form-control', reason: 'the combobox toggle is a `.form-control`, and `forms` loads both' },
  { kind: 'needs', partial: 'forms/floating-labels', needs: 'forms/form-control', reason: 'a floating label sits on a `.form-control`, and `forms` loads both' },
  { kind: 'needs', partial: 'forms/floating-labels', needs: 'forms/chip-input', reason: 'chip input defines the same control token as form-control, and `forms` loads both' }
]
