// Findings of scripts/audit-layers.mjs that are known: tracked as an upstream
// bug (`issue`, a tracking issue in this repository) or intended (`reason`).
// Each entry matches one kind and findings whose selector contains `selector`
// (or matches it, for a RegExp).
//
// When an upstream fix lands, remove its entries: the audit fails on an entry
// that no longer matches anything (see "Upstream issue tracking" in CLAUDE.md).
export default [
  // Rules outside any layer

  { kind: 'unlayered', selector: /^\.drawer, /, issue: 148 },
  { kind: 'unlayered', selector: /^\.(fade|collapse)\b/, issue: 149 },
  { kind: 'unlayered', selector: /^:root, :host$/, reason: '`scrollbar-gutter: stable` sits next to the global tokens; override it unlayered, like them' },

  // Source files split across layers

  { kind: 'split', selector: 'layout/_breakpoints.scss', reason: 'breakpoint mixins: they emit into their caller’s layer' },

  // !important. In layers, an earlier layer’s !important beats a later one’s,
  // and beats unlayered !important too.

  { kind: 'important', selector: '[hidden]', reason: 'the hidden attribute must win, over utilities too' },
  { kind: 'important', selector: '::-webkit-calendar-picker-indicator', reason: 'hides Chrome’s datalist arrow' },
  { kind: 'important', selector: /^\.form-control-color::-(moz|webkit)-color-swatch$/, reason: 'resets the browser’s swatch border' },
  { kind: 'important', selector: '.menu-item-icon', reason: 'keeps the icon on the item’s active color' },
  { kind: 'important', selector: /^\.navbar(-expand)? \[class\*=drawer\]/, reason: 'an expanded navbar turns its drawer back into inline content, over the UA <dialog> styles and the drawer’s own' },
  { kind: 'important', selector: /^\.navbar-expand \.navbar-toggler$/, reason: 'hides the toggler once the navbar is expanded' },
  { kind: 'important', selector: /^\.drawer( \.drawer-body)?$/, reason: 'a responsive drawer above its breakpoint becomes inline content, over the UA <dialog> styles' },
  { kind: 'important', selector: /^\.visually-hidden/, reason: 'visually hidden must win whatever the element’s styles' },

  // AGENTS.md (checked only with a BOOTSTRAP_PATH checkout)

  { kind: 'docs', selector: 'AGENTS.md', issue: 150 }
]
