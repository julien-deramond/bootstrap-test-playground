// Findings of scripts/audit-rtl.mjs that are known: tracked as an upstream bug
// (`issue`, a tracking issue in this repository) or intended (`reason`). Each
// entry matches findings whose selector contains `selector` (or matches it,
// for a RegExp), and optionally only some properties. Properties are named
// like in the Sass source, without the `bs-` prefix.
//
// When an upstream fix lands, remove its entries: the audit fails on an entry
// that no longer matches anything (see "Upstream issue tracking" in CLAUDE.md).
export default [
  // RTL bugs

  { selector: '.form-range-input::-', properties: ['background-image'], issue: 133 },
  { selector: '.form-range-bubble', properties: ['left', 'transform'], issue: 133 },
  { selector: /^\.form-control/, properties: ['--control-select-bg-position'], issue: 134 },
  { selector: '.btn-group:where(.btn-group-divider)', properties: ['left'], issue: 135 },
  { selector: '.avatar-stack .avatar', properties: ['margin-left'], issue: 136 },
  { selector: '.avatar-status', properties: ['right'], issue: 136 },
  { selector: /^\.translate-middle(-x)?$/, properties: ['transform'], issue: 137 },
  { selector: '.form-floating', properties: ['--form-floating-label-transform', 'transform-origin'], issue: 138 },
  { selector: '[data-vc-arrow=', properties: ['transform'], issue: 139 },
  { selector: '[data-vc-date-selected=', issue: 139 },
  { selector: /^\.menu(\[|$)/, properties: ['transform-origin'], issue: 140 },
  { selector: '.popover-header::before', properties: ['left'], issue: 141 },
  { selector: '.icon-link', properties: ['--icon-link-icon-transform'], issue: 142 },

  // Intended

  {
    selector: /\.bs-(popover|tooltip)-(start|end)/,
    reason: 'arrow of a tip placed on the left or right: the JavaScript sets `data-bs-placement` to Floating UI’s final placement, which is physical'
  },
  { selector: '.submenu > .menu-item::after', properties: ['border-width'], reason: 'chevron drawn with two borders, then rotated; a `[dir=rtl]` rule rotates it the other way' },
  { selector: '.stepper-item:last-child::after', properties: ['right'], reason: 'the last step has no connector: its `::after` is `display: none`' },
  { selector: /placeholder-wave/, reason: 'decorative shimmer: its direction carries no meaning' },
  { selector: '.progress-bar-striped', properties: ['background-image'], reason: 'decorative 45° stripes' },
  { selector: '@keyframes animation-shake', properties: ['transform'], reason: 'the shake is symmetric' }
]
